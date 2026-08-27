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

  // Load all initial data for a specific farmer and language
  const loadData = async (lang = language, targetFarmerId = farmerId) => {
    setLoading(true);
    try {
      const [profileData, diaryData, weatherData, mandiData, recData, schemesData] = await Promise.all([
        apiService.getFarmerProfile(targetFarmerId),
        apiService.getDiaryEntries(targetFarmerId),
        apiService.getCurrentWeather(targetFarmerId),
        apiService.getMandiPrices(),
        apiService.getRecommendation(targetFarmerId),
        apiService.getSchemes(targetFarmerId, lang)
      ]);

      setFarmer(profileData);
      setDiary(diaryData);
      setWeather(weatherData);
      setMandiPrices(mandiData);
      setRecommendation(recData);
      setSchemes(schemesData);
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

  // Multilingual text lookup
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
      aiModalContext
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
