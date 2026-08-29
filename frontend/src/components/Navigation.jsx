import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  CloudSun, 
  TrendingUp, 
  BookOpen, 
  User 
} from 'lucide-react';
import { useFarmer } from '../context/FarmerContext';

export const Navigation = () => {
  const { activeTab, setActiveTab, t } = useFarmer();

  const navItems = [
    { id: 'dashboard', label: t.navDashboard, icon: LayoutDashboard },
    { id: 'schemes', label: t.navSchemes, icon: FileText },
    { id: 'weather', label: t.navWeather, icon: CloudSun },
    { id: 'mandi', label: t.navMandi, icon: TrendingUp },
    { id: 'diary', label: t.navDiary, icon: BookOpen },
    { id: 'profile', label: t.navProfile, icon: User }
  ];

  return (
    <>
      {/* Desktop Top Tabs (Rendered in header or top of content) */}
      <div style={{
        background: '#ffffff',
        borderBottom: '1px solid var(--border-subtle)'
      }} className="desktop-nav-container">
        <div style={{
          maxWidth: '1120px',
          margin: '0 auto',
          display: 'flex',
          gap: '0.5rem',
          padding: '0.5rem 1rem'
        }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1.1rem',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  color: isActive ? '#15803d' : '#64748b',
                  background: isActive ? '#dcfce7' : 'transparent',
                  border: isActive ? '1px solid #86efac' : '1px solid transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav" aria-label="Main Navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
