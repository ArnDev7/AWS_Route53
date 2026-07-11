from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List, Optional
import os

from .database import engine, Base, get_db, SessionLocal
from . import models, schemas, crud, auth, zone_parser

# Automatically construct SQLite tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AWS Route53 Clone API", version="1.0.0")


import urllib.request
import socket

class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # Treat redirect responses (3xx) directly as healthy, rather than following them.
        raise urllib.request.HTTPError(req.full_url, code, msg, headers, fp)


def run_health_check_probes():
    """Background worker daemon thread that queries SQLite and probes targets every 30s"""
    import urllib.request
    import socket
    import time

    # Let the API server startup finish completely
    time.sleep(3)

    while True:
        db = SessionLocal()
        try:
            hcs = db.query(models.HealthCheck).all()
            for hc in hcs:
                old_status = hc.status
                new_status = "Healthy"
                target = hc.ip_address or hc.domain_name

                if not target:
                    continue

                try:
                    if hc.protocol.upper() == "TCP":
                        # Perform Socket TCP probe check
                        with socket.create_connection((target, hc.port), timeout=5):
                            pass
                    else:
                        # Perform HTTP or HTTPS probe check
                        slash_path = "/" + hc.path.lstrip("/") if hc.path else "/"
                        url = f"{hc.protocol.lower()}://{target.rstrip('/')}:{hc.port}{slash_path}"
                        req = urllib.request.Request(
                            url,
                            headers={'User-Agent': 'AWS-Route53-Clone-Host-Probe/1.0'}
                        )

                        opener = urllib.request.build_opener(NoRedirectHandler())
                        try:
                            resp = opener.open(req, timeout=5)
                            code = resp.getcode()
                        except urllib.request.HTTPError as he:
                            code = he.code

                        # 200 to 399 are valid healthy endpoints
                        if 200 <= code < 400:
                            new_status = "Healthy"
                        else:
                            new_status = "Unhealthy"

                except Exception:
                    new_status = "Unhealthy"

                if old_status != new_status:
                    hc.status = new_status
                    db.commit()
                    print(f"[Health Daemon] Check {hc.id} ({hc.name}) changed from {old_status} to {new_status}")

        except Exception as err:
            print(f"[Health Daemon] Error querying health checks: {err}")
        finally:
            db.close()

        time.sleep(30)

