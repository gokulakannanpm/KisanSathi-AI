import json
import sys
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from app.models import ActionAcknowledgement, Base, DiaryEntry, Farmer, SessionLocal, engine


def init_db(fresh: bool = False):
    print("Initializing KisanSathi SQLite Database with 4 Demo Farmers...")

    if fresh:
        print("Dropping existing tables (--fresh specified)...")
        Base.metadata.drop_all(bind=engine)

    Base.metadata.create_all(bind=engine)
    print("Tables created: farmers, diary_entries, action_acknowledgements")

    db = SessionLocal()
    try:
        # Seed 4 Demo Farmers
        demo_farmers = [
            {
                "id": "demo_farmer_01",
                "name": "Ramesh Kumar",
                "phone": "+91 98765 43210",
                "state": "Maharashtra",
                "district": "Nagpur",
                "taluka": "Hingna",
                "village": "Kanhan",
                "land_size_acres": 2.5,
                "farmer_category": "small",
                "crops": json.dumps(["cotton", "soybean", "wheat"]),
                "soil_type": "Black Cotton Soil (Regur)",
                "owns_land": True,
                "has_irrigation": True,
                "irrigation_type": "Borewell + Drip Subsidized",
                "is_tax_payer": False,
                "age": 42,
                "pm_kisan_registered": True
            },
            {
                "id": "demo_farmer_02",
                "name": "Suresh Patel",
                "phone": "+91 98123 45678",
                "state": "Gujarat",
                "district": "Rajkot",
                "taluka": "Jasdan",
                "village": "Atkot",
                "land_size_acres": 6.0,
                "farmer_category": "medium",
                "crops": json.dumps(["groundnut", "cotton", "wheat"]),
                "soil_type": "Medium Black Alluvial",
                "owns_land": True,
                "has_irrigation": True,
                "irrigation_type": "Open Well + Sprinkler System",
                "is_tax_payer": False,
                "age": 48,
                "pm_kisan_registered": True
            },
            {
                "id": "demo_farmer_03",
                "name": "Anitha Selvam",
                "phone": "+91 97890 12345",
                "state": "Tamil Nadu",
                "district": "Thanjavur",
                "taluka": "Orathanadu",
                "village": "Pukkarai",
                "land_size_acres": 1.5,
                "farmer_category": "marginal",
                "crops": json.dumps(["paddy", "sugarcane"]),
                "soil_type": "Clay Loam",
                "owns_land": True,
                "has_irrigation": True,
                "irrigation_type": "Cauvery Canal + Borewell",
                "is_tax_payer": False,
                "age": 39,
                "pm_kisan_registered": True
            },
            {
                "id": "demo_farmer_04",
                "name": "Vikram Singh",
                "phone": "+91 98140 99887",
                "state": "Punjab",
                "district": "Bhatinda",
                "taluka": "Talwandi Sabo",
                "village": "Rama",
                "land_size_acres": 12.0,
                "farmer_category": "large",
                "crops": json.dumps(["wheat", "mustard", "cotton"]),
                "soil_type": "Loamy Soil",
                "owns_land": True,
                "has_irrigation": True,
                "irrigation_type": "Canal + Deep Tubewell",
                "is_tax_payer": False,
                "age": 52,
                "pm_kisan_registered": True
            }
        ]

        for farmer_data in demo_farmers:
            existing = db.query(Farmer).filter(Farmer.id == farmer_data["id"]).first()
            if not existing:
                f = Farmer(**farmer_data)
                db.add(f)
            else:
                for k, v in farmer_data.items():
                    setattr(existing, k, v)
        db.commit()

        # Seed Sample Diary Entries for all 4 Farmers
        sample_entries = [
            # Farmer 1 (Ramesh Kumar)
            {
                "id": "diary_001",
                "farmer_id": "demo_farmer_01",
                "date": "2026-08-27",
                "activity_type": "Pesticide Spraying",
                "crop": "cotton",
                "notes": "Planned pesticide spraying (Chlorpyrifos) for cotton pink bollworm prevention tomorrow afternoon.",
                "quantity_cost": "₹1,800 / 2.5 Acres",
                "status": "planned",
                "triggered_alert": True
            },
            {
                "id": "diary_002",
                "farmer_id": "demo_farmer_01",
                "date": "2026-08-22",
                "activity_type": "Fertilizer Application",
                "crop": "soybean",
                "notes": "Applied 50kg Single Super Phosphate (SSP) along with DAP across plot B.",
                "quantity_cost": "₹1,350",
                "status": "completed",
                "triggered_alert": False
            },
            {
                "id": "diary_003",
                "farmer_id": "demo_farmer_01",
                "date": "2026-08-14",
                "activity_type": "Drip Irrigation",
                "crop": "cotton",
                "notes": "Ran drip irrigation cycle for 4 hours following 5-day dry spell.",
                "quantity_cost": "Electricity unit 18kWh",
                "status": "completed",
                "triggered_alert": False
            },
            {
                "id": "diary_004",
                "farmer_id": "demo_farmer_01",
                "date": "2026-07-28",
                "activity_type": "Sowing",
                "crop": "cotton",
                "notes": "Sowed Bt-Cotton hybrid seed packet (BG-II) with 3x1.5 ft spacing.",
                "quantity_cost": "4 Packets @ ₹850",
                "status": "completed",
                "triggered_alert": False
            },

            # Farmer 2 (Suresh Patel)
            {
                "id": "diary_0201",
                "farmer_id": "demo_farmer_02",
                "date": "2026-08-27",
                "activity_type": "Drip Irrigation",
                "crop": "groundnut",
                "notes": "Scheduled sprinkler irrigation cycle for 6.0 acres groundnut crop.",
                "quantity_cost": "₹450 / 6 Acres",
                "status": "planned",
                "triggered_alert": True
            },
            {
                "id": "diary_0202",
                "farmer_id": "demo_farmer_02",
                "date": "2026-08-18",
                "activity_type": "Fertilizer Application",
                "crop": "groundnut",
                "notes": "Applied Gypsum @ 200kg/acre at pod initiation stage.",
                "quantity_cost": "₹2,400",
                "status": "completed",
                "triggered_alert": False
            },

            # Farmer 3 (Anitha Selvam)
            {
                "id": "diary_0301",
                "farmer_id": "demo_farmer_03",
                "date": "2026-08-27",
                "activity_type": "Harvesting",
                "crop": "paddy",
                "notes": "Planned Kuruvai Paddy harvesting using combine harvester before rain spell.",
                "quantity_cost": "₹3,200 / 1.5 Acres",
                "status": "planned",
                "triggered_alert": True
            },
            {
                "id": "diary_0302",
                "farmer_id": "demo_farmer_03",
                "date": "2026-08-10",
                "activity_type": "Weeding",
                "crop": "paddy",
                "notes": "Conducted manual weeding and water drainage management in paddy plot.",
                "quantity_cost": "₹1,200",
                "status": "completed",
                "triggered_alert": False
            },

            # Farmer 4 (Vikram Singh)
            {
                "id": "diary_0401",
                "farmer_id": "demo_farmer_04",
                "date": "2026-08-27",
                "activity_type": "Market Sale",
                "crop": "wheat",
                "notes": "Planned transport of remaining 80 quintals rabi wheat stock to Bhatinda APMC Mandi.",
                "quantity_cost": "Transport ₹4,000",
                "status": "planned",
                "triggered_alert": True
            },
            {
                "id": "diary_0402",
                "farmer_id": "demo_farmer_04",
                "date": "2026-08-15",
                "activity_type": "Ploughing",
                "crop": "mustard",
                "notes": "Deep disc ploughing using tractor for upcoming rabi mustard bed preparation.",
                "quantity_cost": "Diesel ₹2,800",
                "status": "completed",
                "triggered_alert": False
            }
        ]

        for data in sample_entries:
            existing_entry = db.query(DiaryEntry).filter(DiaryEntry.id == data["id"]).first()
            if not existing_entry:
                entry = DiaryEntry(**data)
                db.add(entry)
            else:
                for k, v in data.items():
                    setattr(existing_entry, k, v)

        db.commit()
        print("Seeded 4 Demo Farmers with sample field diary entries.")
        print("Database initialized: kisansathi.db")

    except Exception as e:
        db.rollback()
        print(f"Error initializing database: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    is_fresh = "--fresh" in sys.argv
    init_db(fresh=is_fresh)
