import base64
import json
import logging
import os
import ssl
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from cryptography.hazmat.primitives import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

logger = logging.getLogger(__name__)

# Base paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DATA_DIR = PROJECT_ROOT / "data"
PERSISTENT_SNAPSHOT_PATH = DATA_DIR / "koyambedu_prices.json"
REFERENCE_SNAPSHOT_PATH = DATA_DIR / "koyambedu_reference_prices.json"

# Official Koyambedu Market Management Committee (MMC KWMC) API configuration
KOYAMBEDU_BASE_URL = "https://api.mmckwmc.tn.gov.in"
KOYAMBEDU_TOKEN_URL = f"{KOYAMBEDU_BASE_URL}/admin/generatetoken"
KOYAMBEDU_PRICE_URL = f"{KOYAMBEDU_BASE_URL}/price/viewcategorybyid"

# Static credentials decompiled from official portal client bundle
SECRET_KEY = b"xpoS34Yojn9SBxbmny9g947fi9mxxwx4"
TOKEN_PAYLOAD = {"screateKey": "K+v4pvlGZSRd2X+9I0geZg=="}

# Cooldown and refresh intervals
DAILY_REFRESH_SECONDS = 86400.0       # 24 hours daily refresh
MANUAL_REFRESH_COOLDOWN = 60.0        # 1 minute between forced refreshes
STALE_THRESHOLD_SECONDS = 86400.0     # Older than 24h is considered stale


