export const mockFarmerProfile = {
  id: "demo_farmer_01",
  name: "Ramesh Kumar",
  phone: "+91 98765 43210",
  state: "Maharashtra",
  district: "Nagpur",
  taluka: "Hingna",
  village: "Kanhan",
  land_size_acres: 2.5,
  farmer_category: "small",
  crops: ["cotton", "soybean", "wheat"],
  soil_type: "Black Cotton Soil (Regur)",
  owns_land: true,
  has_irrigation: true,
  irrigation_type: "Borewell + Drip Subsidized",
  is_tax_payer: false,
  age: 42,
  pm_kisan_registered: true
};

export const mockDiaryEntries = [
  {
    id: "diary_001",
    date: "2026-08-27",
    activity_type: "Pesticide Spraying",
    crop: "cotton",
    notes: "Planned pesticide spraying (Chlorpyrifos) for cotton pink bollworm prevention tomorrow afternoon.",
    quantity_cost: "₹1,800 / 2.5 Acres",
    status: "planned",
    triggered_alert: true
  },
  {
    id: "diary_002",
    date: "2026-08-22",
    activity_type: "Fertilizer Application",
    crop: "soybean",
    notes: "Applied 50kg Single Super Phosphate (SSP) along with DAP across plot B.",
    quantity_cost: "₹1,350",
    status: "completed",
    triggered_alert: false
  },
  {
    id: "diary_003",
    date: "2026-08-14",
    activity_type: "Drip Irrigation",
    crop: "cotton",
    notes: "Ran drip irrigation cycle for 4 hours following 5-day dry spell.",
    quantity_cost: "Electricity unit 18kWh",
    status: "completed",
    triggered_alert: false
  },
  {
    id: "diary_004",
    date: "2026-07-28",
    activity_type: "Sowing",
    crop: "cotton",
    notes: "Sowed Bt-Cotton hybrid seed packet (BG-II) with 3x1.5 ft spacing.",
    quantity_cost: "4 Packets @ ₹850",
    status: "completed",
    triggered_alert: false
  }
];

export const mockWeather = {
  temperature: 28.4,
  condition: "Heavy Rain & Thunderstorms",
  rain_probability: 88,
  humidity: 92,
  wind_speed: 22.5,
  pressure: 1008,
  source: "live",
  source_name: "IMD Nagpur Doppler Radar Station",
  fetched_at: new Date().toISOString(),
  forecast_3day: [
    { day: "Tomorrow (Thu)", condition: "Heavy Rain (45-60mm)", rain_prob: 88, temp_max: 27, temp_min: 22, spraying_safe: false },
    { day: "Friday", condition: "Scattered Showers", rain_prob: 60, temp_max: 29, temp_min: 23, spraying_safe: false },
    { day: "Saturday", condition: "Partly Cloudy / Clear", rain_prob: 15, temp_max: 32, temp_min: 24, spraying_safe: true }
  ],
  advisory: {
    spraying_index: "UNSAFE (Rain Washout Risk >95%)",
    irrigation_need: "ZERO (Soil Moisture Saturated)",
    drainage_advisory: "Ensure drainage channels in low-lying cotton plots are clear to prevent waterlogging."
  }
};