# Cross-Origin Policies for connecting our Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows Next.js development client to connect
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def seed_database():
    db = next(get_db())
    try:
        # Check if database has users. If not, seed a default administrative user.
        admin_user = db.query(models.User).filter(models.User.username == "admin").first()
        if not admin_user:
            default_pwhash = auth.get_password_hash("admin")
            user = models.User(username="admin", hashed_password=default_pwhash)
            db.add(user)
            db.commit()

        # Seed sample hosted zones if empty
        zone_count = db.query(models.HostedZone).count()
        if zone_count == 0:
            # Create a public hosted zone
            zone_pub = schemas.HostedZoneCreate(
                name="example.com",
                type="Public",
                description="Core public portal for landing applications.",
                comment="Managed by Admin"
            )
            created_pub = crud.create_hosted_zone(db, zone_pub)

            # Add sample records to example.com
            crud.create_dns_record(db, created_pub.id, schemas.DNSRecordCreate(
                name="www",
                type="A",
                value="198.51.100.12\n198.51.100.13",
                ttl=300,
                routing_policy="Simple"
            ))

            crud.create_dns_record(db, created_pub.id, schemas.DNSRecordCreate(
                name="api",
                type="CNAME",
                value="lb-aws-prod-12345.elb.us-east-1.amazonaws.com.",
                ttl=60,
                routing_policy="Simple"
            ))

            crud.create_dns_record(db, created_pub.id, schemas.DNSRecordCreate(
                name="mail",
                type="MX",
                value="10 mail.example.com.",
                ttl=3600,
                routing_policy="Simple"
            ))

            # --- Extra seed records to exercise pagination (15 additional) ---
            crud.create_dns_record(db, created_pub.id, schemas.DNSRecordCreate(
                name="blog", type="CNAME", value="blog-host.netlify.app.", ttl=300, routing_policy="Simple"
            ))
            crud.create_dns_record(db, created_pub.id, schemas.DNSRecordCreate(
                name="cdn", type="CNAME", value="d1234.cloudfront.net.", ttl=60, routing_policy="Simple"
            ))
            crud.create_dns_record(db, created_pub.id, schemas.DNSRecordCreate(
                name="staging", type="A", value="203.0.113.50", ttl=300, routing_policy="Simple"
            ))
            crud.create_dns_record(db, created_pub.id, schemas.DNSRecordCreate(
                name="dev", type="A", value="203.0.113.51", ttl=300, routing_policy="Simple"
            ))
            crud.create_dns_record(db, created_pub.id, schemas.DNSRecordCreate(
                name="_dmarc", type="TXT", value="\"v=DMARC1; p=reject; rua=mailto:dmarc@example.com\"", ttl=3600, routing_policy="Simple"
            ))
            crud.create_dns_record(db, created_pub.id, schemas.DNSRecordCreate(
                name="example.com", type="TXT", value="\"v=spf1 include:_spf.google.com ~all\"", ttl=3600, routing_policy="Simple"
            ))
            crud.create_dns_record(db, created_pub.id, schemas.DNSRecordCreate(
                name="example.com", type="CAA", value="0 issue \"letsencrypt.org\"", ttl=3600, routing_policy="Simple"
            ))
            crud.create_dns_record(db, created_pub.id, schemas.DNSRecordCreate(
                name="vpn", type="A", value="198.51.100.99", ttl=120, routing_policy="Simple"
            ))
            crud.create_dns_record(db, created_pub.id, schemas.DNSRecordCreate(
                name="status", type="CNAME", value="statuspage.io.", ttl=300, routing_policy="Simple"
            ))
            crud.create_dns_record(db, created_pub.id, schemas.DNSRecordCreate(
                name="docs", type="CNAME", value="readthedocs.io.", ttl=300, routing_policy="Simple"
            ))
            crud.create_dns_record(db, created_pub.id, schemas.DNSRecordCreate(
                name="api-v2", type="A", value="198.51.100.20\n198.51.100.21", ttl=60, routing_policy="Weighted", weight=80
            ))
            crud.create_dns_record(db, created_pub.id, schemas.DNSRecordCreate(
                name="api-v2", type="A", value="198.51.100.30", ttl=60, routing_policy="Weighted", weight=20
            ))
            crud.create_dns_record(db, created_pub.id, schemas.DNSRecordCreate(
                name="app", type="AAAA", value="2001:db8::1", ttl=300, routing_policy="Simple"
            ))
            crud.create_dns_record(db, created_pub.id, schemas.DNSRecordCreate(
                name="ftp", type="A", value="198.51.100.55", ttl=600, routing_policy="Simple"
            ))
            crud.create_dns_record(db, created_pub.id, schemas.DNSRecordCreate(
                name="_sip._tcp", type="SRV", value="10 60 5060 sip.example.com.", ttl=3600, routing_policy="Simple"
            ))

            # Create a private hosted zone
            zone_priv = schemas.HostedZoneCreate(
                name="corp.internal",
                type="Private",
                description="Internal directory services and file servers.",
                comment="VPC intranet routing only",
                vpc_id="vpc-0fae2b109cc4c89",
                vpc_region="us-west-2"
            )
            created_priv = crud.create_hosted_zone(db, zone_priv)

            crud.create_dns_record(db, created_priv.id, schemas.DNSRecordCreate(
                name="ldap",
                type="SRV",
                value="0 5 389 ldap1.corp.internal.",
                ttl=600,
                routing_policy="Simple"
            ))
            
            crud.create_dns_record(db, created_priv.id, schemas.DNSRecordCreate(
                name="database",
                type="A",
                value="10.0.4.15",
                ttl=300,
                routing_policy="Weighted",
                weight=100
            ))

            # Create additional mock zones for pagination testing
            for i in range(1, 11):
                mock_zone = schemas.HostedZoneCreate(
                    name=f"mockdomain-{i}.com",
                    type="Public",
                    description=f"Mock hosted zone {i} for pagination and filter testing.",
                    comment=f"Mock metadata {i}"
                )
                crud.create_hosted_zone(db, mock_zone)

        # Seed sample health checks if empty
        hc_count = db.query(models.HealthCheck).count()
        if hc_count == 0:
            db.add(models.HealthCheck(
                name="portal-checking",
                type="ENDPOINT",
                domain_name="example.com",
                protocol="HTTPS",
                port=443,
                path="/",
                status="Healthy"
            ))
            db.add(models.HealthCheck(
                name="Local FastAPI Check",
                type="ENDPOINT",
                domain_name="localhost",
                protocol="HTTP",
                port=8000,
                path="/api/auth/me",
                status="Healthy"
            ))
            db.commit()
    finally:
        db.close()

    import threading
    daemon = threading.Thread(target=run_health_check_probes, daemon=True)
    daemon.start()


