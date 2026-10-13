import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { translations } from '../services/i18n';
import { DEFAULT_FARMER_ID } from '../config/constants';
import { useAuth } from './AuthContext';

const FarmerContext = createContext();

export const FarmerProvider = ({ children }) => {
  const { user, isDemoMode, isAuthenticated } = useAuth();
  const [demoFarmerId, setDemoFarmerId] = useState(DEFAULT_FARMER_ID);
  
  // Effective active farmer ID: derived from auth user when registered, or demoFarmerId when in demo mode
  const effectiveFarmerId = (!isDemoMode && user?.farmer_id) ? user.farmer_id : demoFarmerId;

  const [language, setLanguage] = useState('en');
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [farmer, setFarmer] = useState(null);
  const [diary, setDiary] = useState([]);
  const [weather, setWeather] = useState(null);
  const [mandiPrices, setMandiPrices] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [schemes, setSchemes] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiModalContext, setAiModalContext] = useState(null);

  // On-Demand Crop Planning State (Never runs automatically on page load)
  const [isCropPlannerOpen, setIsCropPlannerOpen] = useState(false);
  const [cropPlanData, setCropPlanData] = useState(null);
  const [cropPlanLoading, setCropPlanLoading] = useState(false);

  // Sync preferred language from registered user when logged in
  useEffect(() => {
    if (!isDemoMode && user?.preferred_language) {
      setLanguage(user.preferred_language);
    }
  }, [user, isDemoMode]);

  // Load all initial data for active farmer and language
  const loadData = async (lang = language, targetFarmerId = effectiveFarmerId) => {
    setLoading(true);
    try {
      const [profileData, diaryData, weatherData, mandiData, recData, schemesData] = await Promise.all([
        apiService.getFarmerProfile(targetFarmerId),
        apiService.getDiaryEntries(targetFarmerId),
        apiService.getCurrentWeather(targetFarmerId),
        apiService.getMandiPrices({ farmer_id: targetFarmerId }),
        apiService.getRecommendation(targetFarmerId),
        apiService.getSchemes(targetFarmerId, lang)
      ]);

      setFarmer(profileData);
      setDiary(diaryData || []);
      setWeather(weatherData);
      setMandiPrices(mandiData || []);
      setRecommendation(recData);
      setSchemes(schemesData || []);
      setIsBackendConnected(apiService.getBackendStatus());
    } catch (err) {
      console.error("Error loading KisanSathi data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(language, effectiveFarmerId);
  }, [language, effectiveFarmerId, isDemoMode]);

  // Switch Active Farmer (Multi-Farmer Personalization for demo mode)
  const switchFarmer = (newFarmerId) => {
    setDemoFarmerId(newFarmerId);
  };

  // Add Diary Entry
  const addDiaryEntry = async (entry) => {
    const saved = await apiService.addDiaryEntry(effectiveFarmerId, entry);
    setDiary(prev => [saved, ...prev]);
    return saved;
  };

  // Acknowledge / Postpone Recommendation Action
  const acknowledgeRecommendationAction = async (payload = {}) => {
    const ackRes = await apiService.acknowledgeAction(effectiveFarmerId, payload);
    setRecommendation(prev => ({
      ...prev,
      is_acknowledged: true,
      acknowledged_status: ackRes.status || 'postponed',
      status_label: `Acknowledged & Rescheduled`
    }));
    return ackRes;
  };

  // Update Farmer Profile: persists to database for registered users, updates in-memory for demo simulator
  const updateFarmerProfile = async (updatedFields) => {
    if (!isDemoMode && user) {
      try {
        const persisted = await apiService.updateFarmerProfile(updatedFields);
        setFarmer(persisted);
        if (persisted.preferred_language) {
          setLanguage(persisted.preferred_language);
        }
        return persisted;
      } catch (err) {
        console.error("Failed to update farmer profile in DB:", err);
        throw err;
      }
    } else {
      setFarmer(prev => ({
        ...prev,
        ...updatedFields
      }));
    }
  };

  // Open AI Explainer Modal
  const openAiExplainer = (context = null) => {
    setAiModalContext(context || recommendation);
    setIsAiModalOpen(true);
  };

  const closeAiExplainer = () => {
    setIsAiModalOpen(false);
    setAiModalContext(null);
  };

  // On-Demand Crop Planning (Runs ONLY upon explicit farmer invocation)
  const openCropPlanner = async (options = {}) => {
    setIsCropPlannerOpen(true);
    setCropPlanLoading(true);
    try {
      const data = await apiService.getCropPlan(effectiveFarmerId, {
        state: farmer?.state,
        district: farmer?.district,
        land_size_acres: farmer?.land_size_acres,
        soil_type: farmer?.soil_type,
        has_irrigation: farmer?.has_irrigation,
        ...options
      });
      setCropPlanData(data);
    } catch (err) {
      console.error("Failed to generate crop plan:", err);
    } finally {
      setCropPlanLoading(false);
    }
  };

  const closeCropPlanner = () => {
    setIsCropPlannerOpen(false);
  };

  // Multilingual text lookup with fallback
  const t = translations[language] || translations.en;

  return (
    <FarmerContext.Provider value={{
      farmerId: effectiveFarmerId,
      demoFarmerId,
      switchFarmer,
      isDemoMode,
      isAuthenticated,
      language,
      setLanguage,
      t,
      activeTab,
      setActiveTab,
      farmer,
      updateFarmerProfile,
      diary,
      addDiaryEntry,
      weather,
      mandiPrices,
      setMandiPrices,
      recommendation,
      acknowledgeRecommendationAction,
      schemes,
      loading,
      refreshData: () => loadData(language, effectiveFarmerId),
      isBackendConnected,
      selectedScheme,
      setSelectedScheme,
      isAiModalOpen,
      openAiExplainer,
      closeAiExplainer,
      aiModalContext,
      // Crop planner
      isCropPlannerOpen,
      openCropPlanner,
      closeCropPlanner,
      cropPlanData,
      cropPlanLoading
    }}>
      {children}
    </FarmerContext.Provider>
  );
};

export const useFarmer = () => {
  const context = useContext(FarmerContext);
  if (!context) {
    throw new Error('useFarmer must be used within a FarmerProvider');
  }
  return context;
};
