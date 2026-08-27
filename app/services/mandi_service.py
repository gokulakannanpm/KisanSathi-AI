import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class MandiService:
    """Service serving live and deterministic mock mandi prices."""

    def __init__(self, data_dir: Optional[Path] = None):
        if data_dir is None:
            base_dir = Path(__file__).resolve().parent.parent.parent
            self.data_dir = base_dir / "data"
        else:
            self.data_dir = Path(data_dir)

        self.mock_mandi_file = self.data_dir / "mock_mandi_prices.json"

    def get_prices(
        self,
        crop_filter: Optional[str] = None,
        state_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        prices: List[Dict[str, Any]] = []
        if self.mock_mandi_file.exists():
            try:
                with open(self.mock_mandi_file, "r", encoding="utf-8") as f:
                    prices = json.load(f)
            except Exception as e:
                logger.error(f"Error reading mock_mandi_prices.json: {e}")

        filtered = []
        for p in prices:
            if crop_filter:
                crop_term = crop_filter.strip().lower()
                commodity = str(p.get("commodity", "")).lower()
                if crop_term not in commodity:
                    continue

            if state_filter:
                state_term = state_filter.strip().lower()
                state = str(p.get("state", "")).lower()
                if state_term not in state:
                    continue

            filtered.append(p)

        return filtered


mandi_service = MandiService()
