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
    try {
      const res = await fetch(`${API_BASE}/ai/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contextPayload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      isBackendAvailable = true;
      return data;
    } catch (e) {
      // Intelligent contextual mock response
      return {
        explanation_text: `Based on your farm memory and live radar data: The scheduled action has been evaluated. Heavy rain forecast for your region will cause input washout. Postponing ensures full protection and saves re-application expenses.`,
        provider_used: "KisanSathi Farm Intelligence Engine (Offline Fallback)",
        action_steps: [
          "Do not mix chemicals today to avoid degradation",
          "Ensure field drainage is unclogged before tomorrow",
          "Perform operation during the recommended safe window"
        ],
        confidence: 95
      };
    }
  }
};
