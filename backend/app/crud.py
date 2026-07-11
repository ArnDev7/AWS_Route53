import random
from sqlalchemy.orm import Session
from . import models, schemas

# Helper to normalize domain and record names (AWS Route53 format)
def normalize_domain_name(name: str) -> str:
    name = name.strip()
    if not name.endswith("."):
        name += "."
    return name

def generate_aws_ns_servers():
    """Generates 4 realistic AWS Route53 nameservers"""
    domains = ["com", "net", "org", "co.uk"]
    servers = []
    for i, ext in enumerate(domains):
        num = random.randint(100, 2047)
        sub = random.randint(10, 99)
        servers.append(f"ns-{num}.awsdns-{sub}.{ext}.")
    return servers

# --- Hosted Zones CRUD ---
def get_hosted_zone(db: Session, zone_id: str):
    zone = db.query(models.HostedZone).filter(models.HostedZone.id == zone_id).first()
    if zone:
        # recalculate record count dynamically
        rc = db.query(models.DNSRecord).filter(models.DNSRecord.hosted_zone_id == zone_id).count()
        zone.record_count = rc
        db.commit()
    return zone

def get_hosted_zones(db: Session, skip: int = 0, limit: int = 100, search_query: str = ""):
    query = db.query(models.HostedZone)
    if search_query:
        # Support search by zone name
        query = query.filter(models.HostedZone.name.contains(search_query))
    
    zones = query.offset(skip).limit(limit).all()
    # Recalculate record counts
    for zone in zones:
        zone.record_count = db.query(models.DNSRecord).filter(models.DNSRecord.hosted_zone_id == zone.id).count()
    db.commit()
    return zones

def create_hosted_zone(db: Session, zone: schemas.HostedZoneCreate):
    normalized_name = normalize_domain_name(zone.name)
    db_zone = models.HostedZone(
        name=normalized_name,
        type=zone.type,
        description=zone.description,
        comment=zone.comment,
        vpc_id=zone.vpc_id if zone.type == "Private" else None,
        vpc_region=zone.vpc_region if zone.type == "Private" else None,
        record_count=2 # Default NS + SOA
    )
    db.add(db_zone)
    db.commit()
    db.refresh(db_zone)

    # Automatically create default NS & SOA records
    ns_servers = generate_aws_ns_servers()
    ns_val = "\n".join(ns_servers)
    ns_record = models.DNSRecord(
        hosted_zone_id=db_zone.id,
        name=db_zone.name,
        type="NS",
        value=ns_val,
        ttl=172800,  # 2 days (AWS default NS TTL)
        routing_policy="Simple"
    )

    soa_val = f"{ns_servers[0]} awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400"
    soa_record = models.DNSRecord(
        hosted_zone_id=db_zone.id,
        name=db_zone.name,
        type="SOA",
        value=soa_val,
        ttl=900,  # 15 minutes (AWS default SOA TTL)
        routing_policy="Simple"
    )

    db.add(ns_record)
    db.add(soa_record)
    db.commit()
    
    db_zone.record_count = 2
    db.commit()
    return db_zone

def update_hosted_zone(db: Session, zone_id: str, zone_update: schemas.HostedZoneUpdate):
    db_zone = get_hosted_zone(db, zone_id)
    if not db_zone:
        return None
    
    update_data = zone_update.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        if key == "vpc_id" and db_zone.type == "Public":
            continue
        if key == "vpc_region" and db_zone.type == "Public":
            continue
        setattr(db_zone, key, value)
        
    db.commit()
    db.refresh(db_zone)
    return db_zone

def delete_hosted_zone(db: Session, zone_id: str):
    db_zone = db.query(models.HostedZone).filter(models.HostedZone.id == zone_id).first()
    if not db_zone:
        return False
    # Cascade delete is handled by relationship configurations in models
    db.delete(db_zone)
    db.commit()
    return True


# --- DNS Records CRUD ---
def get_dns_record(db: Session, record_id: str):
    return db.query(models.DNSRecord).filter(models.DNSRecord.id == record_id).first()

def get_dns_records(db: Session, zone_id: str, skip: int = 0, limit: int = 100, search_query: str = "", type_filter: str = ""):
    query = db.query(models.DNSRecord).filter(models.DNSRecord.hosted_zone_id == zone_id)
    if search_query:
        query = query.filter(models.DNSRecord.name.contains(search_query))
    if type_filter:
        query = query.filter(models.DNSRecord.type == type_filter.upper())
    
    return query.offset(skip).limit(limit).all()