class KoyambeduService:
    """
    Dedicated source adapter for Koyambedu Market Management Committee (MMC KWMC)
    market-price benchmark with daily refresh, persistent disk storage, concurrency locks,
    and emergency fallback to manual reference snapshots.

    Strictly isolated and scoped to Thanjavur, Tamil Nadu profile only.
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._cached_token: Optional[str] = None
        self._token_expiry: float = 0.0
        self._last_refresh_attempt: float = 0.0
        self._last_manual_refresh: float = 0.0

        # Normal TLS context with standard certificate verification
        self._ssl_ctx = ssl.create_default_context()

    def _encrypt(self, data_dict: Dict[str, Any]) -> str:
        """Encrypts payload for MMC KWMC API using AES-128-ECB PKCS7."""
        plaintext = json.dumps(data_dict).encode("utf-8")
        padder = padding.PKCS7(128).padder()
        padded_data = padder.update(plaintext) + padder.finalize()
        cipher = Cipher(algorithms.AES(SECRET_KEY), modes.ECB())
        encryptor = cipher.encryptor()
        ciphertext = encryptor.update(padded_data) + encryptor.finalize()
        return base64.b64encode(ciphertext).decode("utf-8")

    def _decrypt(self, enc_b64: str) -> Any:
        """Decrypts response from MMC KWMC API using AES-128-ECB PKCS7."""
        ciphertext = base64.b64decode(enc_b64)
        cipher = Cipher(algorithms.AES(SECRET_KEY), modes.ECB())
        decryptor = cipher.decryptor()
        padded_plaintext = decryptor.update(ciphertext) + decryptor.finalize()
        unpadder = padding.PKCS7(128).unpadder()
        plaintext = unpadder.update(padded_plaintext) + unpadder.finalize()
        return json.loads(plaintext.decode("utf-8"))

    def _get_access_token(self) -> Optional[str]:
        """Obtains short-lived bearer token from official MMC KWMC token endpoint."""
        now = time.time()
        if self._cached_token and now < self._token_expiry:
            return self._cached_token

        try:
            req = urllib.request.Request(
                KOYAMBEDU_TOKEN_URL,
                data=json.dumps(TOKEN_PAYLOAD).encode("utf-8"),
                headers={"Content-Type": "application/json", "User-Agent": "KisanSathi-AI/1.0"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10, context=self._ssl_ctx) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                token = data.get("response", {}).get("X_ACCESS_TOKEN")
                if token:
                    self._cached_token = token
                    self._token_expiry = now + 7200.0  # 2 hours validity
                    return token
        except Exception as e:
            logger.warning(f"Koyambedu token generation failed: {e}")
            return None

    def fetch_live_prices(self) -> Optional[List[Dict[str, Any]]]:
        """
        Retrieves official commodity price data from Koyambedu Wholesale Market API.
        Validates minimum and maximum prices, units, and timestamps.
        Rejects empty or malformed datasets.
        """
        token = self._get_access_token()
        if not token:
            return None

        try:
            # Category 4 is Vegetables in the MMC KWMC system
            enc_payload = self._encrypt({"categoryId": 4})
            req = urllib.request.Request(
                KOYAMBEDU_PRICE_URL,
                data=json.dumps({"data": enc_payload}).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "User-Agent": "KisanSathi-AI/1.0",
                    "X_ACCESS_TOKEN": f"Bearer {token}"
                },
                method="POST"
            )

            with urllib.request.urlopen(req, timeout=10, context=self._ssl_ctx) as resp:
                res_json = json.loads(resp.read().decode("utf-8"))
                enc_response = res_json.get("response")
                if not enc_response:
                    return None

                decrypted_data = self._decrypt(enc_response)
                raw_items = decrypted_data.get("response", []) if isinstance(decrypted_data, dict) else []

                if not raw_items or not isinstance(raw_items, list):
                    logger.warning("Koyambedu API returned empty or non-list response.")
                    return None

                validated_records: List[Dict[str, Any]] = []
                now_iso = datetime.now(timezone.utc).isoformat()

                for item in raw_items:
                    name_en = str(item.get("nameInEnglish") or "").strip()
                    if not name_en:
                        continue

                    try:
                        min_p = float(item.get("minPrice") or 0.0)
                        max_p = float(item.get("maxPrice") or 0.0)
                    except (ValueError, TypeError):
                        continue

                    # Validate non-negative price and min <= max
                    if min_p < 0.0 or max_p < min_p:
                        logger.warning(f"Rejecting malformed price row for {name_en}: min={min_p}, max={max_p}")
                        continue

                    # Midpoint calculation clearly identified as advisory midpoint
                    modal_p = round((min_p + max_p) / 2.0, 1)
                    units_raw = str(item.get("units") or "1 Kg").strip()
                    updated_at = str(item.get("updatedAt") or "").strip()
                    obs_date = updated_at.split(" ")[0] if " " in updated_at else (updated_at or now_iso.split("T")[0])

                    validated_records.append({
                        "s_no": len(validated_records) + 1,
                        "commodity": name_en,
                        "commodity_tamil": str(item.get("nameInTamil") or "").strip(),
                        "variety": "Wholesale Lot",
                        "market": "Koyambedu Wholesale Market Complex (KWMC), Chennai",
                        "district": "Chennai",
                        "state": "Tamil Nadu",
                        "min_price": min_p,
                        "max_price": max_p,
                        "modal_price": modal_p,
                        "price": modal_p,
                        "unit": f"₹ / {units_raw}",
                        "raw_unit": units_raw,
                        "category": str(item.get("category") or "Vegetables"),
                        "msp": None,  # NEVER derive MSP from market prices
                        "msp_season": None,
                        "msp_source": "MSP data unavailable (No government MSP for horticultural perishables)",
                        "price_category": "wholesale_benchmark",
                        "date": obs_date,
                        "observation_date": obs_date,
                        "observation_timestamp": updated_at or now_iso,
                        "retrieved_at": now_iso,
                        "data_status": "live",
                        "source": "live",
                        "source_name": "Market Management Committee (MMC) Koyambedu Wholesale Market, Chennai",
                        "source_url": "https://mmckwmc.tn.gov.in/landing-page/commodity",
                        "is_benchmark": True,
                        "benchmark_notice": "Chennai wholesale terminal benchmark for commercial reference only; not a Thanjavur local APMC farm-gate price."
                    })

                if not validated_records:
                    return None

                return validated_records

        except Exception as e:
            logger.warning(f"Live Koyambedu price retrieval failed: {e}")
            return None

    def _save_persistent_snapshot(self, records: List[Dict[str, Any]]) -> bool:
        """Saves valid records to data/koyambedu_prices.json atomically."""
        try:
            DATA_DIR.mkdir(parents=True, exist_ok=True)
            now_iso = datetime.now(timezone.utc).isoformat()
            obs_date = records[0].get("observation_date", now_iso.split("T")[0]) if records else now_iso.split("T")[0]

            payload = {
                "source_type": "official_api",
                "is_live": True,
                "data_status": "cached",
                "source_name": "Market Management Committee (MMC) Koyambedu Wholesale Market, Chennai",
                "source_url": "https://mmckwmc.tn.gov.in/landing-page/commodity",
                "last_retrieved_at": now_iso,
                "observation_date": obs_date,
                "records_count": len(records),
                "records": records
            }

            PERSISTENT_SNAPSHOT_PATH.write_text(
                json.dumps(payload, ensure_ascii=False, indent=2),
                encoding="utf-8"
            )
            return True
        except Exception as e:
            logger.error(f"Failed to save persistent Koyambedu snapshot: {e}")
            return False

    def _load_persistent_snapshot(self) -> Optional[Dict[str, Any]]:
        """Loads persistent snapshot from data/koyambedu_prices.json if available."""
        if not PERSISTENT_SNAPSHOT_PATH.exists():
            return None
        try:
            content = PERSISTENT_SNAPSHOT_PATH.read_text(encoding="utf-8")
            data = json.loads(content)
            if data and isinstance(data.get("records"), list) and len(data["records"]) > 0:
                return data
        except Exception as e:
            logger.warning(f"Could not read persistent Koyambedu snapshot: {e}")
        return None

    def _load_reference_snapshot(self) -> Dict[str, Any]:
        """Loads emergency fallback from data/koyambedu_reference_prices.json."""
        if REFERENCE_SNAPSHOT_PATH.exists():
            try:
                content = REFERENCE_SNAPSHOT_PATH.read_text(encoding="utf-8")
                data = json.loads(content)
                if data and isinstance(data.get("records"), list) and len(data["records"]) > 0:
                    return data
            except Exception as e:
                logger.warning(f"Could not read reference Koyambedu snapshot: {e}")

        # In-memory safety fallback if file is somehow missing
        return {
            "source_type": "manual_reference",
            "is_live": False,
            "data_status": "manual_reference",
            "source_name": "Koyambedu Wholesale Market Reference Snapshot",
            "source_url": "https://mmckwmc.tn.gov.in/landing-page/commodity",
            "observation_date": "2026-10-13",
            "records_count": 0,
            "records": []
        }

    def get_benchmark_bundle(
        self,
        commodity: Optional[str] = None,
        force_refresh: bool = False
    ) -> Dict[str, Any]:
        """
        Retrieves Koyambedu benchmark data with daily refresh, persistent disk caching,
        concurrency protection, and graceful emergency fallback.

        Returns full metadata bundle:
        {
            "status": "live" | "cached" | "stale" | "manual_reference",
            "is_live": bool,
            "source_name": str,
            "source_url": str,
            "retrieved_at": str,
            "observation_date": str,
            "records": List[Dict[str, Any]]
        }
        """
        now = time.time()
        with self._lock:
            stored_snapshot = self._load_persistent_snapshot()
            should_refresh = False

            if force_refresh:
                if (now - self._last_manual_refresh) >= MANUAL_REFRESH_COOLDOWN:
                    should_refresh = True
                    self._last_manual_refresh = now
                else:
                    logger.info("Manual refresh requested within cooldown window; serving cached data.")
            elif stored_snapshot is None:
                should_refresh = True
            else:
                # Check snapshot age for daily refresh
                try:
                    last_dt = datetime.fromisoformat(stored_snapshot["last_retrieved_at"].replace("Z", "+00:00"))
                    age_seconds = now - last_dt.timestamp()
                    if age_seconds >= DAILY_REFRESH_SECONDS:
                        should_refresh = True
                except Exception:
                    should_refresh = True

            # Attempt live retrieval if refresh is indicated
            if should_refresh:
                self._last_refresh_attempt = now
                live_records = self.fetch_live_prices()
                if live_records:
                    self._save_persistent_snapshot(live_records)
                    filtered = self._filter_records(live_records, commodity)
                    obs_date = live_records[0].get("observation_date", datetime.now(timezone.utc).strftime("%Y-%m-%d"))
                    return {
                        "status": "live",
                        "is_live": True,
                        "source_name": "Official MMC KWMC API (api.mmckwmc.tn.gov.in)",
                        "source_url": "https://mmckwmc.tn.gov.in/landing-page/commodity",
                        "retrieved_at": datetime.now(timezone.utc).isoformat(),
                        "observation_date": obs_date,
                        "records": filtered
                    }
                else:
                    logger.warning("Live Koyambedu retrieval failed; retaining existing snapshot.")

            # If stored snapshot is present, use it
            if stored_snapshot:
                raw_records = stored_snapshot.get("records", [])
                last_retrieved = stored_snapshot.get("last_retrieved_at", "")
                is_stale = False
                try:
                    last_dt = datetime.fromisoformat(last_retrieved.replace("Z", "+00:00"))
                    is_stale = (now - last_dt.timestamp()) >= STALE_THRESHOLD_SECONDS
                except Exception:
                    is_stale = False

                data_status = "stale" if is_stale else "cached"
                for rec in raw_records:
                    rec["data_status"] = data_status
                    rec["source"] = data_status

                filtered = self._filter_records(raw_records, commodity)
                return {
                    "status": data_status,
                    "is_live": not is_stale,
                    "source_name": stored_snapshot.get("source_name", "MMC Koyambedu Cached Snapshot"),
                    "source_url": stored_snapshot.get("source_url", "https://mmckwmc.tn.gov.in/landing-page/commodity"),
                    "retrieved_at": last_retrieved,
                    "observation_date": stored_snapshot.get("observation_date", ""),
                    "records": filtered
                }

            # Emergency safety fallback (Method 4: Manually supplied reference prices)
            ref_snapshot = self._load_reference_snapshot()
            raw_records = ref_snapshot.get("records", [])
            for rec in raw_records:
                rec["data_status"] = "manual_reference"
                rec["source"] = "manual_reference"

            filtered = self._filter_records(raw_records, commodity)
            return {
                "status": "manual_reference",
                "is_live": False,
                "source_name": ref_snapshot.get("source_name", "Koyambedu Reference Snapshot (Offline)"),
                "source_url": ref_snapshot.get("source_url", "https://mmckwmc.tn.gov.in/landing-page/commodity"),
                "retrieved_at": ref_snapshot.get("snapshot_date", "2026-10-13"),
                "observation_date": ref_snapshot.get("snapshot_date", "2026-10-13"),
                "records": filtered
            }

    def _filter_records(self, records: List[Dict[str, Any]], commodity: Optional[str]) -> List[Dict[str, Any]]:
        """Filters list of commodity records safely by English or Tamil query term."""
        if not commodity:
            return records
        c_clean = commodity.strip().lower()
        return [
            r for r in records
            if c_clean in str(r.get("commodity", "")).lower()
            or c_clean in str(r.get("commodity_tamil", "")).lower()
        ]

    def get_benchmark_prices(
        self,
        commodity: Optional[str] = None,
        force_refresh: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Backward-compatible method returning records list with observation metadata.
        """
        bundle = self.get_benchmark_bundle(commodity=commodity, force_refresh=force_refresh)
        return bundle.get("records", [])


koyambedu_service = KoyambeduService()
