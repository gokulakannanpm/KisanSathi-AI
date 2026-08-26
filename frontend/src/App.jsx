import React, { useState } from 'react';
import { useFarmer } from './context/FarmerContext';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { ConnectiveLoopVisualizer } from './components/Dashboard/ConnectiveLoopVisualizer';
import { HeroRecommendation } from './components/Dashboard/HeroRecommendation';
import { WeatherSnapshot } from './components/Dashboard/WeatherSnapshot';
import { MandiSnapshot } from './components/Dashboard/MandiSnapshot';
import { DiarySnapshot } from './components/Dashboard/DiarySnapshot';
import { WeatherView } from './components/Weather/WeatherView';
import { MandiView } from './components/Mandi/MandiView';
import { SchemesView } from './components/Schemes/SchemesView';
import { SchemeDetailModal } from './components/Schemes/SchemeDetailModal';
import { FarmDiary } from './components/Diary/FarmDiary';
import { AddDiaryModal } from './components/Diary/AddDiaryModal';
import { FarmerProfile } from './components/Profile/FarmerProfile';
import { AIExplainerModal } from './components/AI/AIExplainerModal';
import { Loader2 } from 'lucide-react';
import './App.css';

export function App() {
  const { activeTab, loading } = useFarmer();
  const [isAddDiaryOpen, setIsAddDiaryOpen] = useState(false);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        background: '#f8fafc'
      }}>
        <Loader2 size={40} className="animate-spin" color="#15803d" />
        <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#0f172a' }}>
          Connecting KisanSathi AI Farm Memory...
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* App Top Bar */}
      <Header />

      {/* Navigation (Tabs for Desktop, Bottom Bar for Mobile) */}
      <Navigation />

      {/* Main View Area */}
      <main className="app-main-content">
        
        {/* Tab: Dashboard (The Hero Experience) */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* The Connective Loop Explainer Strip */}
            <ConnectiveLoopVisualizer />

            {/* The Hero Recommendation Element */}
            <HeroRecommendation />

            {/* Supporting Context Grid (Live Weather & Mandi directly beside recommendation) */}
            <div className="grid-2">
              <WeatherSnapshot />
              <MandiSnapshot />
            </div>

            {/* Farm Diary & Operations Scheduled */}
            <DiarySnapshot onAddEntryClick={() => setIsAddDiaryOpen(true)} />
          </div>
        )}

        {/* Tab: Schemes */}
        {activeTab === 'schemes' && <SchemesView />}

        {/* Tab: Weather */}
        {activeTab === 'weather' && <WeatherView />}

        {/* Tab: Mandi */}
        {activeTab === 'mandi' && <MandiView />}

        {/* Tab: Farm Diary */}
        {activeTab === 'diary' && (
          <FarmDiary onAddEntryClick={() => setIsAddDiaryOpen(true)} />
        )}

        {/* Tab: Profile & Simulator */}
        {activeTab === 'profile' && <FarmerProfile />}

      </main>

      {/* Modals & Overlays */}
      <SchemeDetailModal />
      <AddDiaryModal 
        isOpen={isAddDiaryOpen} 
        onClose={() => setIsAddDiaryOpen(false)} 
      />
      <AIExplainerModal />

    </div>
  );
}

export default App;
