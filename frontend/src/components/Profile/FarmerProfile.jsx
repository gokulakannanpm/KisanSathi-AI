import React, { useState } from 'react';
import { 
  User, 
  MapPin, 
  Layers, 
  Sprout, 
  CheckCircle2, 
  ShieldCheck, 
  Sliders, 
  RefreshCw 
} from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';

export const FarmerProfile = () => {
  const { farmer, updateFarmerProfile, t, refreshData } = useFarmer();
  const [acres, setAcres] = useState(farmer?.land_size_acres || 2.5);
  const [ownsLand, setOwnsLand] = useState(farmer?.owns_land ?? true);
  const [hasIrrigation, setHasIrrigation] = useState(farmer?.has_irrigation ?? true);
  const [isTaxPayer, setIsTaxPayer] = useState(farmer?.is_tax_payer ?? false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!farmer) return null;

  const handleSimulate = (e) => {
    e.preventDefault();
    updateFarmerProfile({
      land_size_acres: parseFloat(acres),
      owns_land: ownsLand,
      has_irrigation: hasIrrigation,
      is_tax_payer: isTaxPayer
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* View Header */}
      <div>
        <h2 className="section-title">
          <User size={24} color="#15803d" />
          <span>{t.profileTitle}</span>
        </h2>
        <p className="section-subtitle">
          {t.profileSubtitle}
        </p>
      </div>

      {/* Main Profile Card */}
      <div className="ks-card" style={{ background: 'linear-gradient(135deg, #092e1b 0%, #15803d 100%)', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{
            background: '#ffffff',
            color: '#15803d',
            borderRadius: '50%',
            width: '56px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontWeight: 800
          }}>
            RK
          </div>

          <div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800 }}>{farmer.name}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', opacity: 0.9 }}>
              <MapPin size={14} />
              <span>{farmer.village}, {farmer.taluka}, {farmer.district}, {farmer.state}</span>
            </div>
          </div>
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
            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Operational Land</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{farmer.land_size_acres} Acres</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Farmer Category</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, textTransform: 'capitalize' }}>{farmer.farmer_category}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Soil Type</div>
            <div style={{ fontSize: '1rem', fontWeight: 700 }}>Black Cotton</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Irrigation Source</div>
            <div style={{ fontSize: '1rem', fontWeight: 700 }}>{farmer.irrigation_type || 'Borewell + Drip'}</div>
          </div>
        </div>
      </div>

      {/* Active Crops Card */}
      <div className="ks-card">
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Sprout size={20} color="#15803d" />
          <span>{t.cropsCultivated}</span>
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
              🌿 {c}
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Profile Simulator */}
      <div className="ks-card" style={{ border: '2px dashed #86efac' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Sliders size={20} color="#15803d" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
            {t.simulateProfile}
          </h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
          {t.simulateHint}
        </p>

        <form onSubmit={handleSimulate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                Land Size in Acres ({acres} Acres)
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
                <span>Owns Cultivable Land</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={hasIrrigation}
                  onChange={(e) => setHasIrrigation(e.target.checked)}
                />
                <span>Has Assured Irrigation Source</span>
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button type="submit" className="btn-primary">
              <RefreshCw size={16} />
              <span>Apply Simulated Profile</span>
            </button>
            {savedSuccess && (
              <span style={{ color: '#15803d', fontWeight: 700, fontSize: '0.85rem' }}>
                ✓ Profile updated in farm memory!
              </span>
            )}
          </div>
        </form>
      </div>

    </div>
  );
};