export const mockMandiPrices = [
  {
    commodity: "Cotton (Kapas)",
    variety: "Medium Staple (Shanker-6)",
    market: "Nagpur APMC Mandi",
    district: "Nagpur",
    state: "Maharashtra",
    modal_price: 7420,
    min_price: 7100,
    max_price: 7650,
    unit: "₹ / Quintal",
    msp: 7121,
    source: "live",
    source_name: "AGMARKNET Live API",
    price_trend: "up",
    trend_pct: "+3.2%",
    date: "2026-08-26",
    fetched_at: new Date().toISOString(),
    ai_selling_tip: "Mandi price is ₹299 above MSP. Demand is peaking at Nagpur and Hinganghat. Hold harvest until Saturday for potential ₹7,550+ peak."
  },
  {
    commodity: "Soybean",
    variety: "Yellow (JS-335)",
    market: "Nagpur APMC Mandi",
    district: "Nagpur",
    state: "Maharashtra",
    modal_price: 4680,
    min_price: 4400,
    max_price: 4850,
    unit: "₹ / Quintal",
    msp: 4892,
    source: "fallback",
    source_name: "AGMARKNET 7-Day Average Fallback Cache",
    fallback_reason: "Daily live server sync pending; displaying rolling modal baseline.",
    price_trend: "stable",
    trend_pct: "0.0%",
    date: "2026-08-25",
    fetched_at: new Date().toISOString(),
    ai_selling_tip: "Trading slightly below MSP. Wait for central NAFED procurement centers to open next week."
  },
  {
    commodity: "Wheat (Lokwan)",
    variety: "Lokwan Premium",
    market: "Nagpur Grain Mandi",
    district: "Nagpur",
    state: "Maharashtra",
    modal_price: 2580,
    min_price: 2450,
    max_price: 2700,
    unit: "₹ / Quintal",
    msp: 2275,
    source: "live",
    source_name: "AGMARKNET Live API",
    price_trend: "up",
    trend_pct: "+1.8%",
    date: "2026-08-26",
    fetched_at: new Date().toISOString(),
    ai_selling_tip: "Steady demand from local flour mills. Good time to offload remaining rabi stock."
  },
  {
    commodity: "Gram (Chana)",
    variety: "Desi",
    market: "Amravati APMC",
    district: "Amravati",
    state: "Maharashtra",
    modal_price: 6150,
    min_price: 5900,
    max_price: 6300,
    unit: "₹ / Quintal",
    msp: 5440,
    source: "fallback",
    source_name: "State Mandi Historical Fallback",
    fallback_reason: "Direct terminal connection timeout, fallback cached rate used.",
    price_trend: "up",
    trend_pct: "+4.1%",
    date: "2026-08-24",
    fetched_at: new Date().toISOString(),
    ai_selling_tip: "Strong festive demand supporting chana prices."
  }
];

export const mockHeroRecommendation = {
  decision_type: "urgent_action",
  action: "POSTPONE SPRAYING PLANNED FOR TOMORROW",
  headline: "⚠️ Postpone Cotton Pesticide Spraying Planned for Thursday",
  reasoning: "Your farm diary logs pesticide spraying tomorrow at 2:00 PM. Live weather forecasts 88% probability of heavy thunderstorm (45-60mm rain) in Nagpur. Rain within 4 hours of spraying will wash away active chemical compounds, resulting in complete failure and ₹1,800 wasted expense.",
  ai_explanation: `Detailed Farm Intelligence Analysis:
1. Diary Connection: You scheduled Chlorpyrifos spraying on 2.5 acres of Bt-Cotton to combat pink bollworm.
2. Live Atmospheric Risk: Doppler radar indicates convective storm clouds moving over Hingna/Nagpur between 12:00 PM and 6:00 PM tomorrow with rainfall intensity up to 25mm/hr.
3. Agronomic Science: Chemical absorption (rainfastness) requires a minimum 6-8 hour dry window. Rainfall will cause toxic soil runoff and zero pest control efficacy.
4. Actionable Strategy: Reschedule spraying to Saturday morning (Aug 29), when rain probability drops below 15% and relative humidity settles at 65%. You save ₹1,800 in re-application cost and prevent chemical leaching into your borewell recharge zone.`,
  confidence: 96,
  estimated_impact: "Saves ₹1,800 pesticide re-purchase + Prevents groundwater chemical contamination",
  underlying_context: {
    farmer_profile: "Ramesh Kumar (2.5 Acres, Cotton/Soybean, Hingna, Nagpur)",
    diary_entry_matched: "Diary #001 (Planned spraying Aug 27)",
    weather_trigger: "88% Rain Forecast (45-60mm precipitation)",
    mandi_context: "Cotton trading at ₹7,420/Q (Protect yield quality for premium rate)"
  },
  recommended_new_date: "Saturday, 29 August 2026 (Morning 07:30 AM)",
  source_data: {
    weather: { temp: 28.4, rain_prob: 88, condition: "Heavy Rain" },
    mandi: { commodity: "Cotton", price: 7420, source: "live" }
  }
};

