import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { translations } from '../services/i18n';
import { DEFAULT_FARMER_ID } from '../config/constants';

const FarmerContext = createContext();

export const FarmerProvider = ({ children }) => {
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

  // Load all initial data
  const loadData = async (lang = language) => {
    setLoading(true);
    try {
      const [profileData, diaryData, weatherData, mandiData, recData, schemesData] = await Promise.all([
        apiService.getFarmerProfile(DEFAULT_FARMER_ID),
        apiService.getDiaryEntries(DEFAULT_FARMER_ID),
        apiService.getCurrentWeather(DEFAULT_FARMER_ID),
        apiService.getMandiPrices(),
        apiService.getRecommendation(DEFAULT_FARMER_ID),
        apiService.getSchemes(DEFAULT_FARMER_ID, lang)
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
    loadData(language);
  }, [language]);

  // Add Diary Entry
  const addDiaryEntry = async (entry) => {
    const saved = await apiService.addDiaryEntry(DEFAULT_FARMER_ID, entry);
    setDiary(prev => [saved, ...prev]);
    return saved;
  };

  // Update Farmer Profile locally (e.g. for simulator)
  const updateFarmerProfile = (updatedFields) => {
    setFarmer(prev => ({
      ...prev,
      ...updatedFields
    }));
  };

  // Open AI Explainer
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
      schemes,
      loading,
      refreshData: () => loadData(language),
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
