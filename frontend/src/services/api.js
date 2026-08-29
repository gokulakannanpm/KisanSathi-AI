import { 
  mockFarmerProfile, 
  mockDiaryEntries, 
  mockWeather, 
  mockMandiPrices, 
  mockHeroRecommendation, 
  mockSchemes 
} from './mockData';
import { API_BASE, DEFAULT_FARMER_ID } from '../config/constants';

let isBackendAvailable = true;

const handleFetchError = (error, fallback) => {
  console.warn(`[KisanSathi API] Backend call failed (${error.message}). Gracefully using local farm memory fallback.`);
  isBackendAvailable = false;
  return fallback;
};

export const apiService = {
  getBackendStatus: () => isBackendAvailable,

  // 1. Farmer Profile
  getFarmerProfile: async (farmerId = DEFAULT_FARMER_ID) => {
    try {
      const res = await fetch(`${API_BASE}/farmer/${farmerId}/profile`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      isBackendAvailable = true;
      return data;
    } catch (e) {
      return handleFetchError(e, mockFarmerProfile);
    }
  },

  // 2. Farmer Diary
  getDiaryEntries: async (farmerId = DEFAULT_FARMER_ID) => {
    try {
      const res = await fetch(`${API_BASE}/farmer/${farmerId}/diary`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      isBackendAvailable = true;
      return data;
    } catch (e) {
      return handleFetchError(e, mockDiaryEntries);
    }
  },

  addDiaryEntry: async (farmerId = DEFAULT_FARMER_ID, entry) => {
    try {
      const res = await fetch(`${API_BASE}/farmer/${farmerId}/diary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      isBackendAvailable = true;
      return data;
    } catch (e) {
      console.warn(`[KisanSathi API] Save diary to backend failed, saving in memory.`);
      return { id: `diary_${Date.now()}`, ...entry, status: entry.status || 'planned' };
    }
  },

  // 3. Live Weather
  getCurrentWeather: async (farmerId = DEFAULT_FARMER_ID) => {
    try {
      const res = await fetch(`${API_BASE}/weather/current?farmer_id=${farmerId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      isBackendAvailable = true;
      return data;
    } catch (e) {
      return handleFetchError(e, mockWeather);
    }
  },

  // 4. Mandi Prices
  getMandiPrices: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    try {
      const res = await fetch(`${API_BASE}/mandi/price?${query}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      isBackendAvailable = true;
      return Array.isArray(data) ? data : [data];
    } catch (e) {
      return handleFetchError(e, mockMandiPrices);
    }
  },

  // 5. Hero Personalized Recommendation
  getRecommendation: async (farmerId = DEFAULT_FARMER_ID) => {
    try {
      const res = await fetch(`${API_BASE}/recommendation/${farmerId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      isBackendAvailable = true;
      return data;
    } catch (e) {
      return handleFetchError(e, mockHeroRecommendation);
    }
  },

  // 6. Action Acknowledgement & Postponement Persistence
  acknowledgeAction: async (farmerId = DEFAULT_FARMER_ID, payload = {}) => {
    try {
      const res = await fetch(`${API_BASE}/recommendation/${farmerId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      isBackendAvailable = true;
      return data;
    } catch (e) {
      console.warn(`[KisanSathi API] Acknowledge action backend call failed.`);
      return { status: 'postponed', ...payload };
    }
  },

  // 7. Multilingual Government Schemes
  getSchemes: async (farmerId = DEFAULT_FARMER_ID, language = 'en') => {
    try {
      const res = await fetch(`${API_BASE}/schemes?farmer_id=${farmerId}&language=${language}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      isBackendAvailable = true;
      return data;
    } catch (e) {
      return handleFetchError(e, mockSchemes);
    }
  },

  // 8. Scheme Eligibility Check
  getSchemeEligibility: async (schemeId, farmerId = DEFAULT_FARMER_ID, language = 'en') => {
    try {
      const res = await fetch(`${API_BASE}/schemes/${schemeId}/eligibility?farmer_id=${farmerId}&language=${language}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      isBackendAvailable = true;
      return data;
    } catch (e) {
      const found = mockSchemes.find(s => s.id === schemeId);
      return handleFetchError(e, {
        scheme_id: schemeId,
        scheme_name: found ? found.name : schemeId,
        eligible: found ? found.eligible : true,
        reasons: found ? found.eligibility_reasons : ["Eligible for small farmer holding."]
      });
    }
  },

  // 9. AI Explainer Assistant
  askAiExplain: async (contextPayload) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(`${API_BASE}/ai/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contextPayload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      isBackendAvailable = true;
      return data;
    } catch (e) {
      clearTimeout(timeoutId);
      console.warn(`[KisanSathi AI] AI endpoint unavailable (${e.message}). Using agricultural demo fallback.`);
      
      const q = (contextPayload?.question || '').toLowerCase();
      let text = "Advisory based on farm memory & weather conditions: Rain forecast requires postponing chemical applications to avoid washout.";
      let steps = [
        "Verify field drainage before operation",
        "Follow weather-safe application window",
        "Ensure protective safety equipment"
      ];

      if (q.includes("wait before spraying") || q.includes("rain is expected") || q.includes("why should i wait")) {
        text = "Chemical rainfastness requires at least 6-8 hours of dry weather. Spraying before rain leads to chemical washout, zero pest control efficacy, and financial loss.";
        steps = [
          "Postpone spraying until weather radar confirms a clear 8-hour window",
          "Keep chemicals sealed in dry storage to avoid degradation",
          "Inspect field for pest density prior to rescheduled operation"
        ];
      } else if (q.includes("heavy rain") || q.includes("forecast")) {
        text = "When heavy rain is forecast: 1) Clear field drainage channels to prevent waterlogging. 2) Postpone fertilizer/pesticide sprays. 3) Secure harvested produce in dry storage.";
        steps = [
          "Clear field perimeter drainage channels immediately",
          "Do not apply granular fertilizers or foliar sprays today",
          "Verify grain and harvest storage moisture protection"
        ];
      } else if (q.includes("crop health") || q.includes("improve")) {
        text = "To improve crop health: 1) Apply balanced NPK fertilizer based on crop growth stage. 2) Maintain soil moisture balance. 3) Monitor fields weekly for early pest signs.";
        steps = [
          "Conduct regular soil moisture & nutrient monitoring",
          "Maintain proper weed management and plant spacing",
          "Apply crop protection inputs during optimal weather windows"
        ];
      } else if (q.includes("check before spraying") || q.includes("pesticides") || q.includes("check")) {
        text = "Before spraying pesticides: 1) Verify 6-8 hour zero-rain forecast and low wind speed. 2) Use correct dosage per acre. 3) Wear protective safety gear.";
        steps = [
          "Verify 8-hour rain and wind velocity forecast",
          "Check sprayer nozzle pattern and pressure calibration",
          "Wear recommended personal protective safety equipment"
        ];
      }

      return {
        explanation_text: text,
        provider_used: "Rule Engine Fallback (Offline)",
        action_steps: steps,
        confidence: 95
      };
    }
  }
};
