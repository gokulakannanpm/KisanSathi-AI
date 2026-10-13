import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  Phone, 
  Eye, 
  EyeOff, 
  Loader2, 
  Sprout, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFarmer } from '../../context/FarmerContext';

export const LoginModal = () => {
  const { isLoginOpen, closeLogin, openRegister, login, authLoading, authError, setAuthError } = useAuth();
  const { t } = useFarmer();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localValidation, setLocalValidation] = useState('');

  if (!isLoginOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalValidation('');
    setAuthError(null);

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setLocalValidation(t.invalidMobileFormat || 'Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!password) {
      setLocalValidation(t.passwordRequired || 'Please enter your password.');
      return;
    }

    try {
      await login(phone, password);
    } catch {
      // Error handled in auth context
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '1rem'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        maxWidth: '440px',
        width: '100%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #092e1b 0%, #15803d 100%)',
          color: 'white',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '8px',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sprout size={22} color="#15803d" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                {t.farmerLogin || 'Farmer Login'}
              </h2>
              <p style={{ fontSize: '0.75rem', opacity: 0.85, margin: 0 }}>
                {t.loginSubtitle || 'Access your persistent farm records & advisory'}
              </p>
            </div>
          </div>
          <button
            onClick={closeLogin}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Error Banner */}
          {(authError || localValidation) && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertCircle size={18} flexShrink={0} />
              <span>{localValidation || authError}</span>
            </div>
          )}

          {/* Mobile Number Field */}
          <div>
            <label style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#1e293b',
              display: 'block',
              marginBottom: '0.35rem'
            }}>
              {t.mobileNumber || 'Registered Mobile Number'}
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              border: '1.5px solid #cbd5e1',
              borderRadius: '8px',
              overflow: 'hidden',
              background: '#f8fafc',
              transition: 'border-color 0.2s'
            }}>
              <span style={{
                padding: '0.65rem 0.75rem',
                fontSize: '0.9rem',
                fontWeight: 700,
                color: '#475569',
                borderRight: '1px solid #cbd5e1',
                background: '#f1f5f9'
              }}>
                +91
              </span>
              <input
                type="tel"
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={10}
                style={{
                  flex: 1,
                  border: 'none',
                  padding: '0.65rem 0.75rem',
                  fontSize: '0.95rem',
                  outline: 'none',
                  background: 'transparent',
                  color: '#0f172a',
                  fontWeight: 600
                }}
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#1e293b',
              display: 'block',
              marginBottom: '0.35rem'
            }}>
              {t.password || 'Password'}
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              border: '1.5px solid #cbd5e1',
              borderRadius: '8px',
              padding: '0 0.5rem',
              background: '#f8fafc'
            }}>
              <Lock size={18} color="#64748b" style={{ marginRight: '0.4rem' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  flex: 1,
                  border: 'none',
                  padding: '0.65rem 0.25rem',
                  fontSize: '0.95rem',
                  outline: 'none',
                  background: 'transparent',
                  color: '#0f172a'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={authLoading}
            style={{
              background: 'linear-gradient(135deg, #166534 0%, #15803d 100%)',
              color: 'white',
              border: 'none',
              padding: '0.75rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: authLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginTop: '0.5rem',
              boxShadow: '0 2px 6px rgba(21, 128, 61, 0.3)'
            }}
          >
            {authLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>{t.loggingIn || 'Verifying credentials...'}</span>
              </>
            ) : (
              <span>{t.loginButton || 'Log In'}</span>
            )}
          </button>

          {/* Register & Demo Switch Links */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.6rem',
            marginTop: '0.5rem',
            fontSize: '0.85rem'
          }}>
            <div>
              <span style={{ color: '#64748b' }}>{t.dontHaveAccount || "New farmer to KisanSathi?"}{' '}</span>
              <button
                type="button"
                onClick={openRegister}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#15803d',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline'
                }}
              >
                {t.registerHere || 'Register your farm'}
              </button>
            </div>

            <button
              type="button"
              onClick={closeLogin}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                fontSize: '0.8rem',
                cursor: 'pointer',
                padding: '4px 8px'
              }}
            >
              {t.continueInDemo || '← Continue in Demo Simulator Mode'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
