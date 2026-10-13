import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  Phone, 
  User, 
  MapPin, 
  Sprout, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle, 
  Globe, 
  Check, 
  Layers 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFarmer } from '../../context/FarmerContext';

const COMMON_CROPS = [
  "Paddy", "Cotton", "Sugarcane", "Wheat", "Soybean", 
  "Groundnut", "Maize", "Banana", "Turmeric", "Tomato", 
  "Onion", "Chilli", "Mustard"
];

const SOIL_OPTIONS = [
  "Black Cotton Soil (Regur)",
  "Red Soil / Sandy Loam",
  "Clay Loam Soil",
  "Alluvial Soil",
  "Laterite Soil"
];

export const RegisterModal = () => {
  const { isRegisterOpen, closeRegister, openLogin, register, authLoading, authError, setAuthError } = useAuth();
  const { t } = useFarmer();

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [state, setState] = useState('Tamil Nadu');
  const [district, setDistrict] = useState('');
  const [village, setVillage] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('en');

  const [landSizeAcres, setLandSizeAcres] = useState('2.5');
  const [ownsLand, setOwnsLand] = useState(true);
  const [selectedCrops, setSelectedCrops] = useState(['Paddy']);
  const [customCrop, setCustomCrop] = useState('');
  const [hasIrrigation, setHasIrrigation] = useState(true);
  const [irrigationType, setIrrigationType] = useState('Borewell');
  const [soilType, setSoilType] = useState('Clay Loam Soil');
  const [age, setAge] = useState('40');

  const [localValidation, setLocalValidation] = useState('');

  if (!isRegisterOpen) return null;

  const toggleCrop = (cropName) => {
    setSelectedCrops(prev => 
      prev.includes(cropName) 
        ? prev.filter(c => c !== cropName)
        : [...prev, cropName]
    );
  };

  const addCustomCrop = (e) => {
    e.preventDefault();
    if (customCrop.trim() && !selectedCrops.includes(customCrop.trim())) {
      setSelectedCrops(prev => [...prev, customCrop.trim()]);
      setCustomCrop('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalValidation('');
    setAuthError(null);

    if (!name.trim()) {
      setLocalValidation(t.nameRequired || 'Please enter your full name.');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setLocalValidation(t.invalidMobileFormat || 'Please enter a valid 10-digit mobile number.');
      return;
    }

    if (password.length < 6) {
      setLocalValidation(t.passwordMinLength || 'Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalValidation(t.passwordMismatch || 'Passwords do not match.');
      return;
    }

    if (!state.trim() || !district.trim()) {
      setLocalValidation(t.locationRequired || 'Please provide both State and District.');
      return;
    }

    const acres = parseFloat(landSizeAcres);
    if (isNaN(acres) || acres <= 0 || acres > 1000) {
      setLocalValidation(t.invalidLandSize || 'Please enter a valid land size between 0.1 and 1000 acres.');
      return;
    }

    if (selectedCrops.length === 0) {
      setLocalValidation(t.cropsRequired || 'Please select at least one main crop.');
      return;
    }

    const payload = {
      name: name.trim(),
      phone: cleanPhone,
      password,
      confirm_password: confirmPassword,
      state: state.trim(),
      district: district.trim(),
      village: village.trim() || null,
      preferred_language: preferredLanguage,
      land_size_acres: acres,
      owns_land: ownsLand,
      crops: selectedCrops.map(c => c.toLowerCase()),
      has_irrigation: hasIrrigation,
      irrigation_type: hasIrrigation ? irrigationType : null,
      soil_type: soilType,
      age: parseInt(age, 10) || 40
    };

    try {
      await register(payload);
    } catch {
      // Error caught and displayed via authError
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
      padding: '1rem',
      overflowY: 'auto'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        maxWidth: '680px',
        width: '100%',
        maxHeight: '90vh',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #092e1b 0%, #15803d 100%)',
          color: 'white',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
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
              <Sprout size={24} color="#15803d" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                {t.farmerRegistration || 'New Farmer Registration'}
              </h2>
              <p style={{ fontSize: '0.75rem', opacity: 0.85, margin: 0 }}>
                {t.registerSubtitle || 'Set up your persistent farm profile for personalized intelligence'}
              </p>
            </div>
          </div>
          <button
            onClick={closeRegister}
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

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} style={{
          padding: '1.5rem',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          
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

          {/* Section 1: Account & Credentials */}
          <div>
            <h3 style={{
              fontSize: '0.95rem',
              fontWeight: 800,
              color: '#0f172a',
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: '0.35rem'
            }}>
              <User size={16} color="#15803d" />
              <span>{t.accountDetails || '1. Account & Security'}</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                  {t.fullName || 'Full Name'} *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                  {t.mobileNumber || 'Mobile Number'} *
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  background: '#f8fafc'
                }}>
                  <span style={{ padding: '0.6rem 0.65rem', background: '#f1f5f9', fontWeight: 700, fontSize: '0.85rem', color: '#475569' }}>
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
                      padding: '0.6rem 0.65rem',
                      fontSize: '0.9rem',
                      outline: 'none',
                      background: 'transparent'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                  {t.password || 'Password (min 6 characters)'} *
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0 0.5rem',
                  background: '#f8fafc'
                }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ flex: 1, border: 'none', padding: '0.6rem 0', fontSize: '0.9rem', outline: 'none', background: 'transparent' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                  {t.confirmPassword || 'Confirm Password'} *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Location & Language */}
          <div>
            <h3 style={{
              fontSize: '0.95rem',
              fontWeight: 800,
              color: '#0f172a',
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: '0.35rem'
            }}>
              <MapPin size={16} color="#15803d" />
              <span>{t.locationAndLanguage || '2. Location & Language'}</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                  {t.state || 'State'} *
                </label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.9rem',
                    background: '#ffffff'
                  }}
                >
                  <option value="Tamil Nadu">Tamil Nadu</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Gujarat">Gujarat</option>
                  <option value="Punjab">Punjab</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Andhra Pradesh">Andhra Pradesh</option>
                  <option value="Telangana">Telangana</option>
                  <option value="Madhya Pradesh">Madhya Pradesh</option>
                  <option value="Uttar Pradesh">Uttar Pradesh</option>
                  <option value="Rajasthan">Rajasthan</option>
                  <option value="Haryana">Haryana</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                  {t.district || 'District'} *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Madurai, Nagpur, Rajkot"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                  {t.village || 'Village / Town'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Melur"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                  {t.preferredLanguage || 'Preferred Language'} *
                </label>
                <select
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.9rem',
                    background: '#ffffff'
                  }}
                >
                  <option value="en">English</option>
                  <option value="ta">தமிழ் (Tamil)</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                  <option value="mr">मराठी (Marathi)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Farm & Agricultural Details */}
          <div>
            <h3 style={{
              fontSize: '0.95rem',
              fontWeight: 800,
              color: '#0f172a',
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: '0.35rem'
            }}>
              <Sprout size={16} color="#15803d" />
              <span>{t.farmDetails || '3. Farm & Cultivation Details'}</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                  {t.landHolding || 'Operational Land Holding (Acres)'} *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="1000"
                  value={landSizeAcres}
                  onChange={(e) => setLandSizeAcres(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                  {t.landOwnership || 'Land Ownership Status'}
                </label>
                <select
                  value={ownsLand ? 'owner' : 'tenant'}
                  onChange={(e) => setOwnsLand(e.target.value === 'owner')}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.9rem',
                    background: '#ffffff'
                  }}
                >
                  <option value="owner">{t.ownerFarmer || 'Owner Cultivator (Owns Land)'}</option>
                  <option value="tenant">{t.tenantFarmer || 'Tenant / Sharecropper'}</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                  {t.irrigationStatus || 'Assured Irrigation Availability'}
                </label>
                <select
                  value={hasIrrigation ? 'yes' : 'no'}
                  onChange={(e) => setHasIrrigation(e.target.value === 'yes')}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.9rem',
                    background: '#ffffff'
                  }}
                >
                  <option value="yes">{t.hasIrrigationYes || 'Yes, Assured Irrigation'}</option>
                  <option value="no">{t.rainfedOnly || 'Rainfed Only (No Assured Source)'}</option>
                </select>
              </div>

              {hasIrrigation && (
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                    {t.irrigationType || 'Irrigation Source'}
                  </label>
                  <select
                    value={irrigationType}
                    onChange={(e) => setIrrigationType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.9rem',
                      background: '#ffffff'
                    }}
                  >
                    <option value="Borewell + Drip">Borewell + Drip System</option>
                    <option value="Borewell">Borewell Only</option>
                    <option value="Canal Irrigation">Canal Irrigation</option>
                    <option value="Open Well + Sprinkler">Open Well + Sprinkler</option>
                    <option value="River / Lake Lift">River / Lake Lift</option>
                  </select>
                </div>
              )}
            </div>

            {/* Crops Tag Selector */}
            <div style={{ marginTop: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                {t.cropsCultivated || 'Main Crops Cultivated'} *
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
                {COMMON_CROPS.map(c => {
                  const isSel = selectedCrops.includes(c);
                  return (
                    <button
                      type="button"
                      key={c}
                      onClick={() => toggleCrop(c)}
                      style={{
                        background: isSel ? '#15803d' : '#f1f5f9',
                        color: isSel ? '#ffffff' : '#334155',
                        border: isSel ? '1px solid #166534' : '1px solid #cbd5e1',
                        borderRadius: '999px',
                        padding: '0.3rem 0.75rem',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      {isSel && <Check size={12} />}
                      <span>{c}</span>
                    </button>
                  );
                })}
              </div>

              {/* Add Custom Crop input */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Add other crop..."
                  value={customCrop}
                  onChange={(e) => setCustomCrop(e.target.value)}
                  style={{
                    maxWidth: '200px',
                    padding: '0.4rem 0.65rem',
                    borderRadius: '6px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.85rem'
                  }}
                />
                <button
                  type="button"
                  onClick={addCustomCrop}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Optional Details: Soil Type & Age */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                  {t.soilType || 'Soil Type (Optional)'}
                </label>
                <select
                  value={soilType}
                  onChange={(e) => setSoilType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.9rem',
                    background: '#ffffff'
                  }}
                >
                  {SOIL_OPTIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                  {t.farmerAge || 'Farmer Age / Experience (Years)'}
                </label>
                <input
                  type="number"
                  min="18"
                  max="100"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              type="submit"
              disabled={authLoading}
              style={{
                background: 'linear-gradient(135deg, #166534 0%, #15803d 100%)',
                color: 'white',
                border: 'none',
                padding: '0.85rem',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '1rem',
                cursor: authLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(21, 128, 61, 0.35)'
              }}
            >
              {authLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>{t.registeringFarmer || 'Creating Farm Profile...'}</span>
                </>
              ) : (
                <span>{t.registerSubmitButton || 'Register Farm & Continue'}</span>
              )}
            </button>

            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <span style={{ color: '#64748b' }}>{t.alreadyRegistered || 'Already registered?'}</span>
              <button
                type="button"
                onClick={openLogin}
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
                {t.loginHere || 'Log in here'}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