def create_dns_record(db: Session, zone_id: str, record: schemas.DNSRecordCreate):
    zone = get_hosted_zone(db, zone_id)
    if not zone:
        return None
    
    # Normalize record name
    rec_name = record.name.strip()
    if not rec_name.endswith("."):
        rec_name += "."
    
    # Ensure it ends with zone name
    if not rec_name.endswith(zone.name):
        rec_name = f"{rec_name.rstrip('.')}.{zone.name}"
    
    # Capitalize type
    rec_type = record.type.upper()

    db_rec = models.DNSRecord(
        hosted_zone_id=zone_id,
        name=rec_name,
        type=rec_type,
        value=record.value.strip(),
        ttl=record.ttl,
        routing_policy=record.routing_policy,
        weight=record.weight if record.routing_policy == "Weighted" else None,
        region=record.region if record.routing_policy in ["Geolocation", "Latency"] else None,
        failover_status=record.failover_status if record.routing_policy == "Failover" else None,
        health_check_id=record.health_check_id if record.routing_policy == "Failover" else None
    )
    
    db.add(db_rec)
    db.commit()
    db.refresh(db_rec)
    
    # Update zone's record count
    zone.record_count = db.query(models.DNSRecord).filter(models.DNSRecord.hosted_zone_id == zone_id).count()
    db.commit()
    
    return db_rec

def update_dns_record(db: Session, record_id: str, record_update: schemas.DNSRecordUpdate):
    db_rec = get_dns_record(db, record_id)
    if not db_rec:
        return None
    
    update_data = record_update.model_dump(exclude_unset=True)
    
    # Handle name normalization if updating name
    if "name" in update_data and update_data["name"]:
        zone = db.query(models.HostedZone).filter(models.HostedZone.id == db_rec.hosted_zone_id).first()
        rec_name = update_data["name"].strip()
        if not rec_name.endswith("."):
            rec_name += "."
        if zone and not rec_name.endswith(zone.name):
            rec_name = f"{rec_name.rstrip('.')}.{zone.name}"
        update_data["name"] = rec_name

    # Handle capitalize type if updating type
    if "type" in update_data and update_data["type"]:
        update_data["type"] = update_data["type"].upper()

    for key, value in update_data.items():
        setattr(db_rec, key, value)
        
    db.commit()
    db.refresh(db_rec)
    return db_rec

def delete_dns_record(db: Session, record_id: str):
    db_rec = get_dns_record(db, record_id)
    if not db_rec:
        return False
    
    zone_id = db_rec.hosted_zone_id
    db.delete(db_rec)
    db.commit()
    
    # Update zone's record count
    zone = get_hosted_zone(db, zone_id)
    if zone:
        zone.record_count = db.query(models.DNSRecord).filter(models.DNSRecord.hosted_zone_id == zone_id).count()
        db.commit()
        
    return True


# --- Health Check CRUD ---
def get_health_check(db: Session, hc_id: str):
    return db.query(models.HealthCheck).filter(models.HealthCheck.id == hc_id).first()

def get_health_checks(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.HealthCheck).offset(skip).limit(limit).all()

def create_health_check(db: Session, hc: schemas.HealthCheckCreate):
    db_hc = models.HealthCheck(
        name=hc.name,
        type=hc.type,
        ip_address=hc.ip_address,
        domain_name=hc.domain_name,
        protocol=hc.protocol,
        port=hc.port,
        path=hc.path,
        status="Healthy"
    )
    db.add(db_hc)
    db.commit()
    db.refresh(db_hc)
    return db_hc

def delete_health_check(db: Session, hc_id: str):
    db_hc = db.query(models.HealthCheck).filter(models.HealthCheck.id == hc_id).first()
    if not db_hc:
        return False
    db.delete(db_hc)
    db.commit()
    return True

def toggle_health_check(db: Session, hc_id: str):
    db_hc = db.query(models.HealthCheck).filter(models.HealthCheck.id == hc_id).first()
    if not db_hc:
         return None
    db_hc.status = "Unhealthy" if db_hc.status == "Healthy" else "Healthy"
    db.commit()
    db.refresh(db_hc)
    return db_hc


