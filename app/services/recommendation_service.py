import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import ActionAcknowledgement, SessionLocal
from app.services.farmer_service import farmer_service
from app.services.mandi_service import mandi_service
from app.services.weather_service import weather_service

logger = logging.getLogger(__name__)


class RecommendationService:
    """Core intelligence engine synthesizing farmer context, diary, weather, and mandi prices."""

    def _get_db(self) -> Session:
        return SessionLocal()

    def _extract_numeric_cost(self, cost_str: Optional[str]) -> float:
        """Extracts numeric cost from user diary string without fabricating fallback amounts."""
        if not cost_str:
            return 0.0
        match = re.search(r'₹?\s*([\d,]+(?:\.\d+)?)', str(cost_str))
        if match:
            try:
                return float(match.group(1).replace(',', ''))
            except ValueError:
                pass
        return 0.0

    def _format_date_label(self, date_str: Optional[str]) -> str:
        """Converts date string into a readable label, avoiding hardcoded past dates."""
        if not date_str:
            return "Upcoming"
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            today = datetime.now().date()
            diff_days = (target_date - today).days

            if diff_days == 0:
                return "Today"
            elif diff_days == 1:
                return "Tomorrow"
            elif diff_days > 1:
                return target_date.strftime("%A, %d %B")
            else:
                # Past date in farm diary: label as overdue / upcoming window
                return "Scheduled Window"
        except Exception:
            return "Upcoming"

    def acknowledge_action(
        self,
        farmer_id: str,
        action_key: str = "postpone_action",
        status_str: str = "postponed",
        postponed_to_date: Optional[str] = None
    ) -> Dict[str, Any]:
        db = self._get_db()
        try:
            if not postponed_to_date:
                # Default to 2 days from today dynamically
                resched = datetime.now() + timedelta(days=2)
                postponed_to_date = resched.strftime("%A, %d %B %Y")

            ack_id = f"ack_{farmer_id}_{action_key}"
            existing = db.query(ActionAcknowledgement).filter(ActionAcknowledgement.id == ack_id).first()
            if not existing:
                existing = ActionAcknowledgement(
                    id=ack_id,
                    farmer_id=farmer_id,
                    action_key=action_key,
                    status=status_str,
                    postponed_to_date=postponed_to_date
                )
                db.add(existing)
            else:
                existing.status = status_str
                existing.postponed_to_date = postponed_to_date

            db.commit()
            db.refresh(existing)
            logger.info(f"Acknowledged action for farmer {farmer_id}: {status_str}")
            return {
                "id": existing.id,
                "farmer_id": existing.farmer_id,
                "action_key": existing.action_key,
                "status": existing.status,
                "postponed_to_date": existing.postponed_to_date,
                "acknowledged_at": existing.acknowledged_at.isoformat()
            }
        except Exception as e:
            db.rollback()
            logger.error(f"Error acknowledging action for {farmer_id}: {e}")
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            db.close()

    def get_acknowledgement(self, farmer_id: str, action_key: str = "postpone_action") -> Optional[Dict[str, Any]]:
        db = self._get_db()
        try:
            ack_id = f"ack_{farmer_id}_{action_key}"
            existing = db.query(ActionAcknowledgement).filter(ActionAcknowledgement.id == ack_id).first()
            if existing:
                return {
                    "id": existing.id,
                    "status": existing.status,
                    "postponed_to_date": existing.postponed_to_date,
                    "acknowledged_at": existing.acknowledged_at.isoformat()
                }
            return None
        finally:
            db.close()

    def get_recommendation(self, farmer_id: str) -> Dict[str, Any]:
        # 1. Load Farmer Profile (raises 404 if farmer doesn't exist)
        farmer = farmer_service.get_farmer_profile(farmer_id)
        diary_entries = farmer_service.get_diary_entries(farmer_id)
        weather = weather_service.get_current_weather(farmer_id=farmer_id)
        mandi_prices = mandi_service.get_prices(farmer_id=farmer_id)

        # 2. Check for existing action acknowledgement in SQLite
        ack = self.get_acknowledgement(farmer_id)
        is_acknowledged = ack is not None and ack.get("status") in ("postponed", "acknowledged")

        land_acres = farmer.get("land_size_acres", 2.5)
        crops = farmer.get("crops", ["cotton"])
        state = farmer.get("state", "Maharashtra")
        district = farmer.get("district", "Nagpur")
        name = farmer.get("name", "Farmer")
        primary_crop = crops[0].title() if crops and len(crops) > 0 else "Crop"

        # 3. Handle Missing / Unresolved Weather Data (Problem 7)
        if weather.get("location_unresolved") or weather.get("temperature") is None or weather.get("source") == "unavailable":
            rec = {
                "decision_type": "data_required",
                "action": "CONFIGURE FARM LOCATION FOR ACCURATE WEATHER ADVISORY",
                "headline": f"📍 Set Farm Location to Receive Weather-Guided Advisories",
                "reasoning": f"Weather coordinates could not be resolved for {district}, {state}. Precision crop and spraying advisories require local atmospheric telemetry.",
                "ai_explanation": (
                    f"Agronomic Telemetry Requirement:\n"
                    f"1. Context: Recommendation engine requires local atmospheric observations (rainfall probability, temperature, wind speed) for {name}'s {land_acres}-acre holding in {district}.\n"
                    f"2. Current Status: Location coordinates are unresolved.\n"
                    f"3. Next Step: Update farm state and district in farm profile to activate live weather recommendations."
                ),
                "confidence": 30,
                "estimated_impact": "Enables location-specific spray and irrigation advisories",
                "underlying_context": {
                    "farmer_profile": f"{name} ({land_acres} Acres, {', '.join(crops)}, {district}, {state})",
                    "weather_status": "Location Unresolved",
                    "diary_entries_count": len(diary_entries)
                },
                "recommended_new_date": None,
                "source_data": {
                    "weather": weather,
                    "mandi": None
                }
            }
            rec["is_acknowledged"] = is_acknowledged
            if is_acknowledged:
                rec["acknowledged_status"] = ack.get("status", "postponed")
                rec["status_label"] = f"Acknowledged"
            return rec

        # 4. Extract actual weather telemetry
        rain_prob = weather.get("rain_probability")
        if rain_prob is None:
            rain_prob = weather.get("precipitation_probability", 0) or 0
        temp = float(weather.get("temperature", 28.0) or 28.0)
        wind = float(weather.get("wind_speed", 10.0) or 10.0)
        condition = weather.get("condition", "Partly Cloudy")
        forecast_3day = weather.get("forecast_3day", [])

        # Find safe spray window from forecast if available
        safe_forecast_day = next((d for d in forecast_3day if d.get("spraying_safe")), None)
        if safe_forecast_day:
            safe_window_str = f"{safe_forecast_day.get('day')} (Morning 07:00 AM - 09:30 AM)"
        else:
            safe_window_str = "Next clear weather window (monitor daily forecast)"

        # 5. Inspect Planned Diary Activities
        planned_entries = [e for e in diary_entries if str(e.get("status", "")).lower() == "planned"]

        # 6. Case A: NO Planned Diary Activities (Problem 7: Never invent a fake recommendation)
        if not planned_entries:
            if rain_prob >= 40:
                rec = {
                    "decision_type": "weather_advisory",
                    "action": f"MONITOR FIELD DRAINAGE & HOLD UPCOMING SPRAYING FOR {primary_crop.upper()}",
                    "headline": f"🌧️ Weather Advisory: {rain_prob}% Rain Risk Forecasted in {district}",
                    "reasoning": (
                        f"No upcoming activities are scheduled in your farm diary. Local weather forecasts {rain_prob}% rain probability ({condition}) in {district}. "
                        f"If planning chemical or fertilizer applications, check product labels and delay scheduling until clear skies return. Keep drainage ditches clear."
                    ),
                    "ai_explanation": (
                        f"Proactive Weather & Crop Guidance:\n"
                        f"1. Diary Status: No planned field operations currently logged in your farm diary.\n"
                        f"2. Weather Verification: Local forecast indicates {rain_prob}% rain probability and {wind} km/h wind in {district}.\n"
                        f"3. Agronomic Science: Rain shortly after foliar chemical applications causes active compound wash-off. Follow product labels for specific rainfastness windows.\n"
                        f"4. Next Step: Add planned tasks to your Farm Diary to enable automated operational conflict detection."
                    ),
                    "confidence": 75 if weather.get("source") == "live" else 65,
                    "estimated_impact": "Prevents potential input wash-off and standing water stress",
                    "underlying_context": {
                        "farmer_profile": f"{name} ({land_acres} Acres, {', '.join(crops)}, {district}, {state})",
                        "diary_entry_matched": "No planned activities logged",
                        "weather_trigger": f"{rain_prob}% Rain Forecast ({condition})",
                        "mandi_context": f"{primary_crop} monitoring active"
                    },
                    "recommended_new_date": safe_window_str,
                    "source_data": {
                        "weather": {"temp": temp, "rain_prob": rain_prob, "condition": condition},
                        "mandi": None
                    }
                }
            elif temp >= 32.0 and rain_prob < 20:
                rec = {
                    "decision_type": "irrigation_advisory",
                    "action": f"CONSIDER EARLY MORNING IRRIGATION CYCLE FOR {primary_crop.upper()}",
                    "headline": f"💧 High Evapotranspiration Alert for {primary_crop} in {district}",
                    "reasoning": (
                        f"No planned activities found in your farm diary. Warm temperatures ({temp}°C) and low rain risk ({rain_prob}%) in {district} increase soil moisture evaporation. "
                        f"Consider scheduling early morning irrigation (06:00 - 08:30 AM) to maintain root zone moisture."
                    ),
                    "ai_explanation": (
                        f"Detailed Irrigation Guidance:\n"
                        f"1. Diary Status: No planned tasks logged in farm diary.\n"
                        f"2. Thermal Metric: Daytime temperatures reached {temp}°C with low relative humidity.\n"
                        f"3. Agronomic Strategy: Early morning watering minimizes evaporative losses and prevents thermal shock during pod/vegetative growth."
                    ),
                    "confidence": 75 if weather.get("source") == "live" else 65,
                    "estimated_impact": "Conserves soil moisture & prevents heat stress",
                    "underlying_context": {
                        "farmer_profile": f"{name} ({land_acres} Acres, {', '.join(crops)}, {district}, {state})",
                        "diary_entry_matched": "No planned activities logged",
                        "weather_trigger": f"{temp}°C Temperature Alert",
                        "mandi_context": f"{primary_crop} steady"
                    },
                    "recommended_new_date": "Tomorrow Morning (06:00 AM - 08:30 AM)",
                    "source_data": {
                        "weather": {"temp": temp, "rain_prob": rain_prob, "condition": condition},
                        "mandi": None
                    }
                }
            else:
                rec = {
                    "decision_type": "seasonal_guidance",
                    "action": f"FAVORABLE FIELD CONDITIONS FOR {primary_crop.upper()} MANAGEMENT",
                    "headline": f"🌱 Favorable Weather Conditions in {district}",
                    "reasoning": (
                        f"No upcoming activities are scheduled in your farm diary. Current weather ({temp}°C, {condition}, {rain_prob}% rain probability) is favorable for field scouting and maintenance. "
                        f"Log upcoming operations in your Farm Diary for automated conflict checks."
                    ),
                    "ai_explanation": (
                        f"Operational Advisory:\n"
                        f"1. Weather Verification: Conditions in {district} are calm ({wind} km/h wind, {temp}°C).\n"
                        f"2. Crop Status: Routine vegetative/flowering management for {primary_crop}.\n"
                        f"3. Action: Log planned weeding, spraying, or harvesting in the diary to receive real-time weather alerts."
                    ),
                    "confidence": 70 if weather.get("source") == "live" else 60,
                    "estimated_impact": "Guides proactive farm operations planning",
                    "underlying_context": {
                        "farmer_profile": f"{name} ({land_acres} Acres, {', '.join(crops)}, {district}, {state})",
                        "diary_entry_matched": "No planned activities logged",
                        "weather_trigger": f"{condition} ({temp}°C)",
                        "mandi_context": f"{primary_crop} steady"
                    },
                    "recommended_new_date": None,
                    "source_data": {
                        "weather": {"temp": temp, "rain_prob": rain_prob, "condition": condition},
                        "mandi": None
                    }
                }

            rec["is_acknowledged"] = is_acknowledged
            if is_acknowledged:
                rec["acknowledged_status"] = ack.get("status", "postponed")
                rec["status_label"] = f"Acknowledged"
            return rec

        # 7. Case B: Planned Activities Exist in Diary
        # Prioritize planned activity types: spraying > harvesting > irrigation > mandi sale > other
        def activity_priority(entry: Dict[str, Any]) -> int:
            act = str(entry.get("activity_type", "")).lower()
            notes = str(entry.get("notes", "")).lower()
            if "spray" in act or "pesticide" in act or "spray" in notes or "pesticide" in notes:
                return 1
            if "harvest" in act or "harvest" in notes:
                return 2
            if "irrigation" in act or "water" in act or "drip" in act or "sprinkler" in act:
                return 3
            if "sale" in act or "mandi" in act or "market" in act:
                return 4
            return 5

        sorted_planned = sorted(planned_entries, key=activity_priority)
        selected_entry = sorted_planned[0]

        act_type = str(selected_entry.get("activity_type", "")).lower()
        act_crop = str(selected_entry.get("crop", primary_crop)).title()
        act_notes = str(selected_entry.get("notes", ""))
        entry_date_raw = selected_entry.get("date")
        date_label = self._format_date_label(entry_date_raw)
        logged_cost = self._extract_numeric_cost(selected_entry.get("quantity_cost"))

        # Activity Type 1: Chemical / Pesticide / Foliar Spraying
        if "spray" in act_type or "pesticide" in act_type or "spray" in act_notes.lower():
            if rain_prob >= 35 or wind >= 18.0:
                # UNFAVORABLE SPRAYING CONDITIONS -> POSTPONE
                reasons = []
                if rain_prob >= 35:
                    reasons.append(f"{rain_prob}% rain probability ({condition}) risks active compound wash-off")
                if wind >= 18.0:
                    reasons.append(f"elevated wind velocity ({wind} km/h) causes off-target drift")

                cost_impact_str = (
                    f"Saves logged input investment (~₹{int(logged_cost):,}) and prevents chemical runoff"
                    if logged_cost > 0 else
                    "Protects input investment from chemical wash-off and prevents unintended runoff"
                )

                date_phrase = f" on {date_label}" if date_label != "Scheduled Window" else ""
                date_upper = f" ON {date_label.upper()}" if date_label != "Scheduled Window" else ""

                rec = {
                    "decision_type": "urgent_action",
                    "action": f"POSTPONE {act_crop.upper()} SPRAYING{date_upper}",
                    "headline": f"⚠️ Postpone {act_crop} Spraying{date_phrase}",
                    "reasoning": (
                        f"Your farm diary logs planned spraying{date_phrase}. Live weather in {district} forecasts {', '.join(reasons)}. "
                        f"Applying chemicals shortly before rainfall can wash away active ingredients before absorption. Follow product label guidelines and postpone."
                    ),
                    "ai_explanation": (
                        f"Detailed Farm Intelligence Analysis:\n"
                        f"1. Diary Connection: You scheduled {act_type.title()} on {land_acres} acres of {act_crop} ({selected_entry.get('id', 'diary_entry')}).\n"
                        f"2. Local Weather Risk: Radar and forecast models for {district} indicate {rain_prob}% rain probability and {wind} km/h wind velocity.\n"
                        f"3. Agronomic Science & Label Guidance: Chemical rainfastness varies by product formulation, adjuvant type, and active ingredient. Always consult the container label for the required rainfast interval. When label details are unavailable, postponing application before rain avoids chemical wash-off and protects soil and borewell recharge zones.\n"
                        f"4. Actionable Strategy: Reschedule spraying to {safe_window_str}, when forecasts show clear skies and low wind. Ensure foliage is completely dry before application."
                    ),
                    "confidence": 92 if weather.get("source") == "live" else 82,
                    "estimated_impact": cost_impact_str,
                    "underlying_context": {
                        "farmer_profile": f"{name} ({land_acres} Acres, {', '.join(crops)}, {farmer.get('taluka', district)}, {district})",
                        "diary_entry_matched": f"{selected_entry.get('id')} ({selected_entry.get('activity_type')}, {entry_date_raw})",
                        "weather_trigger": f"{rain_prob}% Rain Forecast ({condition}), Wind {wind} km/h",
                        "mandi_context": f"{act_crop} quality protection prioritized"
                    },
                    "recommended_new_date": safe_window_str,
                    "source_data": {
                        "weather": {"temp": temp, "rain_prob": rain_prob, "condition": condition, "source": weather.get("source", "live")},
                        "mandi": None
                    }
                }
            else:
                # FAVORABLE SPRAYING CONDITIONS
                date_phrase = f" on {date_label}" if date_label != "Scheduled Window" else ""
                date_upper = f" ON {date_label.upper()}" if date_label != "Scheduled Window" else ""

                rec = {
                    "decision_type": "favorable_window",
                    "action": f"FAVORABLE SPRAYING WINDOW FOR {act_crop.upper()}{date_upper}",
                    "headline": f"✅ Favorable Weather Window for Planned {act_crop} Spraying{date_phrase}",
                    "reasoning": (
                        f"Your farm diary logs planned spraying{date_phrase}. Current local weather in {district} shows low rain risk ({rain_prob}%) and calm winds ({wind} km/h), "
                        f"providing suitable conditions for application. Follow product label instructions."
                    ),
                    "ai_explanation": (
                        f"Detailed Farm Intelligence Analysis:\n"
                        f"1. Diary Match: {act_type.title()} scheduled on {land_acres} acres of {act_crop}.\n"
                        f"2. Weather Verification: Conditions in {district} indicate {temp}°C, {rain_prob}% rain risk, and calm winds ({wind} km/h).\n"
                        f"3. Application Best Practice: Check container label for target pest dosage and safety equipment. Spray during early morning or late afternoon to minimize evaporative loss."
                    ),
                    "confidence": 90 if weather.get("source") == "live" else 80,
                    "estimated_impact": "Ensures optimal foliar uptake and prevents spray drift",
                    "underlying_context": {
                        "farmer_profile": f"{name} ({land_acres} Acres, {', '.join(crops)}, {district})",
                        "diary_entry_matched": f"{selected_entry.get('id')} ({selected_entry.get('activity_type')}, {entry_date_raw})",
                        "weather_trigger": f"Calm & Clear Window ({rain_prob}% rain, {wind} km/h wind)",
                        "mandi_context": f"{act_crop} protection"
                    },
                    "recommended_new_date": f"On Schedule: {'Today' if date_label == 'Scheduled Window' else date_label} (Morning 06:30 AM - 09:00 AM)",
                    "source_data": {
                        "weather": {"temp": temp, "rain_prob": rain_prob, "condition": condition},
                        "mandi": None
                    }
                }

        # Activity Type 2: Harvesting
        elif "harvest" in act_type or "harvest" in act_notes.lower():
            if rain_prob >= 40:
                rec = {
                    "decision_type": "harvest_advisory",
                    "action": f"ACCELERATE {act_crop.upper()} HARVEST BEFORE RAIN",
                    "headline": f"🌾 Accelerate {act_crop} Harvest Before Forecasted Rain",
                    "reasoning": (
                        f"Your farm diary logs planned harvesting for {act_crop} on {date_label}. Weather forecasts indicate {rain_prob}% rain probability in {district}. "
                        f"Complete harvesting promptly and move grain/produce to covered, waterproof storage to prevent moisture degradation."
                    ),
                    "ai_explanation": (
                        f"Paddy/Crop Harvest Advisory:\n"
                        f"1. Diary Match: Harvesting planned for {land_acres} acres of {act_crop} in {district}.\n"
                        f"2. Weather Risk: Rain risk ({rain_prob}%) can cause lodging, mold proliferation, or grain discoloration.\n"
                        f"3. Action Strategy: Complete harvesting today and secure bags in elevated, dry godowns before showers begin."
                    ),
                    "confidence": 92 if weather.get("source") == "live" else 82,
                    "estimated_impact": "Prevents grain moisture spoilage & preserves APMC market grade",
                    "underlying_context": {
                        "farmer_profile": f"{name} ({land_acres} Acres, {', '.join(crops)}, {district}, {state})",
                        "diary_entry_matched": f"{selected_entry.get('id')} ({selected_entry.get('activity_type')})",
                        "weather_trigger": f"{rain_prob}% Rain Alert ({condition})",
                        "mandi_context": f"{act_crop} procurement"
                    },
                    "recommended_new_date": f"Today before rainfall onset",
                    "source_data": {
                        "weather": {"temp": temp, "rain_prob": rain_prob, "condition": condition},
                        "mandi": None
                    }
                }
            else:
                rec = {
                    "decision_type": "harvest_advisory",
                    "action": f"FAVORABLE DRY WINDOW FOR {act_crop.upper()} HARVEST",
                    "headline": f"🌾 Favorable Dry Window for {act_crop} Harvest on {date_label}",
                    "reasoning": (
                        f"Your farm diary logs planned harvesting for {act_crop} on {date_label}. Dry weather conditions ({rain_prob}% rain risk) in {district} provide "
                        f"an ideal window for combine or manual harvesting."
                    ),
                    "ai_explanation": (
                        f"Harvest Intelligence:\n"
                        f"1. Diary Connection: {act_crop} harvest scheduled on {land_acres} acres.\n"
                        f"2. Weather Conditions: Low rain probability ({rain_prob}%) ensures low grain moisture at harvest, which minimizes drying costs and fetch top APMC modal rates."
                    ),
                    "confidence": 90 if weather.get("source") == "live" else 80,
                    "estimated_impact": "Preserves harvest quality and ensures optimal grain moisture",
                    "underlying_context": {
                        "farmer_profile": f"{name} ({land_acres} Acres, {', '.join(crops)}, {district})",
                        "diary_entry_matched": f"{selected_entry.get('id')}",
                        "weather_trigger": "Dry harvest window",
                        "mandi_context": f"{act_crop} APMC arrivals"
                    },
                    "recommended_new_date": f"On Schedule: {'Today' if date_label == 'Scheduled Window' else date_label}",
                    "source_data": {
                        "weather": {"temp": temp, "rain_prob": rain_prob, "condition": condition},
                        "mandi": None
                    }
                }

        # Activity Type 3: Irrigation
        elif "irrigation" in act_type or "water" in act_type or "drip" in act_type or "sprinkler" in act_type:
            if rain_prob >= 40:
                rec = {
                    "decision_type": "irrigation_advisory",
                    "action": f"PAUSE PLANNED {act_crop.upper()} IRRIGATION DUE TO RAIN FORECAST",
                    "headline": f"🌧️ Pause Planned Irrigation for {act_crop} (Rain Expected)",
                    "reasoning": (
                        f"Your farm diary logs planned irrigation for {act_crop} on {date_label}. With {rain_prob}% rain probability forecasted in {district}, "
                        f"natural precipitation will replenish root zone moisture. Pausing saves pumping power and prevents root asphyxiation."
                    ),
                    "ai_explanation": (
                        f"Irrigation Water Management:\n"
                        f"1. Diary Match: Planned irrigation on {land_acres} acres of {act_crop}.\n"
                        f"2. Weather Risk: Rain probability {rain_prob}%. Irrigating prior to rain creates water stagnation in heavy soils.\n"
                        f"3. Recommendation: Pause irrigation cycle; re-evaluate soil moisture 24 hours after rainfall."
                    ),
                    "confidence": 90 if weather.get("source") == "live" else 80,
                    "estimated_impact": "Saves irrigation energy & prevents waterlogging",
                    "underlying_context": {
                        "farmer_profile": f"{name} ({land_acres} Acres, {district})",
                        "diary_entry_matched": f"{selected_entry.get('id')}",
                        "weather_trigger": f"{rain_prob}% Rain Forecast",
                        "mandi_context": f"{act_crop} steady"
                    },
                    "recommended_new_date": "Next dry cycle after rainfall settles",
                    "source_data": {
                        "weather": {"temp": temp, "rain_prob": rain_prob, "condition": condition},
                        "mandi": None
                    }
                }
            else:
                rec = {
                    "decision_type": "irrigation_advisory",
                    "action": f"SCHEDULE EARLY MORNING IRRIGATION FOR {act_crop.upper()}",
                    "headline": f"💧 Execute Early Morning Irrigation for {act_crop}",
                    "reasoning": (
                        f"Your farm diary logs planned irrigation for {act_crop} on {date_label}. High daytime temperatures ({temp}°C) and low rain risk ({rain_prob}%) in {district} "
                        f"increase evapotranspiration. Water early in the morning (06:00 - 08:30 AM) to maximize root penetration."
                    ),
                    "ai_explanation": (
                        f"Irrigation Efficiency Strategy:\n"
                        f"1. Diary Match: Planned irrigation on {land_acres} acres of {act_crop}.\n"
                        f"2. Thermal Context: Daytime highs reach {temp}°C. Midday watering loses up to 35% to evaporation.\n"
                        f"3. Action: Complete irrigation before 08:30 AM to maintain optimal root zone moisture."
                    ),
                    "confidence": 90 if weather.get("source") == "live" else 80,
                    "estimated_impact": "Conserves water & prevents thermal stress on root system",
                    "underlying_context": {
                        "farmer_profile": f"{name} ({land_acres} Acres, {district})",
                        "diary_entry_matched": f"{selected_entry.get('id')}",
                        "weather_trigger": f"{temp}°C Temperature",
                        "mandi_context": f"{act_crop} steady"
                    },
                    "recommended_new_date": f"{'Tomorrow' if date_label == 'Scheduled Window' else date_label} (Early Morning 06:00 AM - 08:30 AM)",
                    "source_data": {
                        "weather": {"temp": temp, "rain_prob": rain_prob, "condition": condition},
                        "mandi": None
                    }
                }

        # Activity Type 4: Mandi Sale / Market Transport
        else:
            crop_mandi = next((m for m in mandi_prices if act_crop.lower() in m.get("commodity", "").lower()), None)
            mandi_price = crop_mandi.get("modal_price") if crop_mandi else None
            msp_val = crop_mandi.get("msp") if crop_mandi else None

            price_note = f"trading at ₹{mandi_price:,}/Q" if mandi_price else "trading active"
            impact_note = (
                f"Secures modal rate (₹{mandi_price:,}/Q, ₹{mandi_price - msp_val:,}/Q above MSP)"
                if mandi_price and msp_val and mandi_price > msp_val else
                "Ensures timely produce transport during dry road conditions"
            )

            rec = {
                "decision_type": "mandi_opportunity",
                "action": f"EXECUTE {act_crop.upper()} MANDI TRANSPORT DURING DRY WINDOW",
                "headline": f"📈 Favorable Market Transport Window for {act_crop}",
                "reasoning": (
                    f"Your farm diary logs planned market sale on {date_label}. Local weather in {district} indicates {condition} ({rain_prob}% rain risk), "
                    f"providing dry transport conditions. {act_crop} is currently {price_note} at local APMC."
                ),
                "ai_explanation": (
                    f"Market Logistics Intelligence:\n"
                    f"1. Diary Match: Planned market dispatch for {act_crop} on {date_label}.\n"
                    f"2. Transport Weather: Road conditions dry with minimal rain risk ({rain_prob}%).\n"
                    f"3. Strategy: Transport early in the morning to secure optimal bay placement and avoid midday heat on perishable produce."
                ),
                "confidence": 92 if weather.get("source") == "live" else 82,
                "estimated_impact": impact_note,
                "underlying_context": {
                    "farmer_profile": f"{name} ({land_acres} Acres, {district})",
                    "diary_entry_matched": f"{selected_entry.get('id')}",
                    "weather_trigger": f"{condition} (Dry Transport)",
                    "mandi_context": f"{act_crop}: {price_note}"
                },
                "recommended_new_date": f"{'Today' if date_label == 'Scheduled Window' else date_label} (Morning 08:00 AM)",
                "source_data": {
                    "weather": {"temp": temp, "rain_prob": rain_prob, "condition": condition},
                    "mandi": {"commodity": act_crop, "price": mandi_price, "source": crop_mandi.get("source", "live") if crop_mandi else "fallback"}
                }
            }

        # Attach SQLite persistence acknowledgement state
        rec["is_acknowledged"] = is_acknowledged
        if is_acknowledged:
            rec["acknowledged_status"] = ack.get("status", "postponed")
            rec["status_label"] = f"Acknowledged & Rescheduled to {ack.get('postponed_to_date', rec.get('recommended_new_date'))}"

        return rec


recommendation_service = RecommendationService()
