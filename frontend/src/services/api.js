import { 
  mockFarmerProfile, 
  mockFarmerProfiles,
  mockDiaryEntries, 
  mockWeather, 
  mockWeatherByProfile,
  getProfileWeatherFallback,
  mockMandiPrices, 
  mockHeroRecommendation, 
  mockSchemes 
} from './mockData';
import { API_BASE, DEFAULT_FARMER_ID } from '../config/constants';

let isBackendAvailable = true;

const getAuthHeaders = () => {
  const token = sessionStorage.getItem('kisansathi_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

const handleFetchError = (error, fallback) => {
  console.warn(`[KisanSathi API] Backend call failed (${error.message}). Gracefully using local farm memory fallback.`);
  isBackendAvailable = false;
  return fallback;
};

export const apiService = {
  getBackendStatus: () => isBackendAvailable,

  // 0. Authentication & Session Methods
  registerFarmer: async (data) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Registration failed (HTTP ${res.status})`);
    }
    const result = await res.json();
    isBackendAvailable = true;
    return result;
  },

  loginFarmer: async (phone, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Login failed (HTTP ${res.status})`);
    }
    const result = await res.json();
    isBackendAvailable = true;
    return result;
  },

  getCurrentUser: async () => {
    const headers = getAuthHeaders();
    if (!headers.Authorization) return null;
    try {
      const res = await fetch(`${API_BASE}/auth/me`, { headers });
      if (!res.ok) return null;
      const data = await res.json();
      isBackendAvailable = true;
      return data;
    } catch {
      return null;
    }
  },

  logoutFarmer: async () => {
    sessionStorage.removeItem('kisansathi_token');
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
    } catch {
      // Ignored
    }
  },

  updateFarmerProfile: async (updates) => {
    const res = await fetch(`${API_BASE}/farmer/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Update failed (HTTP ${res.status})`);
    }
    const data = await res.json();
    isBackendAvailable = true;
    return data;
  },

  // 1. Farmer Profile (Never silently substitute another farmer's profile)
  getFarmerProfile: async (farmerId = DEFAULT_FARMER_ID) => {
    try {
      const res = await fetch(`${API_BASE}/farmer/${farmerId}/profile`, {
        headers: getAuthHeaders()
      });
      if (res.status === 404 || res.status === 401 || res.status === 403) {
        return null;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      isBackendAvailable = true;
      return data;
    } catch (e) {
      if (e.message && e.message.includes('404')) {
        return null;
      }
      // If offline / local dev, match only the specific demo farmer requested
      if (farmerId && mockFarmerProfiles && mockFarmerProfiles[farmerId]) {
        return mockFarmerProfiles[farmerId];
      }
      // Unknown farmer profile: return null rather than silently substituting demo_farmer_01
      return null;
    }
  },

  // 2. Farmer Diary
  getDiaryEntries: async (farmerId = DEFAULT_FARMER_ID) => {
    try {
      const res = await fetch(`${API_BASE}/farmer/${farmerId}/diary`, {
        headers: getAuthHeaders()
      });
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
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(entry)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      isBackendAvailable = true;
      return data;
    } catch (e) {
      console.warn(`[KisanSathi API] Save diary to backend failed, saving in local state.`);
      return { id: `diary_${Date.now()}`, ...entry, status: entry.status || 'planned' };
    }
  },

  // 3. Live Weather
  getCurrentWeather: async (farmerId = DEFAULT_FARMER_ID, extraParams = {}) => {
    try {
      const q = new URLSearchParams({ farmer_id: farmerId, ...extraParams }).toString();
      const res = await fetch(`${API_BASE}/weather/current?${q}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      isBackendAvailable = true;
      return data;
    } catch (e) {
      return handleFetchError(e, getProfileWeatherFallback(farmerId));
    }
  },

  // 4. Mandi Prices with strict source, state, commodity filtering
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

  // 4b. Official Koyambedu Wholesale Market Benchmark (Scoped to Thanjavur only)
  getKoyambeduBenchmark: async (farmerId = 'demo_farmer_03', commodity = null, forceRefresh = false) => {
    try {
      const params = new URLSearchParams({ farmer_id: farmerId });
      if (commodity) params.append('commodity', commodity);
      if (forceRefresh) params.append('force_refresh', 'true');
      const res = await fetch(`${API_BASE}/mandi/koyambedu-benchmark?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      isBackendAvailable = true;
      return data;
    } catch (e) {
      console.warn('[KisanSathi API] Koyambedu benchmark fetch failed:', e);
      return { eligible: farmerId === 'demo_farmer_03', data: [], data_status: 'manual_reference' };
    }
  },

  refreshKoyambeduBenchmark: async (farmerId = 'demo_farmer_03') => {
    try {
      const res = await fetch(`${API_BASE}/mandi/koyambedu-benchmark/refresh?farmer_id=${farmerId}`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      isBackendAvailable = true;
      return data;
    } catch (e) {
      console.warn('[KisanSathi API] Koyambedu manual refresh failed:', e);
      return null;
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

  // 9. On-Demand Crop Planning Assistant (Only executed when farmer requests)
  getCropPlan: async (farmerId = DEFAULT_FARMER_ID, options = {}) => {
    try {
      const res = await fetch(`${API_BASE}/recommendation/${farmerId}/crop-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      isBackendAvailable = true;
      return data;
    } catch (e) {
      console.warn(`[KisanSathi API] Crop planning request failed (${e.message}). Using local agricultural calculator fallback.`);
      return {
        status: "success",
        farmer_context: {
          name: "Farmer",
          state: options.state || "Maharashtra",
          district: options.district || "Nagpur",
          land_size_acres: options.land_size_acres || 2.5,
          soil_type: options.soil_type || "Black Cotton Soil",
          has_irrigation: options.has_irrigation ?? true,
          evaluated_season: "Kharif"
        },
        candidates: [
          {
            crop_id: "cotton",
            crop_name: "Cotton (Medium Staple)",
            season: "Kharif",
            duration: "150 - 170 days",
            suitability_reason: "Well suited to black cotton soil and semi-arid conditions.",
            expected_yield_per_acre_qtl: 8.0,
            total_expected_yield_qtl: 8.0 * (options.land_size_acres || 2.5),
            yield_basis: "ICAR-CICR Central Zone Average Trial Benchmark",
            market_price_per_qtl: 7420,
            price_date: "2026-08-26",
            price_source: "Nagpur APMC Mandi Historical Baseline",
            govt_msp_per_qtl: 7121,
            msp_season: "Kharif 2024-25",
            cost_per_acre: 22000,
            total_cultivation_cost: 22000 * (options.land_size_acres || 2.5),
            gross_revenue_per_acre: 8.0 * 7420,
            total_gross_revenue: 8.0 * 7420 * (options.land_size_acres || 2.5),
            estimated_net_return_per_acre: (8.0 * 7420) - 22000,
            total_estimated_net_return: ((8.0 * 7420) - 22000) * (options.land_size_acres || 2.5),
            major_risks: ["Pink bollworm monitoring required", "Heavy rain at boll opening degrades lint"],
            confidence_score: 85
          }
        ],
        transparency_notice: "Calculations based on published agricultural research benchmarks. Does not guarantee profits."
      };
    }
  },

  // 10. AI Explainer Assistant with context grounding
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
      console.warn(`[KisanSathi AI] AI endpoint unavailable (${e.message}). Using context-aware fallback.`);
      
      if (contextPayload?.mode === 'translate_ta_en' || contextPayload?.mode === 'translate_en_ta' || contextPayload?.is_translation) {
        return {
          explanation_text: contextPayload?.mode === 'translate_en_ta'
            ? "மொழிபெயர்ப்பு தற்காலிகமாக கிடைக்கவில்லை. மீண்டும் முயற்சிக்கவும்."
            : "Translation is temporarily unavailable. Please try again.",
          provider_used: "Translation Unavailable (Offline)",
          action_steps: [],
          confidence: 0,
          reasoning: "Translation service temporarily unavailable",
          original_text: contextPayload?.question || '',
          translated_text: null,
          is_translation: true
        };
      }

      const q = (contextPayload?.question || '').toLowerCase();
      const ctx = contextPayload?.context || {};
      
      if (ctx.headline && ctx.headline.includes("Scheme")) {
        return {
          explanation_text: `${ctx.headline}\n\n${ctx.reasoning || ''}\n\n${ctx.ai_explanation || ''}\n\nNote: Scheme eligibility is evaluated deterministically without guessing.`,
          provider_used: "Rule Engine Fallback (Offline)",
          action_steps: [
            "Verify required land records (7/12 extract / RoR)",
            "Ensure bank account is Aadhaar-seeded for DBT",
            "Apply via official portal link"
          ],
          confidence: 95
        };
      }

      if (ctx.headline && ctx.headline.includes("Mandi")) {
        return {
          explanation_text: `${ctx.headline}\n\n${ctx.reasoning || ''}\n\n${ctx.ai_explanation || 'Compare local mandi rates with announced MSP before selling.'}`,
          provider_used: "Rule Engine Fallback (Offline)",
          action_steps: [
            "Check daily APMC modal arrival rates before dispatch",
            "Maintain proper grain moisture to avoid price deductions"
          ],
          confidence: 95
        };
      }

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