# --- AUTH SEGMENT ---

@app.post("/api/auth/register", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def register(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.username == user_data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_pwd = auth.get_password_hash(user_data.password)
    db_user = models.User(username=user_data.username, hashed_password=hashed_pwd)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@app.post("/api/auth/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/api/auth/me", response_model=schemas.User)
def check_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


# --- HOSTED ZONES ENDPOINTS ---

@app.get("/api/hosted-zones", response_model=List[schemas.HostedZone])
def list_zones(
    skip: int = 0,
    limit: int = 100,
    search: str = "",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    return crud.get_hosted_zones(db, skip=skip, limit=limit, search_query=search)


@app.post("/api/hosted-zones", response_model=schemas.HostedZone, status_code=status.HTTP_201_CREATED)
def create_zone(
    zone_data: schemas.HostedZoneCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Check if duplicate zone exists
    norm_name = crud.normalize_domain_name(zone_data.name)
    existing = db.query(models.HostedZone).filter(
        models.HostedZone.name == norm_name,
        models.HostedZone.type == zone_data.type
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Hosted zone '{norm_name}' with visibility '{zone_data.type}' already exists.")
    
    return crud.create_hosted_zone(db, zone_data)


@app.get("/api/hosted-zones/{zone_id}", response_model=schemas.HostedZoneDetail)
def get_zone(
    zone_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    zone = crud.get_hosted_zone(db, zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Hosted Zone not found")
    
    # Query records associated with zone
    records = crud.get_dns_records(db, zone_id, limit=500)
    
    # Attach records dynamically
    return schemas.HostedZoneDetail(
        id=zone.id,
        name=zone.name,
        type=zone.type,
        description=zone.description,
        comment=zone.comment,
        vpc_id=zone.vpc_id,
        vpc_region=zone.vpc_region,
        record_count=zone.record_count,
        created_at=zone.created_at,
        updated_at=zone.updated_at,
        records=[schemas.DNSRecord.model_validate(r) for r in records]
    )


@app.put("/api/hosted-zones/{zone_id}", response_model=schemas.HostedZone)
def update_zone(
    zone_id: str,
    zone_update: schemas.HostedZoneUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    updated = crud.update_hosted_zone(db, zone_id, zone_update)
    if not updated:
        raise HTTPException(status_code=404, detail="Hosted Zone not found")
    return updated


@app.delete("/api/hosted-zones/{zone_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_zone(
    zone_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    success = crud.delete_hosted_zone(db, zone_id)
    if not success:
        raise HTTPException(status_code=404, detail="Hosted Zone not found")
    return None


# --- RECORD ENDPOINTS ---

@app.get("/api/hosted-zones/{zone_id}/records", response_model=List[schemas.DNSRecord])
def list_records(
    zone_id: str,
    skip: int = 0,
    limit: int = 100,
    search: str = "",
    type_filter: str = "",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Verify zone exists first
    zone = crud.get_hosted_zone(db, zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Hosted Zone not found")
    
    return crud.get_dns_records(db, zone_id, skip=skip, limit=limit, search_query=search, type_filter=type_filter)


@app.post("/api/hosted-zones/{zone_id}/records", response_model=schemas.DNSRecord, status_code=status.HTTP_201_CREATED)
def create_record(
    zone_id: str,
    record_data: schemas.DNSRecordCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    zone = crud.get_hosted_zone(db, zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Hosted Zone not found")
    
    # Try to resolve full name
    normalized_rec_name = record_data.name.strip()
    if not normalized_rec_name.endswith("."):
        normalized_rec_name += "."
    if not normalized_rec_name.endswith(zone.name):
        normalized_rec_name = f"{normalized_rec_name.rstrip('.')}.{zone.name}"

    # Route53 check: duplicate key and type on Simple routing policy is generally restricted.
    # We will enforce this restriction on Simple routing policy to mock Route53 behavior.
    if record_data.routing_policy == "Simple":
        existing = db.query(models.DNSRecord).filter(
            models.DNSRecord.hosted_zone_id == zone_id,
            models.DNSRecord.name == normalized_rec_name,
            models.DNSRecord.type == record_data.type.upper()
        ).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"RRSet with DNS name '{normalized_rec_name}' and type '{record_data.type}' already exists. Use Weighted or other routing policies to add multiple records, or edit the existing record value."
            )
            
    res = crud.create_dns_record(db, zone_id, record_data)
    if not res:
        raise HTTPException(status_code=404, detail="Could not create record")
    return res


@app.put("/api/records/{record_id}", response_model=schemas.DNSRecord)
def update_record(
    record_id: str,
    record_update: schemas.DNSRecordUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    res = crud.update_dns_record(db, record_id, record_update)
    if not res:
        raise HTTPException(status_code=404, detail="DNS Record not found")
    return res


@app.delete("/api/records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_record(
    record_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    success = crud.delete_dns_record(db, record_id)
    if not success:
        raise HTTPException(status_code=404, detail="DNS Record not found")
    return None


@app.post("/api/records/bulk-delete", status_code=status.HTTP_204_NO_CONTENT)
def bulk_delete_records(
    record_ids: List[str],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    for r_id in record_ids:
        crud.delete_dns_record(db, r_id)
    return None


# --- IMPORT / EXPORT ENDPOINTS ---

@app.post("/api/hosted-zones/{zone_id}/import", response_model=List[schemas.DNSRecord])
async def import_zone_file(
    zone_id: str,
    file: Optional[UploadFile] = File(None),
    raw_content: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    zone = crud.get_hosted_zone(db, zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Hosted Zone not found")
    
    zone_content = ""
    if file:
        file_bytes = await file.read()
        zone_content = file_bytes.decode("utf-8")
    elif raw_content:
        zone_content = raw_content
    else:
        raise HTTPException(status_code=400, detail="Please upload a file or supply raw BIND raw_content parameters.")

    try:
        parsed_records = zone_parser.parse_bind_zone(zone_content, default_origin=zone.name)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing BIND zone file: {str(e)}")

    created_records = []
    # Loop and create each record
    for pr in parsed_records:
        # Check if record already exists under Simple routing policy.
        # If it does, we'll merge the values (newline separated) rather than throwing an error,
        # which is extremely friendly for importer setups.
        existing = db.query(models.DNSRecord).filter(
            models.DNSRecord.hosted_zone_id == zone_id,
            models.DNSRecord.name == pr["name"],
            models.DNSRecord.type == pr["type"]
        ).first()

        if existing:
            # Merge value
            existing_vals = set(existing.value.split("\n"))
            new_vals = set(pr["value"].split("\n"))
            merged_vals = list(existing_vals.union(new_vals))
            
            crud.update_dns_record(db, existing.id, schemas.DNSRecordUpdate(
                value="\n".join(merged_vals),
                ttl=pr["ttl"]
            ))
            created_records.append(existing)
        else:
            rec_schema = schemas.DNSRecordCreate(
                name=pr["name"],
                type=pr["type"],
                value=pr["value"],
                ttl=pr["ttl"],
                routing_policy=pr["routing_policy"]
            )
            db_rec = crud.create_dns_record(db, zone_id, rec_schema)
            created_records.append(db_rec)
            
    return created_records


@app.get("/api/hosted-zones/{zone_id}/export")
def export_zone_file(
    zone_id: str,
    format: str = Query("bind", pattern="^(bind|json)$"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    zone = crud.get_hosted_zone(db, zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Hosted Zone not found")
    
    records = crud.get_dns_records(db, zone_id, limit=1000)
    
    if format == "json":
        # Export as standard JSON payload
        return [schemas.DNSRecord.model_validate(r) for r in records]
    
    # Otherwise export in BIND zone file format
    bind_str = zone_parser.export_to_bind_format(zone.name, records)
    return {
        "filename": f"{zone.name}zone",
        "content": bind_str
    }


# --- Health Checks Endpoints ---
@app.get("/api/health-checks", response_model=List[schemas.HealthCheck])
def list_health_checks(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    return crud.get_health_checks(db, skip=skip, limit=limit)


@app.post("/api/health-checks", response_model=schemas.HealthCheck, status_code=201)
def register_health_check(
    hc: schemas.HealthCheckCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    return crud.create_health_check(db, hc=hc)


@app.delete("/api/health-checks/{hc_id}", status_code=204)
def unregister_health_check(
    hc_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    success = crud.delete_health_check(db, hc_id=hc_id)
    if not success:
        raise HTTPException(status_code=404, detail="Health Check not found")
    return None


@app.post("/api/health-checks/{hc_id}/toggle", response_model=schemas.HealthCheck)
def toggle_health_status(
    hc_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    hc = crud.toggle_health_check(db, hc_id=hc_id)
    if not hc:
        raise HTTPException(status_code=404, detail="Health Check not found")
    return hc


@app.get("/api/hosted-zones/{zone_id}/test-dns-answer")
def test_dns_answer(
    zone_id: str,
    name: str = Query(..., description="The query subdomain"),
    type: str = Query("A", description="The query DNS record type"),
    client_region: Optional[str] = Query(None, description="Client region simulated location"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    zone = crud.get_hosted_zone(db, zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Hosted Zone not found")

    resolved_records, details = crud.resolve_dns_query(db, zone_id, name, type, client_region)

    return {
        "query_name": name,
        "query_type": type,
        "client_region": client_region,
        "details": details,
        "resolved_values": [r.value for r in resolved_records],
        "answers": [
            {
                "id": r.id,
                "name": r.name,
                "type": r.type,
                "value": r.value,
                "ttl": r.ttl,
                "routing_policy": r.routing_policy
            } for r in resolved_records
        ]
    }


@app.get("/api/health-checks/test-probe")
def test_probe(
    protocol: str = Query(..., description="The health check protocol (HTTP, HTTPS, TCP)"),
    target: str = Query(..., description="Target domain or IP address"),
    port: int = Query(..., description="Target port"),
    path: Optional[str] = Query(None, description="Request path for HTTP/HTTPS checks"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    protocol_upper = protocol.upper()
    if protocol_upper not in ["HTTP", "HTTPS", "TCP"]:
        raise HTTPException(status_code=400, detail="Invalid protocol. Must be HTTP, HTTPS, or TCP.")

    status_str = "Healthy"
    code_or_msg = ""
    explanation = ""

    try:
        if protocol_upper == "TCP":
            # TCP Port Probe check
            with socket.create_connection((target, port), timeout=5):
                code_or_msg = "Connection successful"
                explanation = f"Successfully established TCP connection to {target}:{port}."
        else:
            # HTTP or HTTPS Check
            slash_path = "/" + path.lstrip("/") if path else "/"
            url = f"{protocol.lower()}://{target.rstrip('/')}:{port}{slash_path}"
            
            # Prepare request
            req = urllib.request.Request(
                url,
                headers={'User-Agent': 'AWS-Route53-Clone-Host-Probe/1.0'}
            )
            
            opener = urllib.request.build_opener(NoRedirectHandler())
            try:
                resp = opener.open(req, timeout=5)
                code = resp.getcode()
            except urllib.request.HTTPError as he:
                code = he.code
            
            code_or_msg = str(code)
            
            if 200 <= code < 300:
                explanation = f"HTTP {code} received. Endpoint is responding normally."
            elif 300 <= code < 400:
                explanation = f"HTTP {code} Redirect received. In compliance with AWS Route 53 guidelines, redirects are treated directly as Healthy without following the target."
            else:
                status_str = "Unhealthy"
                explanation = f"HTTP {code} received. Only 2xx and 3xx codes represent Healthy status."
                
    except Exception as e:
        status_str = "Unhealthy"
        code_or_msg = "Error"
        explanation = f"Connection failed to {target}:{port}. Detail: {str(e)}"

    return {
        "status": status_str,
        "response_code": code_or_msg,
        "message": explanation
    }

