import datetime
import uuid
import random
import string
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

def generate_zone_id():
    """Generates an AWS Route53 style hosted zone ID, e.g. Z0123456789ABC"""
    chars = string.ascii_uppercase + string.digits
    return "Z" + "".join(random.choices(chars, k=13))

def generate_record_id():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class HostedZone(Base):
    __tablename__ = "hosted_zones"

    id = Column(String, primary_key=True, default=generate_zone_id)
    name = Column(String, index=True, nullable=False)
    type = Column(String, nullable=False, default="Public")  # Public or Private
    description = Column(String, nullable=True)
    comment = Column(String, nullable=True)
    vpc_id = Column(String, nullable=True)  # Mock VPC association
    vpc_region = Column(String, nullable=True)  # Mock VPC Region
    record_count = Column(Integer, default=2)  # Route53 default zones start with NS and SOA (2 records)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    records = relationship("DNSRecord", back_populates="hosted_zone", cascade="all, delete-orphan")

class DNSRecord(Base):
    __tablename__ = "dns_records"

    id = Column(String, primary_key=True, default=generate_record_id)
    hosted_zone_id = Column(String, ForeignKey("hosted_zones.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, index=True, nullable=False)  # e.g., www.example.com.
    type = Column(String, nullable=False)  # A, AAAA, CNAME, TXT, MX, NS, PTR, SRV, CAA
    value = Column(String, nullable=False)  # Can contain multiple values separated by newlines
    ttl = Column(Integer, nullable=False, default=300)
    routing_policy = Column(String, nullable=False, default="Simple")  # Simple, Weighted, Geolocation, Failover, Latency
    
    # Policy routing parameters
    weight = Column(Integer, nullable=True)
    region = Column(String, nullable=True)
    failover_status = Column(String, nullable=True)  # Primary or Secondary
    health_check_id = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    hosted_zone = relationship("HostedZone", back_populates="records")


def generate_health_check_id():
    """Generates an AWS Route53 style health check ID, e.g. hc-10abc29d38"""
    chars = string.ascii_lowercase + string.digits
    return "hc-" + "".join(random.choices(chars, k=10))


class HealthCheck(Base):
    __tablename__ = "health_checks"

    id = Column(String, primary_key=True, default=generate_health_check_id)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False, default="ENDPOINT")  # ENDPOINT, ALARM, CALCULATED
    ip_address = Column(String, nullable=True)
    domain_name = Column(String, nullable=True)
    protocol = Column(String, nullable=False, default="HTTP")  # HTTP, HTTPS, TCP
    port = Column(Integer, nullable=False, default=80)
    path = Column(String, nullable=True, default="/")
    status = Column(String, nullable=False, default="Healthy")  # Healthy, Unhealthy, Unknown

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
