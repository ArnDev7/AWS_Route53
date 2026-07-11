from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
import datetime

# --- Token & Auth Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# --- DNS Record Schemas ---
class DNSRecordBase(BaseModel):
    name: str = Field(..., description="Name of the record, e.g. www.example.com.")
    type: str = Field(..., description="A, AAAA, CNAME, TXT, MX, NS, PTR, SRV, CAA")
    value: str = Field(..., description="Newline separated IPs, strings, or hostnames")
    ttl: int = Field(300, description="Time to Live in seconds")
    routing_policy: str = Field("Simple", description="Simple, Weighted, Geolocation, Failover, Latency")
    weight: Optional[int] = Field(None, ge=0, le=255)
    region: Optional[str] = None
    failover_status: Optional[str] = None  # Primary or Secondary
    health_check_id: Optional[str] = None

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        allowed = ["A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA", "SOA"]
        upper_v = v.upper()
        if upper_v not in allowed:
            raise ValueError(f"Record type must be one of {allowed}")
        return upper_v

    @field_validator("routing_policy")
    @classmethod
    def validate_policy(cls, v: str) -> str:
        allowed = ["Simple", "Weighted", "Geolocation", "Failover", "Latency"]
        if v not in allowed:
            raise ValueError(f"Routing policy must be one of {allowed}")
        return v

class DNSRecordCreate(DNSRecordBase):
    pass

class DNSRecordUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    value: Optional[str] = None
    ttl: Optional[int] = None
    routing_policy: Optional[str] = None
    weight: Optional[int] = None
    region: Optional[str] = None
    failover_status: Optional[str] = None
    health_check_id: Optional[str] = None

class DNSRecord(DNSRecordBase):
    id: str
    hosted_zone_id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True


# --- Hosted Zone Schemas ---
class HostedZoneBase(BaseModel):
    name: str = Field(..., description="Domain name, e.g. example.com.")
    type: str = Field("Public", description="Public or Private")
    description: Optional[str] = None
    comment: Optional[str] = None
    vpc_id: Optional[str] = None
    vpc_region: Optional[str] = None

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v not in ["Public", "Private"]:
            raise ValueError("Hosted Zone type must be 'Public' or 'Private'")
        return v

class HostedZoneCreate(HostedZoneBase):
    pass

class HostedZoneUpdate(BaseModel):
    description: Optional[str] = None
    comment: Optional[str] = None
    vpc_id: Optional[str] = None
    vpc_region: Optional[str] = None

class HostedZone(HostedZoneBase):
    id: str
    record_count: int
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True
        
class HostedZoneDetail(HostedZone):
    records: List[DNSRecord] = []


# --- Health Check Schemas ---
class HealthCheckBase(BaseModel):
    name: str = Field(..., description="Name representing the health checks")
    type: str = Field("ENDPOINT", description="ENDPOINT, ALARM, or CALCULATED")
    ip_address: Optional[str] = None
    domain_name: Optional[str] = None
    protocol: str = Field("HTTP", description="HTTP, HTTPS, or TCP")
    port: int = Field(80, description="Port to check")
    path: Optional[str] = Field("/", description="Check status endpoint route path")

class HealthCheckCreate(HealthCheckBase):
    pass

class HealthCheckUpdate(BaseModel):
    status: Optional[str] = None

class HealthCheck(HealthCheckBase):
    id: str
    status: str
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True
