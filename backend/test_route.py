import sys
import os

# Include app directory in searchpath
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), ".")))

from app.database import SessionLocal
from app import crud, schemas, models

def main():
    db = SessionLocal()
    try:
        print("1. Fetching zones list...")
        zones = crud.get_hosted_zones(db)
        print(f"   Found {len(zones)} zones")
        if not zones:
            print("   No hosted zones found to test. Creating one...")
            zone_data = schemas.HostedZoneCreate(
                name="testdomain.com",
                type="Public",
                description="Test description"
            )
            crud.create_hosted_zone(db, zone_data)
            zones = crud.get_hosted_zones(db)
            print(f"   Created and fetched zone: {zones[0].id}")

        test_zone = zones[0]
        print(f"2. Getting detailed zone ID: {test_zone.id}...")
        zone = crud.get_hosted_zone(db, test_zone.id)
        print(f"   Zone Details: {zone.name}, {zone.type}, records count: {zone.record_count}")

        print("3. Querying DNS records...")
        records = crud.get_dns_records(db, test_zone.id, limit=500)
        print(f"   Found {len(records)} records associated")

        print("4. Serializing records with Pydantic...")
        pydantic_recs = []
        for idx, r in enumerate(records):
            try:
                # Try validation
                validated = schemas.DNSRecord.model_validate(r)
                pydantic_recs.append(validated)
                print(f"   Record {idx} ({r.type}) validated successfully")
            except Exception as e:
                print(f"   Record {idx} ({r.type}) failed validation: {type(e).__name__}: {str(e)}")
                import traceback
                traceback.print_exc()

        print("5. Serializing parent HostedZoneDetail...")
        try:
            detail = schemas.HostedZoneDetail(
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
                records=pydantic_recs
            )
            print("   HostedZoneDetail validated successfully!")
        except Exception as e:
            print(f"   HostedZoneDetail validation failed: {type(e).__name__}: {str(e)}")
            import traceback
            traceback.print_exc()

    finally:
        db.close()

if __name__ == "__main__":
    main()
