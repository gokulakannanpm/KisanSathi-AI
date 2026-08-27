import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union


class SchemeEngine:
    """
    Deterministic, rule-based evaluation engine for Indian Agricultural Government Schemes.
    Evaluates farmer profiles against scheme eligibility criteria without any AI guessing.
    Supports dynamic hot-reloading of data/schemes.json and multilingual translations.
    """

    SUPPORTED_LANGUAGES = ["en", "hi", "ta", "mr"]
    DEFAULT_LANGUAGE = "en"

    def __init__(self, data_dir: Optional[Union[str, Path]] = None):
        if data_dir is None:
            # Auto-detect data directory relative to repository root or current file
            base_dir = Path(__file__).resolve().parent.parent.parent
            self.data_dir = base_dir / "data"
        else:
            self.data_dir = Path(data_dir)

        self.schemes_file = self.data_dir / "schemes.json"
        self.i18n_dir = self.data_dir / "i18n"
        self.demo_farmer_file = self.data_dir / "demo_farmer.json"

        self._schemes_cache: List[Dict[str, Any]] = []
        self._schemes_stat: Tuple[int, int] = (0, 0)
        self._i18n_cache: Dict[str, Dict[str, Any]] = {}
        self._i18n_stat: Dict[str, Tuple[int, int]] = {}

    def _load_schemes(self) -> List[Dict[str, Any]]:
        """Loads schemes dataset from JSON with hot-reload based on file mtime and size."""
        if not self.schemes_file.exists():
            return []

        try:
            stat = self.schemes_file.stat()
            current_stat = (stat.st_mtime_ns, stat.st_size)
            if current_stat != self._schemes_stat or not self._schemes_cache:
                with open(self.schemes_file, "r", encoding="utf-8") as f:
                    self._schemes_cache = json.load(f)
                self._schemes_stat = current_stat
            return self._schemes_cache
        except Exception:
            return self._schemes_cache

    def _load_i18n(self, lang: str) -> Dict[str, Any]:
        """Loads translation dictionary for a given language with hot-reload."""
        lang_code = lang.lower() if lang else self.DEFAULT_LANGUAGE
        if lang_code not in self.SUPPORTED_LANGUAGES:
            lang_code = self.DEFAULT_LANGUAGE

        lang_file = self.i18n_dir / f"{lang_code}.json"
        if not lang_file.exists():
            # Fallback to English if translation file doesn't exist
            lang_file = self.i18n_dir / f"{self.DEFAULT_LANGUAGE}.json"
            if not lang_file.exists():
                return {}

        try:
            stat = lang_file.stat()
            current_stat = (stat.st_mtime_ns, stat.st_size)
            if current_stat != self._i18n_stat.get(lang_code) or lang_code not in self._i18n_cache:
                with open(lang_file, "r", encoding="utf-8") as f:
                    self._i18n_cache[lang_code] = json.load(f)
                self._i18n_stat[lang_code] = current_stat
            return self._i18n_cache[lang_code]
        except Exception:
            return self._i18n_cache.get(lang_code, {})

    def get_all_schemes_raw(self) -> List[Dict[str, Any]]:
        """Returns the raw scheme list from schemes.json."""
        return self._load_schemes()

    def get_scheme_by_id(self, scheme_id: str) -> Optional[Dict[str, Any]]:
        """Finds a specific scheme by ID."""
        schemes = self._load_schemes()
        for scheme in schemes:
            if scheme.get("id") == scheme_id:
                return scheme
        return None

    def get_demo_farmer_profile(self) -> Optional[Dict[str, Any]]:
        """Reads demo farmer profile if present in data/demo_farmer.json or returns a default."""
        if self.demo_farmer_file.exists():
            try:
                with open(self.demo_farmer_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        
        # Default structured demo farmer
        return {
            "id": "demo_farmer_01",
            "name": "Ramesh Kumar",
            "state": "Maharashtra",
            "district": "Nagpur",
            "land_size_acres": 2.5,
            "crops": ["cotton", "soybean", "wheat"],
            "farmer_category": "small",
            "owns_land": True,
            "has_irrigation": True,
            "is_tax_payer": False,
            "age": 42
        }

    def _normalize_farmer_profile(self, profile: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Normalizes farmer profile dictionary into standard evaluation fields."""
        if not profile:
            return {}

        # Handle land size (supports land_size_acres, land_acres, land_size, acres)
        land_acres = profile.get("land_size_acres")
        if land_acres is None:
            land_acres = profile.get("land_acres", profile.get("land_size", profile.get("acres")))
        try:
            land_acres = float(land_acres) if land_acres is not None else None
        except (ValueError, TypeError):
            land_acres = None

        # Handle crops (supports crops, crop_types, crop, primary_crop)
        crops = profile.get("crops") or profile.get("crop_types") or profile.get("crop") or profile.get("primary_crop") or []
        if isinstance(crops, str):
            crops = [c.strip().lower() for c in crops.split(",") if c.strip()]
        elif isinstance(crops, list):
            crops = [str(c).strip().lower() for c in crops if c]

        # Handle state / location
        state = profile.get("state") or profile.get("location") or ""
        if isinstance(state, str):
            state = state.strip()

        # Handle farmer category
        category = profile.get("farmer_category") or profile.get("category") or ""
        if not category and land_acres is not None:
            if land_acres <= 2.5:
                category = "marginal"
            elif land_acres <= 5.0:
                category = "small"
            elif land_acres <= 10.0:
                category = "medium"
            else:
                category = "large"

        owns_land = profile.get("owns_land", profile.get("land_ownership", True))
        if isinstance(owns_land, str):
            owns_land = owns_land.lower() in ("true", "1", "yes")

        has_irrigation = profile.get("has_irrigation", profile.get("irrigation_source", True))
        if isinstance(has_irrigation, str):
            has_irrigation = has_irrigation.lower() in ("true", "1", "yes")

        is_tax_payer = profile.get("is_tax_payer", False)
        if isinstance(is_tax_payer, str):
            is_tax_payer = is_tax_payer.lower() in ("true", "1", "yes")

        age = profile.get("age")
        try:
            age = int(age) if age is not None else None
        except (ValueError, TypeError):
            age = None

        return {
            "id": profile.get("id") or profile.get("farmer_id"),
            "name": profile.get("name", ""),
            "land_size_acres": land_acres,
            "crops": crops,
            "state": state,
            "farmer_category": str(category).lower(),
            "owns_land": bool(owns_land),
            "has_irrigation": bool(has_irrigation),
            "is_tax_payer": bool(is_tax_payer),
            "age": age
        }

    def evaluate_eligibility(
        self,
        scheme: Dict[str, Any],
        farmer_profile: Optional[Dict[str, Any]],
        language: str = "en"
    ) -> Dict[str, Any]:
        """
        Evaluates a single scheme against farmer profile with deterministic rule checks.
        Returns:
            {
                "eligible": bool,
                "reasons": List[str],
                "criteria_evaluation": Dict[str, str]
            }
        """
        i18n = self._load_i18n(language)
        reason_templates = i18n.get("reasons", {})
        en_i18n = self._load_i18n("en") if language != "en" else i18n
        en_templates = en_i18n.get("reasons", {})

        def get_msg(key: str, **kwargs) -> str:
            tpl = reason_templates.get(key) or en_templates.get(key, "")
            try:
                return tpl.format(**kwargs) if tpl else ""
            except Exception:
                return tpl

        rules = scheme.get("eligibility_rules", {})
        if not farmer_profile:
            # If no farmer profile provided, return open eligibility overview
            return {
                "eligible": True,
                "reasons": [get_msg("eligible_all_criteria_met") or "Open to all qualifying farmers."],
                "criteria_evaluation": {
                    "profile_status": "No farmer context provided (General Criteria Shown)"
                }
            }

        norm = self._normalize_farmer_profile(farmer_profile)
        land_acres = norm.get("land_size_acres")
        farmer_crops = norm.get("crops", [])
        farmer_state = norm.get("state", "")
        farmer_category = norm.get("farmer_category", "")
        owns_land = norm.get("owns_land", True)
        has_irrigation = norm.get("has_irrigation", True)
        is_tax_payer = norm.get("is_tax_payer", False)
        farmer_age = norm.get("age")

        is_eligible = True
        reasons: List[str] = []
        criteria_eval: Dict[str, str] = {}

        # 1. Landholding Max Limit Rule
        max_land = rules.get("max_land_acres")
        if max_land is not None and land_acres is not None:
            if land_acres > max_land:
                is_eligible = False
                reasons.append(get_msg("land_exceeds_maximum", acres=land_acres, max=max_land))
                criteria_eval["land_criteria"] = f"FAILED: {land_acres} acres exceeds maximum limit of {max_land} acres"
            else:
                reasons.append(get_msg("land_within_limits", acres=land_acres))
                criteria_eval["land_criteria"] = f"PASSED: {land_acres} acres is within allowed limit of {max_land} acres"
        elif land_acres is not None:
            criteria_eval["land_criteria"] = f"PASSED: {land_acres} acres (No upper limit)"

        # 2. Landholding Min Limit Rule
        min_land = rules.get("min_land_acres")
        if min_land is not None and land_acres is not None:
            if land_acres < min_land:
                is_eligible = False
                reasons.append(get_msg("land_below_minimum", acres=land_acres, min=min_land))
                criteria_eval["min_land_criteria"] = f"FAILED: {land_acres} acres is below minimum required {min_land} acres"
            else:
                criteria_eval["min_land_criteria"] = f"PASSED: {land_acres} acres meets minimum {min_land} acres requirement"

        # 3. Crop Matching Rule
        allowed_crops = [str(c).lower() for c in rules.get("crop_types", ["any"])]
        if "any" not in allowed_crops and farmer_crops:
            # Check if any of farmer's crops match allowed scheme crops
            matching_crops = [c for c in farmer_crops if c in allowed_crops]
            if not matching_crops:
                is_eligible = False
                allowed_str = ", ".join(allowed_crops)
                crop_str = ", ".join(farmer_crops)
                reasons.append(get_msg("crop_not_eligible", crop=crop_str, allowed_crops=allowed_str))
                criteria_eval["crop_criteria"] = f"FAILED: Crops ({crop_str}) not in eligible list ({allowed_str})"
            else:
                matched_str = ", ".join(matching_crops)
                reasons.append(get_msg("crop_matches", crop=matched_str))
                criteria_eval["crop_criteria"] = f"PASSED: Matching crop ({matched_str})"
        elif "any" in allowed_crops:
            criteria_eval["crop_criteria"] = "PASSED: All crops eligible (Universal)"

        # 4. State Restriction Rule
        state_rule = rules.get("state_restricted")
        if state_rule:
            allowed_states = [str(s).lower() for s in state_rule] if isinstance(state_rule, list) else [str(state_rule).lower()]
            if farmer_state:
                if farmer_state.lower() not in allowed_states:
                    is_eligible = False
                    allowed_str = ", ".join(state_rule) if isinstance(state_rule, list) else str(state_rule)
                    reasons.append(get_msg("state_not_eligible", allowed_states=allowed_str, state=farmer_state))
                    criteria_eval["state_criteria"] = f"FAILED: State '{farmer_state}' not in allowed states ({allowed_str})"
                else:
                    reasons.append(get_msg("state_matches", state=farmer_state))
                    criteria_eval["state_criteria"] = f"PASSED: Available in '{farmer_state}'"
        else:
            criteria_eval["state_criteria"] = "PASSED: Pan-India National Scheme"

        # 5. Land Ownership Rule
        req_ownership = rules.get("requires_land_ownership", False)
        if req_ownership and not owns_land:
            is_eligible = False
            reasons.append(get_msg("ownership_required"))
            criteria_eval["ownership_criteria"] = "FAILED: Land ownership required"
        elif req_ownership and owns_land:
            criteria_eval["ownership_criteria"] = "PASSED: Farmer owns land"

        # 6. Irrigation Source Rule (e.g. Micro Irrigation)
        req_irrigation = rules.get("requires_irrigation_source", False)
        if req_irrigation and not has_irrigation:
            is_eligible = False
            reasons.append(get_msg("irrigation_source_required"))
            criteria_eval["irrigation_criteria"] = "FAILED: Assured irrigation source required"
        elif req_irrigation and has_irrigation:
            criteria_eval["irrigation_criteria"] = "PASSED: Assured irrigation source available"

        # 7. Income Tax Payer Excluded Rule (e.g. PM-KISAN)
        tax_excluded = rules.get("income_tax_payer_excluded", False)
        if tax_excluded and is_tax_payer:
            is_eligible = False
            reasons.append(get_msg("tax_payer_ineligible"))
            criteria_eval["tax_criteria"] = "FAILED: Income-tax paying individuals excluded"

        # 8. Age Limits Rule (e.g. KCC 18-75)
        min_age = rules.get("min_age")
        max_age = rules.get("max_age")
        if farmer_age is not None and (min_age is not None or max_age is not None):
            low = min_age if min_age is not None else 18
            high = max_age if max_age is not None else 100
            if farmer_age < low or farmer_age > high:
                is_eligible = False
                reasons.append(get_msg("age_ineligible", age=farmer_age, min_age=low, max_age=high))
                criteria_eval["age_criteria"] = f"FAILED: Age {farmer_age} outside [{low}, {high}]"
            else:
                criteria_eval["age_criteria"] = f"PASSED: Age {farmer_age} within eligible range"

        # 9. Farmer Category Rule (e.g. Small / Marginal Only)
        allowed_cats = rules.get("farmer_categories")
        if allowed_cats and isinstance(allowed_cats, list) and "all" not in allowed_cats and "any" not in allowed_cats:
            if farmer_category and farmer_category.lower() not in [c.lower() for c in allowed_cats]:
                is_eligible = False
                cats_str = ", ".join(allowed_cats)
                reasons.append(f"Farmer category '{farmer_category.capitalize()}' is excluded (Eligible categories: {cats_str}).")
                criteria_eval["category_criteria"] = f"FAILED: Category '{farmer_category}' excluded (Restricted to: {cats_str})"
            elif farmer_category:
                criteria_eval["category_criteria"] = f"PASSED: Category '{farmer_category}' eligible"

        # If eligible and no negative reasons logged, add general success statement
        if is_eligible and not reasons:
            reasons.append(get_msg("eligible_all_criteria_met"))

        return {
            "eligible": is_eligible,
            "reasons": reasons,
            "criteria_evaluation": criteria_eval
        }

    def localize_scheme(
        self,
        scheme: Dict[str, Any],
        language: str = "en",
        farmer_profile: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Merges raw scheme with translated content for the specified language
        and attaches computed deterministic eligibility status.
        """
        lang = language.lower() if language else self.DEFAULT_LANGUAGE
        if lang not in self.SUPPORTED_LANGUAGES:
            lang = self.DEFAULT_LANGUAGE

        scheme_id = scheme.get("id", "")
        i18n = self._load_i18n(lang)
        scheme_i18n = i18n.get("schemes", {}).get(scheme_id, {})

        name = scheme_i18n.get("name") or scheme.get("name", "")
        description = scheme_i18n.get("description") or scheme.get("description", "")
        benefits = scheme_i18n.get("benefits") or scheme.get("benefits", "")
        required_documents = scheme_i18n.get("required_documents") or scheme.get("required_documents", [])
        application_steps = scheme_i18n.get("application_steps") or scheme.get("application_steps", [])

        # Evaluate deterministic eligibility
        eval_result = self.evaluate_eligibility(scheme, farmer_profile, language=lang)

        return {
            "id": scheme_id,
            "name": name,
            "description": description,
            "benefits": benefits,
            "required_documents": required_documents,
            "application_steps": application_steps,
            "department": scheme.get("department", ""),
            "status": scheme.get("status", "active"),
            "last_updated": scheme.get("last_updated", ""),
            "official_source": scheme.get("official_source", ""),
            "official_application_link": scheme.get("official_application_link", ""),
            "eligible": eval_result["eligible"],
            "eligibility_reasons": eval_result["reasons"],
            "criteria_evaluation": eval_result["criteria_evaluation"],
            "language": lang
        }

    def get_schemes_list(
        self,
        farmer_profile: Optional[Dict[str, Any]] = None,
        language: str = "en",
        category_filter: Optional[str] = None,
        crop_filter: Optional[str] = None,
        state_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Returns all schemes localized with computed eligibility for the farmer.
        Supports optional filtering.
        """
        schemes = self._load_schemes()
        localized_list = []

        for s in schemes:
            # Apply optional filters
            if state_filter and s.get("eligibility_rules", {}).get("state_restricted"):
                allowed_states = s["eligibility_rules"]["state_restricted"]
                if isinstance(allowed_states, list) and state_filter not in allowed_states:
                    continue
                elif isinstance(allowed_states, str) and state_filter != allowed_states:
                    continue

            if crop_filter:
                allowed_crops = [str(c).lower() for c in s.get("eligibility_rules", {}).get("crop_types", ["any"])]
                if "any" not in allowed_crops and crop_filter.lower() not in allowed_crops:
                    continue

            localized = self.localize_scheme(s, language=language, farmer_profile=farmer_profile)
            localized_list.append(localized)

        # Sort: eligible schemes first, then by name
        localized_list.sort(key=lambda x: (not x["eligible"], x["name"]))
        return localized_list


# Singleton instance for simple reuse
scheme_engine = SchemeEngine()
