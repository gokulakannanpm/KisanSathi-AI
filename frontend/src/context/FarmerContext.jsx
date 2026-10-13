import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { translations } from '../services/i18n';
import { DEFAULT_FARMER_ID } from '../config/constants';

const FarmerContext = createContext();

export const FarmerProvider = ({ children }) => {
  const [farmerId, setFarmerId] = useState(DEFAULT_FARMER_ID);
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

  // Load all initial data for a specific farmer and language
  const loadData = async (lang = language, targetFarmerId = farmerId) => {
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
    loadData(language, farmerId);
  }, [language, farmerId]);

  // Switch Active Farmer (Multi-Farmer Personalization)
  const switchFarmer = (newFarmerId) => {
    setFarmerId(newFarmerId);
  };

  // Add Diary Entry
  const addDiaryEntry = async (entry) => {
    const saved = await apiService.addDiaryEntry(farmerId, entry);
    setDiary(prev => [saved, ...prev]);
    return saved;
  };

  // Acknowledge / Postpone Recommendation Action
  const acknowledgeRecommendationAction = async (payload = {}) => {
    const ackRes = await apiService.acknowledgeAction(farmerId, payload);
    setRecommendation(prev => ({
      ...prev,
      is_acknowledged: true,
      acknowledged_status: ackRes.status || 'postponed',
      status_label: `Acknowledged & Rescheduled`
    }));
    return ackRes;
  };

  // Update Farmer Profile locally (e.g. for simulator)
  const updateFarmerProfile = (updatedFields) => {
    setFarmer(prev => ({
      ...prev,
      ...updatedFields
    }));
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
      const data = await apiService.getCropPlan(farmerId, {
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
      farmerId,
      switchFarmer,
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
      refreshData: () => loadData(language, farmerId),
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
