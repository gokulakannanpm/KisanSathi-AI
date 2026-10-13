import React from 'react';
import { 
  Sprout, 
  Globe, 
  Sparkles, 
  MapPin, 
  Wifi, 
  WifiOff, 
  UserCheck,
  LogIn,
  LogOut,
  UserPlus,
  Sliders,
  ShieldCheck
} from 'lucide-react';
import { useFarmer } from '../context/FarmerContext';
import { useAuth } from '../context/AuthContext';
import { DEMO_FARMERS, SUPPORTED_LANGUAGES } from '../config/constants';

export const Header = () => {
  const { 
    farmerId,
    demoFarmerId,
    switchFarmer,
    language, 
    setLanguage, 
    t, 
    farmer, 
    isBackendConnected,
    openAiExplainer 
  } = useFarmer();

  const {
    user,
    isAuthenticated,
    isDemoMode,
    logout,
    switchToDemo,
    switchToRegistered,
    openLogin,
    openRegister
  } = useAuth();

  return (
    <header style={{
      background: 'var(--bg-header-gradient)',
      color: 'white',
      padding: '0.85rem 1.25rem',
      boxShadow: '0 4px 16px rgba(15, 57, 34, 0.35)',
      position: 'sticky',
      top: 0,
      zIndex: 40
    }}>
      <div style={{
        maxWidth: '1120px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        {/* Left: Brand logo & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            background: '#ffffff',
            color: 'var(--primary-dark)',
            borderRadius: '12px',
            width: '42px',
            height: '42px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}>
            <Sprout size={26} strokeWidth={2.5} color="#15803d" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ 
                fontSize: '1.25rem', 
                fontWeight: 800, 
                letterSpacing: '-0.02em',
                lineHeight: 1.1 
              }}>
                {t.appTitle}
              </h1>
              <span style={{
                background: 'rgba(255,255,255,0.2)',
                color: '#86efac',
                fontSize: '0.65rem',
                fontWeight: 800,
                padding: '0.15rem 0.45rem',
                borderRadius: '999px',
                letterSpacing: '0.05em'
              }}>
                {!isDemoMode && isAuthenticated ? 'PERSONAL' : 'SIMULATOR'}
              </span>
            </div>
            <p style={{ 
              fontSize: '0.75rem', 
              color: 'rgba(255, 255, 255, 0.8)',
              fontWeight: 500 
            }}>
              {t.tagline}
            </p>
          </div>
        </div>

        {/* Right: Farmer Identity, Auth Controls, Backend indicator & Language Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          
          {/* Identity & Mode Badge / Selector */}
          {!isDemoMode && isAuthenticated ? (
            /* Logged-in Registered Farmer Badge */
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: 'rgba(34, 197, 94, 0.25)',
              border: '1px solid #4ade80',
              borderRadius: '999px',
              padding: '0.25rem 0.75rem',
              color: 'white',
              fontSize: '0.82rem',
              fontWeight: 700
            }}>
              <ShieldCheck size={16} color="#86efac" />
              <span>{farmer?.name || user?.name}</span>
              <span style={{
                background: '#15803d',
                color: '#dcfce7',
                fontSize: '0.68rem',
                padding: '0.1rem 0.4rem',
                borderRadius: '999px',
                fontWeight: 800
              }}>
                {farmer?.district || 'My Farm'}
              </span>
            </div>
          ) : (
            /* Demo Mode: Dropdown Selector for 4 Demo Profiles */
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.18)',
              borderRadius: '999px',
              padding: '0.25rem 0.65rem',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
            }}>
              <UserCheck size={15} style={{ marginRight: '0.35rem', color: '#86efac' }} />
              <select
                value={demoFarmerId}
                onChange={(e) => switchFarmer(e.target.value)}
                aria-label="Select Demo Farmer Profile"
                style={{
                  background: 'transparent',
                  color: 'white',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {DEMO_FARMERS.map((f) => (
                  <option 
                    key={f.id} 
                    value={f.id} 
                    style={{ color: '#0f172a', background: '#ffffff', fontWeight: 600 }}
                  >
                    {f.name} ({f.location} - {f.land})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Mode Switchers & Auth Buttons */}
          {!isDemoMode && isAuthenticated ? (
            /* Registered user controls */
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <button
                onClick={() => switchToDemo()}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.3rem 0.65rem',
                  borderRadius: '999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  cursor: 'pointer'
                }}
                title="Switch to Demo Simulator Mode"
              >
                <Sliders size={13} color="#fde047" />
                <span>{t.demoMode || 'Demo Mode'}</span>
              </button>

              <button
                onClick={() => logout()}
                style={{
                  background: 'rgba(239, 68, 68, 0.25)',
                  border: '1px solid #f87171',
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.3rem 0.65rem',
                  borderRadius: '999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  cursor: 'pointer'
                }}
                title="Log Out"
              >
                <LogOut size={13} />
                <span>{t.logout || 'Logout'}</span>
              </button>
            </div>
          ) : (
            /* Demo mode controls: Login / Register */
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {isAuthenticated ? (
                <button
                  onClick={() => switchToRegistered()}
                  style={{
                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    border: '1px solid #86efac',
                    color: 'white',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    padding: '0.35rem 0.75rem',
                    borderRadius: '999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    cursor: 'pointer'
                  }}
                >
                  <ShieldCheck size={14} color="#86efac" />
                  <span>{t.myFarmProfile || 'My Farm Profile'}</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => openLogin()}
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      border: '1px solid rgba(255, 255, 255, 0.4)',
                      color: 'white',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      padding: '0.35rem 0.75rem',
                      borderRadius: '999px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      cursor: 'pointer'
                    }}
                  >
                    <LogIn size={13} />
                    <span>{t.login || 'Log In'}</span>
                  </button>

                  <button
                    onClick={() => openRegister()}
                    style={{
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      border: '1px solid #86efac',
                      color: 'white',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      padding: '0.35rem 0.75rem',
                      borderRadius: '999px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)'
                    }}
                  >
                    <UserPlus size={13} />
                    <span>{t.register || 'Register'}</span>
                  </button>
                </>
              )}
            </div>
          )}

          {/* Backend Connection Indicator */}
          <div 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: isBackendConnected ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.25)',
              border: `1px solid ${isBackendConnected ? '#4ade80' : '#fbbf24'}`,
              color: 'white',
              padding: '0.3rem 0.65rem',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 700
            }}
            title={isBackendConnected ? t.statusLiveBackend : t.statusMockBackend}
          >
            {isBackendConnected ? (
              <>
                <Wifi size={13} color="#4ade80" />
                <span>FastAPI Live</span>
              </>
            ) : (
              <>
                <WifiOff size={13} color="#fbbf24" />
                <span>Farm Memory</span>
              </>
            )}
          </div>

          {/* Ask AI Trigger Button */}
          <button
            onClick={() => openAiExplainer()}
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white',
              fontWeight: 700,
              fontSize: '0.8rem',
              padding: '0.4rem 0.85rem',
              borderRadius: '999px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              boxShadow: '0 2px 8px rgba(217, 119, 6, 0.4)'
            }}
            title="Ask KisanSathi AI Assistant"
          >
            <Sparkles size={14} />
            <span>{t.askAiButton}</span>
          </button>

          {/* Language Selector Dropdown */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '999px',
            padding: '0.2rem 0.5rem',
            border: '1px solid rgba(255, 255, 255, 0.3)'
          }}>
            <Globe size={15} style={{ marginRight: '0.35rem', opacity: 0.9 }} />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              aria-label="Select Language"
              style={{
                background: 'transparent',
                color: 'white',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option 
                  key={lang.code} 
                  value={lang.code} 
                  style={{ color: '#0f172a', background: '#ffffff', fontWeight: 600 }}
                >
                  {lang.nativeName} ({lang.code.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>
    </header>
  );
};
