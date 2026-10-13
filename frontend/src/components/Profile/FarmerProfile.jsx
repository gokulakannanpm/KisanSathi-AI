import React, { useState, useEffect } from 'react';
import { 
  User, 
  MapPin, 
  Sprout, 
  Sliders, 
  RefreshCw, 
  ShieldCheck, 
  Edit3, 
  Save, 
  Check, 
  Plus, 
  X, 
  Phone, 
  Globe, 
  Sparkles, 
  AlertCircle 
} from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';
import { useAuth } from '../../context/AuthContext';

const COMMON_CROP_OPTIONS = [
  "Paddy", "Cotton", "Sugarcane", "Wheat", "Soybean", 
  "Groundnut", "Maize", "Banana", "Turmeric", "Tomato", 
  "Onion", "Chilli", "Mustard"
];

export const FarmerProfile = () => {
  const { farmer, updateFarmerProfile, t, isDemoMode, isAuthenticated, language, setLanguage } = useFarmer();
  const { openRegister } = useAuth();

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [acres, setAcres] = useState(2.5);
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');
  const [prefLang, setPrefLang] = useState('en');
  const [crops, setCrops] = useState([]);
  const [newCropInput, setNewCropInput] = useState('');
  const [ownsLand, setOwnsLand] = useState(true);
  const [hasIrrigation, setHasIrrigation] = useState(true);
  const [irrigationType, setIrrigationType] = useState('Borewell');
  const [soilType, setSoilType] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Sync state with farmer data
  useEffect(() => {
    if (farmer) {
      setName(farmer.name || '');
      setAcres(farmer.land_size_acres || 2.5);
      setVillage(farmer.village || '');
      setDistrict(farmer.district || '');
      setPrefLang(farmer.preferred_language || language || 'en');
      setCrops(farmer.crops || []);
      setOwnsLand(farmer.owns_land ?? true);
      setHasIrrigation(farmer.has_irrigation ?? true);
      setIrrigationType(farmer.irrigation_type || 'Borewell');
      setSoilType(farmer.soil_type || 'Clay Loam');
    }
  }, [farmer, language]);

  if (!farmer) return null;

  const initials = farmer.name
    ? farmer.name.split(' ').map(n => n[0]).filter(Boolean).join('').substring(0, 2).toUpperCase()
    : 'FK';

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaveError('');
    setSaving(true);
    try {
      const parsedAcres = parseFloat(acres);
      if (isNaN(parsedAcres) || parsedAcres <= 0) {
        throw new Error(t.invalidLandSize || 'Please enter a valid land size in acres.');
      }

      await updateFarmerProfile({
        name: name.trim(),
        land_size_acres: parsedAcres,
        village: village.trim(),
        district: district.trim(),
        preferred_language: prefLang,
        crops: crops.map(c => c.toLowerCase()),
        owns_land: ownsLand,
        has_irrigation: hasIrrigation,
        irrigation_type: hasIrrigation ? irrigationType : null,
        soil_type: soilType
      });

      setSavedSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      setSaveError(err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const removeCrop = (cropToRemove) => {
    setCrops(prev => prev.filter(c => c.toLowerCase() !== cropToRemove.toLowerCase()));
  };

  const addCrop = (cropToAdd) => {
    const clean = cropToAdd.trim().toLowerCase();
    if (clean && !crops.some(c => c.toLowerCase() === clean)) {
      setCrops(prev => [...prev, clean]);
    }
    setNewCropInput('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* View Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 className="section-title">
            <User size={24} color="#15803d" />
            <span>{t.profileTitle || "Farmer Profile"}</span>
          </h2>
          <p className="section-subtitle">
            {!isDemoMode && isAuthenticated
              ? (t.registeredProfileSubtitle || "Your persistent farm profile verified in SQLite database")
              : (t.profileSubtitle || "Your operational profile stored in farm memory")}
          </p>
        </div>

        {/* Profile Status Badge */}
        {!isDemoMode && isAuthenticated ? (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: '#dcfce7',
            color: '#166534',
            border: '1.5px solid #86efac',
            borderRadius: '999px',
            padding: '0.4rem 0.85rem',
            fontWeight: 800,
            fontSize: '0.85rem'
          }}>
            <ShieldCheck size={18} color="#16a34a" />
            <span>{t.verifiedRegisteredAccount || "Verified Farmer Account"}</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              background: '#fef3c7',
              color: '#92400e',
              border: '1.5px solid #fcd34d',
              borderRadius: '999px',
              padding: '0.35rem 0.75rem',
              fontWeight: 800,
              fontSize: '0.8rem'
            }}>
              {t.demoSimulatorMode || "Demo Simulator Mode"}
            </span>
            <button
              onClick={openRegister}
              style={{
                background: '#15803d',
                color: 'white',
                border: 'none',
                padding: '0.35rem 0.75rem',
                borderRadius: '999px',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              {t.registerRealFarm || "+ Register My Farm"}
            </button>
          </div>
        )}
      </div>

      {/* Main Profile Card */}
      <div className="ks-card" style={{
        background: !isDemoMode && isAuthenticated 
          ? 'linear-gradient(135deg, #064e3b 0%, #15803d 100%)' 
          : 'linear-gradient(135deg, #092e1b 0%, #15803d 100%)',
        color: 'white'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              background: '#ffffff',
              color: '#15803d',
              borderRadius: '50%',
              width: '58px',
              height: '58px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 800,
              flexShrink: 0,
              boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
            }}>
              {initials}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800 }}>{farmer.name}</h3>
                {!isDemoMode && isAuthenticated && (
                  <span style={{
                    background: 'rgba(255,255,255,0.2)',
                    color: '#86efac',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px'
                  }}>
                    PERSISTENT
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', opacity: 0.9 }}>
                <MapPin size={14} />
                <span>{farmer.village ? `${farmer.village}, ` : ''}{farmer.taluka ? `${farmer.taluka}, ` : ''}{farmer.district}, {farmer.state}</span>
              </div>
              {farmer.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', opacity: 0.85, marginTop: '0.15rem' }}>
                  <Phone size={13} />
                  <span>{farmer.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Edit Profile Toggle Button */}
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                borderRadius: '8px',
                padding: '0.5rem 0.85rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                cursor: 'pointer'
              }}
            >
              <Edit3 size={15} />
              <span>{t.editProfile || "Edit Farm Details"}</span>
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                borderRadius: '8px',
                padding: '0.5rem 0.85rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {t.cancel || "Cancel"}
            </button>
          )}
        </div>

        {/* 4 Details Badges */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.75rem',
          background: 'rgba(255, 255, 255, 0.12)',
          padding: '1rem',
          borderRadius: 'var(--radius-md)'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{t.landHolding || "Operational Land"}</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{farmer.land_size_acres} Acres</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{t.farmerCategory || "Farmer Category"}</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, textTransform: 'capitalize' }}>{farmer.farmer_category || 'small'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{t.soilType || "Soil Type"}</div>
            <div style={{ fontSize: '1rem', fontWeight: 700 }}>{farmer.soil_type || 'Clay Loam'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{t.irrigationStatus || "Irrigation Source"}</div>
            <div style={{ fontSize: '1rem', fontWeight: 700 }}>{farmer.irrigation_type || (farmer.has_irrigation ? 'Assured' : 'Rainfed')}</div>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {savedSuccess && (
        <div style={{
          background: '#dcfce7',
          border: '1.5px solid #86efac',
          color: '#166534',
          padding: '0.85rem 1.25rem',
          borderRadius: '8px',
          fontWeight: 800,
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Check size={20} color="#16a34a" />
          <span>{t.profileUpdatedSuccess || "✓ Farm profile saved in persistent database! Changes will persist across sessions."}</span>
        </div>
      )}

      {/* Interactive Edit Form (When editing) */}
      {isEditing && (
        <div className="ks-card" style={{ border: '2px solid #86efac', background: '#f8fafc' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Edit3 size={18} color="#15803d" />
            <span>{t.editProfileDetails || "Update Farm & Account Details"}</span>
          </h3>

          {saveError && (
            <div style={{
              background: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
              padding: '0.65rem 1rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 700,
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}>
              <AlertCircle size={16} />
              <span>{saveError}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                  {t.fullName || "Full Name"}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                  {t.landSizeInAcres || "Land Size (Acres)"}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="1000"
                  value={acres}
                  onChange={(e) => setAcres(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                  {t.village || "Village / Town"}
                </label>
                <input
                  type="text"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                  {t.preferredLanguage || "Preferred Language"}
                </label>
                <select
                  value={prefLang}
                  onChange={(e) => setPrefLang(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', background: '#ffffff' }}
                >
                  <option value="en">English</option>
                  <option value="ta">தமிழ் (Tamil)</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                  <option value="mr">मराठी (Marathi)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                  {t.irrigationStatus || "Irrigation Availability"}
                </label>
                <select
                  value={hasIrrigation ? 'yes' : 'no'}
                  onChange={(e) => setHasIrrigation(e.target.value === 'yes')}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', background: '#ffffff' }}
                >
                  <option value="yes">{t.hasIrrigationYes || "Assured Irrigation"}</option>
                  <option value="no">{t.rainfedOnly || "Rainfed Only"}</option>
                </select>
              </div>

              {hasIrrigation && (
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                    {t.irrigationType || "Irrigation Source"}
                  </label>
                  <input
                    type="text"
                    value={irrigationType}
                    onChange={(e) => setIrrigationType(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>
              )}
            </div>

            {/* Editable Crops */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                {t.cropsCultivated || "Active Crops Cultivated"}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
                {crops.map((c, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: '#dcfce7',
                      color: '#166534',
                      border: '1px solid #86efac',
                      borderRadius: '999px',
                      padding: '0.3rem 0.75rem',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      textTransform: 'capitalize'
                    }}
                  >
                    <span>{c}</span>
                    <button
                      type="button"
                      onClick={() => removeCrop(c)}
                      style={{ background: 'transparent', border: 'none', color: '#166534', cursor: 'pointer', padding: 0 }}
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>

              {/* Add Crop Picker */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Quick add:</span>
                {COMMON_CROP_OPTIONS.filter(co => !crops.some(c => c.toLowerCase() === co.toLowerCase())).slice(0, 6).map(co => (
                  <button
                    type="button"
                    key={co}
                    onClick={() => addCrop(co)}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '999px',
                      padding: '0.2rem 0.55rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    + {co}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Save size={16} />
                <span>{saving ? (t.saving || "Saving...") : (t.saveProfileButton || "Save Profile Changes")}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.6rem 1rem',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                {t.cancel || "Cancel"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Active Crops Card */}
      <div className="ks-card">
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Sprout size={20} color="#15803d" />
          <span>{t.cropsCultivated || "Active Crops"}</span>
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {farmer.crops?.map((c, i) => (
            <div key={i} style={{
              background: '#dcfce7',
              color: '#166534',
              fontWeight: 800,
              fontSize: '0.9rem',
              padding: '0.45rem 1rem',
              borderRadius: '999px',
              border: '1px solid #86efac',
              textTransform: 'capitalize'
            }}>
              🌿 {t.crops?.[c.toLowerCase()] || c}
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Profile Simulator (Only for Demo Mode) */}
      {isDemoMode && (
        <div className="ks-card" style={{ border: '2px dashed #86efac' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Sliders size={20} color="#15803d" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              {t.simulateProfile || "Profile Simulator"}
            </h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
            {t.simulateHint || "Modify parameters to simulate scheme eligibility and advice dynamically in demo mode."}
          </p>

          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                  {t.landSizeInAcres || "Land Size in Acres"} ({acres} Acres)
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="15"
                  step="0.5"
                  value={acres}
                  onChange={(e) => setAcres(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={ownsLand}
                    onChange={(e) => setOwnsLand(e.target.checked)}
                  />
                  <span>{t.ownsLand || "Owns Cultivable Land"}</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={hasIrrigation}
                    onChange={(e) => setHasIrrigation(e.target.checked)}
                  />
                  <span>{t.hasIrrigation || "Has Assured Irrigation Source"}</span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button type="submit" className="btn-primary">
                <RefreshCw size={16} />
                <span>{t.applySimulatedProfile || "Apply Simulated Profile"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
