import json
import logging
import time
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import ActionAcknowledgement, DiaryEntry, Farmer, SessionLocal

logger = logging.getLogger(__name__)


class FarmerService:
    """Service handling farmer profile and diary database operations."""

    DEFAULT_TEMPLATES = {
        "demo_farmer_01": {
            "name": "Ramesh Kumar",
            "phone": "+91 98765 43210",
            "state": "Maharashtra",
            "district": "Nagpur",
            "taluka": "Hingna",
            "village": "Kanhan",
            "land_size_acres": 2.5,
            "farmer_category": "small",
            "crops": ["cotton", "soybean", "wheat"],
            "soil_type": "Black Cotton Soil (Regur)",
            "owns_land": True,
            "has_irrigation": True,
            "irrigation_type": "Borewell + Drip Subsidized",
            "is_tax_payer": False,
            "age": 42,
            "pm_kisan_registered": True
        },
        "demo_farmer_02": {
            "name": "Suresh Patel",
            "phone": "+91 98123 45678",
            "state": "Gujarat",
            "district": "Rajkot",
            "taluka": "Jasdan",
            "village": "Atkot",
            "land_size_acres": 6.0,
            "farmer_category": "medium",
            "crops": ["groundnut", "cotton", "wheat"],
            "soil_type": "Medium Black Alluvial",
            "owns_land": True,
            "has_irrigation": True,
            "irrigation_type": "Open Well + Sprinkler System",
            "is_tax_payer": False,
            "age": 48,
            "pm_kisan_registered": True
        },
        "demo_farmer_03": {
            "name": "Anitha Selvam",
            "phone": "+91 97890 12345",
            "state": "Tamil Nadu",
            "district": "Thanjavur",
            "taluka": "Orathanadu",
            "village": "Pukkarai",
            "land_size_acres": 1.5,
            "farmer_category": "marginal",
            "crops": ["paddy", "sugarcane"],
            "soil_type": "Clay Loam",
            "owns_land": True,
            "has_irrigation": True,
            "irrigation_type": "Cauvery Canal + Borewell",
            "is_tax_payer": False,
            "age": 39,
            "pm_kisan_registered": True
        },
        "demo_farmer_04": {
            "name": "Vikram Singh",
            "phone": "+91 98140 99887",
            "state": "Punjab",
            "district": "Bhatinda",
            "taluka": "Talwandi Sabo",
            "village": "Rama",
            "land_size_acres": 12.0,
            "farmer_category": "large",
            "crops": ["wheat", "mustard", "cotton"],
            "soil_type": "Loamy Soil",
            "owns_land": True,
            "has_irrigation": True,
            "irrigation_type": "Canal + Deep Tubewell",
            "is_tax_payer": False,
            "age": 52,
            "pm_kisan_registered": True
        }
    }

    def _get_db(self) -> Session:
        return SessionLocal()

    def _farmer_to_dict(self, farmer: Farmer) -> Dict[str, Any]:
        try:
            crops_list = json.loads(farmer.crops)
        except Exception:
            crops_list = []

        return {
            "id": farmer.id,
            "name": farmer.name,
            "phone": farmer.phone,
            "state": farmer.state,
            "district": farmer.district,
            "taluka": farmer.taluka,
            "village": farmer.village,
            "land_size_acres": farmer.land_size_acres,
            "farmer_category": farmer.farmer_category,
            "crops": crops_list,
            "soil_type": farmer.soil_type,
            "owns_land": farmer.owns_land,
            "has_irrigation": farmer.has_irrigation,
            "irrigation_type": farmer.irrigation_type,
            "is_tax_payer": farmer.is_tax_payer,
            "age": farmer.age,
            "pm_kisan_registered": farmer.pm_kisan_registered
        }

    def _diary_to_dict(self, entry: DiaryEntry) -> Dict[str, Any]:
        return {
            "id": entry.id,
            "date": entry.date,
            "activity_type": entry.activity_type,
            "crop": entry.crop,
            "notes": entry.notes,
            "quantity_cost": entry.quantity_cost,
            "status": entry.status,
            "triggered_alert": entry.triggered_alert
        }

    def get_farmer_profile(self, farmer_id: str) -> Dict[str, Any]:
        db = self._get_db()
        try:
            farmer = db.query(Farmer).filter(Farmer.id == farmer_id).first()
            if not farmer:
                # Check if it's one of our standard demo farmers, auto-seed if needed
                if farmer_id in self.DEFAULT_TEMPLATES:
                    return self.get_or_create_farmer(farmer_id)
                logger.error(f"Farmer profile not found: {farmer_id}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Farmer profile with ID '{farmer_id}' not found."
                )
            logger.info(f"Farmer profile loaded: {farmer_id}")
            return self._farmer_to_dict(farmer)
        finally:
            db.close()

    def get_diary_entries(self, farmer_id: str) -> List[Dict[str, Any]]:
        db = self._get_db()
        try:
            entries = db.query(DiaryEntry).filter(
                DiaryEntry.farmer_id == farmer_id
            ).order_by(
                DiaryEntry.date.desc(),
                DiaryEntry.created_at.desc()
            ).all()
            return [self._diary_to_dict(e) for e in entries]
        finally:
            db.close()

    def add_diary_entry(self, farmer_id: str, entry_data: Dict[str, Any]) -> Dict[str, Any]:
        db = self._get_db()
        try:
            farmer = db.query(Farmer).filter(Farmer.id == farmer_id).first()
            if not farmer:
                if farmer_id in self.DEFAULT_TEMPLATES:
                    self.get_or_create_farmer(farmer_id)
                    farmer = db.query(Farmer).filter(Farmer.id == farmer_id).first()
                else:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Farmer with ID '{farmer_id}' not found."
                    )

            entry_id = entry_data.get("id") or f"diary_{int(time.time() * 1000)}"
            new_entry = DiaryEntry(
                id=entry_id,
                farmer_id=farmer_id,
                date=entry_data["date"],
                activity_type=entry_data["activity_type"],
                crop=entry_data["crop"],
                notes=entry_data["notes"],
                quantity_cost=entry_data.get("quantity_cost", "0"),
                status=entry_data.get("status", "planned"),
                triggered_alert=entry_data.get("triggered_alert", False)
            )
            db.add(new_entry)
            db.commit()
            db.refresh(new_entry)
            logger.info(f"Added diary entry {entry_id} for farmer {farmer_id}")
            return self._diary_to_dict(new_entry)
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error adding diary entry for farmer {farmer_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save diary entry: {str(e)}"
            )
        finally:
            db.close()

    def get_or_create_farmer(self, farmer_id: str) -> Dict[str, Any]:
        db = self._get_db()
        try:
            farmer = db.query(Farmer).filter(Farmer.id == farmer_id).first()
            if not farmer:
                template = self.DEFAULT_TEMPLATES.get(farmer_id, self.DEFAULT_TEMPLATES["demo_farmer_01"])
                farmer = Farmer(
                    id=farmer_id,
                    name=template["name"],
                    phone=template["phone"],
                    state=template["state"],
                    district=template["district"],
                    taluka=template["taluka"],
                    village=template["village"],
                    land_size_acres=template["land_size_acres"],
                    farmer_category=template["farmer_category"],
                    crops=json.dumps(template["crops"]),
                    soil_type=template["soil_type"],
                    owns_land=template["owns_land"],
                    has_irrigation=template["has_irrigation"],
                    irrigation_type=template["irrigation_type"],
                    is_tax_payer=template["is_tax_payer"],
                    age=template["age"],
                    pm_kisan_registered=template["pm_kisan_registered"]
                )
                db.add(farmer)
                db.commit()
                db.refresh(farmer)
                logger.info(f"Created profile for farmer ID: {farmer_id}")
            return self._farmer_to_dict(farmer)
        finally:
            db.close()

    def clean_test_entries(self) -> int:
        """Removes test entries created by Playwright starting with PLAYWRIGHT_AUDIT_TEST_ and resets test acknowledgements."""
        db = self._get_db()
        try:
            test_entries = db.query(DiaryEntry).filter(
                DiaryEntry.notes.like("PLAYWRIGHT_AUDIT_TEST_%")
            ).all()
            count = len(test_entries)
            for entry in test_entries:
                db.delete(entry)
            db.query(ActionAcknowledgement).delete()
            db.commit()
            return count
        except Exception as e:
            db.rollback()
            logger.error(f"Error cleaning test entries: {e}")
            return 0
        finally:
            db.close()


farmer_service = FarmerService()