export const mockSchemes = [
  {
    id: "pm_kisan_samman_nidhi",
    name: "PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
    description: "Direct income support of ₹6,000 per year in three equal 4-monthly installments of ₹2,000 to all landholding farmer families.",
    eligible: true,
    eligibility_reasons: [
      "You own 2.5 acres of cultivable land (Eligible: land ownership verified)",
      "Farmer category 'small' meets landholding criteria",
      "State 'Maharashtra' is fully covered under National DBT rollout",
      "Not registered as an institutional landholder or income-tax assessee"
    ],
    criteria_evaluation: {
      land_size: "PASSED (2.5 Acres <= Unlimited)",
      crop_type: "PASSED (Universal crop coverage)",
      ownership: "PASSED (Farmer owns land)",
      tax_exclusion: "PASSED (Non-tax payer)"
    },
    benefits: "₹6,000 per annum credited directly into Aadhaar-seeded bank account in 3 installments of ₹2,000 every 4 months.",
    required_documents: [
      "Aadhaar Card",
      "Updated Land Record (7/12 extract / 8A Khatauni)",
      "Aadhaar-seeded Bank Account Passbook",
      "Active Mobile Number linked with Aadhaar OTP"
    ],
    application_steps: [
      "Visit PM-KISAN official portal (https://pmkisan.gov.in) and click 'New Farmer Registration'.",
      "Enter your Aadhaar number, State (Maharashtra), and District (Nagpur).",
      "Fill in operational land survey number and bank account details.",
      "Complete eKYC verification via OTP or Biometric at local CSC Center.",
      "Track installment status under 'Beneficiary Status' tab."
    ],
    department: "Department of Agriculture & Farmers Welfare, Ministry of Agriculture",
    official_source: "https://pmkisan.gov.in",
    official_application_link: "https://pmkisan.gov.in/RegistrationFormNew.aspx",
    status: "active"
  },
  {
    id: "pmfby_crop_insurance",
    name: "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
    description: "Comprehensive risk coverage and financial support for crop loss/damage due to unavoidable natural calamities, unseasonal rainfall, and pests.",
    eligible: true,
    eligibility_reasons: [
      "Your cultivated crops (Cotton, Soybean) are notified notified major crops for Nagpur district",
      "Farmer cultivates land in notified area for Kharif season",
      "Maximum nominal premium rate: 2% for Kharif Soybean & 5% for commercial Cotton"
    ],
    criteria_evaluation: {
      crop_match: "PASSED (Cotton & Soybean are notified)",
      state_eligibility: "PASSED (Active in Maharashtra)",
      landholding: "PASSED (Small farmer eligible for state premium share)"
    },
    benefits: "Full sum insured payout against localized calamities, mid-season adversity, post-harvest losses, and prevented sowing. Maharashtra state covers farmer share with ₹1 nominal registration.",
    required_documents: [
      "Aadhaar Card",
      "Land Possession Record (7/12 extract and 8A)",
      "Sowing Certificate (Pik Pahani / Self-declaration)",
      "Cancelled Cheque / Bank Passbook copy"
    ],
    application_steps: [
      "Apply through National Crop Insurance Portal (https://pmfby.gov.in) or local Cooperative Bank.",
      "Select Kharif Season, Maharashtra State, and Nagpur District.",
      "Enter crop acreage (2.5 Acres Cotton & Soybean) and upload 7/12 document.",
      "Pay ₹1 application fee via digital payment.",
      "Download Policy Receipt with Acknowledgement number."
    ],
    department: "Ministry of Agriculture & Farmers Welfare, Govt of India",
    official_source: "https://pmfby.gov.in",
    official_application_link: "https://pmfby.gov.in/farmerRegistrationForm",
    status: "active"
  },
  {
    id: "pmksy_pdmc_micro_irrigation",
    name: "PMKSY - Per Drop More Crop (Micro Irrigation Subsidy)",
    description: "Centrally sponsored scheme promoting precision water management through Drip and Sprinkler irrigation systems with substantial capital subsidy.",
    eligible: true,
    eligibility_reasons: [
      "Your landholding (2.5 acres) qualifies for Small & Marginal 55% maximum subsidy slab",
      "Verified borewell irrigation source available on farm",
      "Cotton & Soybean crops are ideal candidates for inline drip lateral systems"
    ],
    criteria_evaluation: {
      land_criteria: "PASSED (2.5 Acres <= 5 Acres for 55% enhanced subsidy)",
      water_source: "PASSED (Borewell available)",
      ownership: "PASSED (Land record verified)"
    },
    benefits: "Up to 55% financial subsidy on benchmark cost of drip and sprinkler irrigation installations (saving up to ₹42,000 on 2.5 acre setup).",
    required_documents: [
      "Aadhaar Card",
      "7/12 Land Record and 8A extract",
      "Proof of Water Source (Electricity connection / Borewell NOC)",
      "Soil & Water test report",
      "Proforma invoice from authorized drip manufacturer (Jain / Netafim)"
    ],
    application_steps: [
      "Register on MahaDBT Farmer Portal (https://mahadbt.maharashtra.gov.in).",
      "Select 'Agriculture Department' -> 'Per Drop More Crop - Drip Irrigation'.",
      "Enter survey numbers, water source details, and crop layout.",
      "Upload quotations and select registered drip vendor.",
      "Field officer conducts pre-sanction and post-installation GPS survey before subsidy DBT."
    ],
    department: "Department of Agriculture & Farmers Welfare, Govt of Maharashtra",
    official_source: "https://pmksy.gov.in",
    official_application_link: "https://mahadbt.maharashtra.gov.in/Farmer/AgriHorti/HortiIndex",
    status: "active"
  },
  {
    id: "kcc_kisan_credit_card",
    name: "Kisan Credit Card (KCC) Crop Loan",
    description: "Institutional short-term crop loan and working capital credit facility at highly concessional 4% interest rate with prompt repayment incentive.",
    eligible: true,
    eligibility_reasons: [
      "Age 42 is within 18-75 eligibility window",
      "Cultivates Cotton and Soybean on 2.5 acres operational holding",
      "Eligible for scale-of-finance loan limit up to ₹1,75,000 with zero collateral requirement"
    ],
    criteria_evaluation: {
      age_limit: "PASSED (42 years within [18, 75])",
      scale_of_finance: "PASSED (Estimated Limit: ₹1.75 Lakhs)",
      interest_subvention: "PASSED (3% Prompt Repayment Benefit)"
    },
    benefits: "Subsidized 4% interest rate on credit up to ₹3 Lakhs. Collateral-free limit up to ₹1.60 Lakhs. Flexible ATM-enabled RuPay Kisan Debit Card.",
    required_documents: [
      "One-page KCC Application Form",
      "Aadhaar Card & PAN Card",
      "Land Record (7/12 extract / Khatauni) showing crop pattern",
      "No-dues certificate from local branch (waived up to ₹1.6L)"
    ],
    application_steps: [
      "Obtain standard KCC form from your nearest bank or CSC center.",
      "Fill out farmer personal information and 2.5 acre cropping details.",
      "Attach copies of Aadhaar and 7/12 land extract.",
      "Submit to State Bank of India / Vidharbha Konkan Gramin Bank branch.",
      "Bank sanctions credit limit and issues RuPay KCC Card within 14 days."
    ],
    department: "Ministry of Finance & NABARD",
    official_source: "https://agricoop.nic.in",
    official_application_link: "https://myscheme.gov.in/schemes/kcc",
    status: "active"
  },
  {
    id: "soil_health_card_scheme",
    name: "Soil Health Card Scheme",
    description: "Nationwide soil testing scheme providing periodic farm-level soil nutrient status reports and tailored fertilizer & micronutrient recommendations.",
    eligible: true,
    eligibility_reasons: [
      "Universal eligibility for all operational farm holdings in India",
      "Includes customized fertilizer dosage calculations for Cotton, Soybean, and Wheat crops"
    ],
    criteria_evaluation: {
      universal: "PASSED (All farmers eligible)",
      soil_sampling: "PASSED (Nagpur district laboratory coverage)"
    },
    benefits: "Free 12-parameter soil fertility analysis (N, P, K, S, Zn, Fe, Cu, Mn, Bo, pH, EC, OC) with crop-specific fertilizer recommendations to reduce excess chemical expenses.",
    required_documents: [
      "Aadhaar Card",
      "Land Survey Number / Khasra details",
      "Current crop history and proposed next season crop"
    ],
    application_steps: [
      "Contact your local Gram Panchayat Krishi Sahayak / Kisan Mitra.",
      "Schedule GPS-referenced soil sampling in your farm.",
      "Soil sample is sent to District Soil Testing Lab, Nagpur.",
      "Download your digital Soil Health Card from https://soilhealth.dac.gov.in."
    ],
    department: "Integrated Nutrient Management Division, Ministry of Agriculture",
    official_source: "https://soilhealth.dac.gov.in",
    official_application_link: "https://soilhealth.dac.gov.in/farmer-report",
    status: "active"
  }
];
