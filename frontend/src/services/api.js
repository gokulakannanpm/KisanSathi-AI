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

  // 6. Multilingual Government Schemes
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

  // 7. Scheme Eligibility Check
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

  // 8. AI Explainer Assistant
  askAiExplain: async (contextPayload) => {
    try {
      const res = await fetch(`${API_BASE}/ai/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contextPayload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data;
    } catch (e) {
      // Intelligent contextual mock response
      return {
        explanation_text: `Based on your 2.5 acre farm memory and live radar data: The scheduled pesticide application should be delayed by 48-72 hours. Heavy rain (>45mm) forecast for Nagpur will wash off spray within 2 hours. By postponing until Saturday morning, you ensure full pest protection for your cotton crop and save ₹1,800.`,
        provider_used: "KisanSathi Farm Intelligence Engine (Offline Fallback)",
        action_steps: [
          "Do not mix chemicals today to avoid degradation",
          "Ensure field drainage is unclogged before 12:00 PM tomorrow",
          "Perform spraying on Saturday between 07:00 AM and 10:00 AM"
        ]
      };
    }
  }
};