# --- DNS Resolution Engine ---
def resolve_dns_query(db: Session, zone_id: str, subdomain: str, query_type: str, client_region: str = None):
    """
    Implements AWS Route 53 DNS query simulation engine, resolving Simple,
    Weighted, Geolocation, and active Health Check dynamic Failover paths.
    """
    from sqlalchemy import func
    
    subdomain_norm = subdomain.strip().lower()
    if not subdomain_norm.endswith("."):
        subdomain_norm += "."
        
    query_type = query_type.upper()
    
    # Query database for all candidate matching records
    candidates = db.query(models.DNSRecord).filter(
        models.DNSRecord.hosted_zone_id == zone_id,
        func.lower(models.DNSRecord.name) == subdomain_norm,
        models.DNSRecord.type == query_type
    ).all()
    
    if not candidates:
        return [], "No records matched the host name and query type."
        
    # Check routing policy type of the first hit candidate
    policy = candidates[0].routing_policy
    
    if policy == "Simple":
        return candidates, "Resolved using Simple Routing. Returning all endpoints."
        
    elif policy == "Weighted":
        # Filter all weighted candidates
        weighted_records = [c for c in candidates if c.routing_policy == "Weighted"]
        if not weighted_records:
            return candidates, "Fallback to default candidate matching."
            
        total_w = sum((r.weight or 0) for r in weighted_records)
        if total_w <= 0:
            # Even distribution fallback
            chosen = random.choice(weighted_records)
            return [chosen], f"Resolved using Weighted Routing (Weights total 0, randomly selected {chosen.weight})."
            
        # Draw weighted random selection
        pick = random.randint(1, total_w)
        current = 0
        for r in weighted_records:
            current += (r.weight or 0)
            if pick <= current:
                return [r], f"Resolved using Weighted Routing (Selected weight {r.weight} out of total {total_w})."
                
        return [weighted_records[0]], "Resolved using Weighted Routing (Weighted index fallback)."
        
    elif policy == "Failover":
        # Search for Primary and Secondary configurations
        primary = next((c for c in candidates if c.failover_status == "Primary"), None)
        secondary = next((c for c in candidates if c.failover_status == "Secondary"), None)
        
        if primary:
            # Check Primary health status
            is_primary_healthy = True
            hc_msg = "No health check attached"
            
            if primary.health_check_id:
                # Fetch referenced health check status
                hc = db.query(models.HealthCheck).filter(models.HealthCheck.id == primary.health_check_id).first()
                if hc:
                    is_primary_healthy = hc.status in ["Healthy", "Unknown"]
                    hc_msg = f"Health Check '{hc.name}' ({hc.id}) status is '{hc.status}'"
                else:
                    hc_msg = f"Attached Health Check ID '{primary.health_check_id}' not found. Defaulting to Healthy."
            
            if is_primary_healthy:
                return [primary], f"Resolved using Failover Routing (Primary endpoint served; {hc_msg})."
            elif secondary:
                return [secondary], f"Resolved using Failover Routing (Primary endpoint was Unhealthy: {hc_msg}. Secondary active standby served)."
            else:
                return [primary], f"Resolved using Failover Routing (Primary unhealthy: {hc_msg}, but fallback Secondary not configured)."
                
        if secondary:
            return [secondary], "Resolved using Failover Routing (Secondary backup served directly)."
            
        return candidates, "Resolved using Failover Routing (Primary/Secondary configuration misaligned)."
        
    elif policy in ["Geolocation", "Latency"]:
        # Match region if passed
        matched = []
        if client_region:
            matched = [c for c in candidates if c.region and c.region.lower() == client_region.lower()]
            
        if matched:
            return matched, f"Resolved using Geolocation/Latency Routing (Matched client region/location: '{client_region}')."
            
        # Fallback to no-region default candidate
        default_candidate = [c for c in candidates if not c.region or c.region.lower() == "default"]
        if default_candidate:
            return default_candidate, "Resolved using Geolocation/Latency Routing (Fallback to Default region)."
            
        # Return first record if all else fails
        return [candidates[0]], "Resolved using Geolocation/Latency Routing (Default fallback endpoint)."
        
    return candidates, "Resolved using default Simple fallback."
