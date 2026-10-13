import React, { useState } from 'react';
import { 
  X, 
  Sprout, 
  Coins, 
  TrendingUp, 
  AlertTriangle, 
  Calendar, 
  Sparkles, 
  CheckCircle2, 
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';

export const CropPlannerModal = () => {
  const { 
    isCropPlannerOpen, 
    closeCropPlanner, 
    cropPlanData, 
    cropPlanLoading, 
    openCropPlanner,
    farmer, 
    t, 
    openAiExplainer 
  } = useFarmer();

  const [selectedSeason, setSelectedSeason] = useState('kharif');

  if (!isCropPlannerOpen) return null;

  const handleSeasonChange = (season) => {
    setSelectedSeason(season);
    openCropPlanner({ season });
  };

  const candidates = cropPlanData?.candidates || [];
  const farmerContext = cropPlanData?.farmer_context || {
    name: farmer?.name || "Farmer",
    state: farmer?.state || "Maharashtra",
    district: farmer?.district || "Nagpur",
    land_size_acres: farmer?.land_size_acres || 2.5,
    soil_type: farmer?.soil_type || "Black Cotton Soil",
    has_irrigation: farmer?.has_irrigation ?? true
  };

  return (
    <div className="modal-overlay" onClick={closeCropPlanner}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ padding: '1.5rem', maxWidth: '820px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              background: '#15803d',
              color: 'white',
              borderRadius: '12px',
              width: '42px',
              height: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sprout size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                Suggest a Crop to Sow • On-Demand Planning
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                Evaluated for {farmerContext.name}'s <strong>{farmerContext.land_size_acres} Acre</strong> parcel in {farmerContext.district}, {farmerContext.state}
              </p>
            </div>
          </div>

          <button 
            onClick={closeCropPlanner}
            style={{ background: '#f1f5f9', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Season & Soil Parameter Bar */}
        <div style={{
          background: '#f8fafc',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1rem',
          border: '1px solid var(--border-medium)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1.25rem'
        }}>
          <div style={{ fontSize: '0.82rem', color: '#475569' }}>
            <div><strong>Soil:</strong> {farmerContext.soil_type}</div>
            <div><strong>Irrigation:</strong> {farmerContext.has_irrigation ? 'Assured (Canal/Borewell)' : 'Rainfed / Dryland'}</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Season:</span>
            {['kharif', 'rabi'].map((s) => (
              <button
                key={s}
                onClick={() => handleSeasonChange(s)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '999px',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  textTransform: 'capitalize',
                  background: selectedSeason === s ? '#15803d' : '#ffffff',
                  color: selectedSeason === s ? 'white' : '#64748b',
                  border: '1px solid var(--border-medium)',
                  cursor: 'pointer'
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Transparency Notice */}
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fef3c7',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          fontSize: '0.8rem',
          color: '#92400e',
          marginBottom: '1.25rem'
        }}>
          <Info size={18} color="#d97706" style={{ flexShrink: 0 }} />
          <div>
            <strong>Transparent Calculation Notice:</strong> Yields and cultivation costs are derived from published ICAR and CACP agrometeorological benchmarks. Market prices reflect recent APMC modal rates. These estimates are educational baselines and do not guarantee profits.
          </div>
        </div>

        {/* Loading State */}
        {cropPlanLoading && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
            <Sprout size={36} className="animate-spin" color="#15803d" style={{ margin: '0 auto 0.75rem' }} />
            <div style={{ fontWeight: 700 }}>Calculating agro-climatic suitability and financial returns...</div>
          </div>
        )}

        {/* Incomplete profile handling */}
        {!cropPlanLoading && cropPlanData?.status === "incomplete_profile" && (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
            <AlertTriangle size={32} color="#dc2626" style={{ margin: '0 auto 0.5rem' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#991b1b', marginBottom: '0.25rem' }}>
              Farm Profile Incomplete
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#7f1d1d' }}>
              {cropPlanData.message}
            </p>
          </div>
        )}

        {/* Candidate Crop Shortlist */}
        {!cropPlanLoading && candidates.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {candidates.map((c, idx) => {
              const isProfitPositive = c.estimated_net_return_per_acre > 0;
              return (
                <div 
                  key={c.crop_id || idx}
                  className="ks-card"
                  style={{
                    background: '#ffffff',
                    borderLeft: `5px solid ${isProfitPositive ? '#16a34a' : '#d97706'}`,
                    padding: '1.25rem'
                  }}
                >
                  {/* Top Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                          {c.crop_name}
                        </h3>
                        <span style={{
                          background: '#e0f2fe',
                          color: '#0369a1',
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px'
                        }}>
                          {c.duration}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.84rem', color: '#475569', marginTop: '0.25rem', lineHeight: 1.4 }}>
                        {c.suitability_reason}
                      </p>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                        Est. Net Return ({c.land_size_acres} Acres)
                      </div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: isProfitPositive ? '#15803d' : '#b45309' }}>
                        ₹{c.total_estimated_net_return?.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        (₹{c.estimated_net_return_per_acre?.toLocaleString()} / acre)
                      </div>
                    </div>
                  </div>

                  {/* 3-Column Financial Breakdown */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '0.75rem',
                    background: '#f8fafc',
                    padding: '0.85rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    marginBottom: '0.85rem'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                        Expected Yield
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                        {c.expected_yield_per_acre_qtl} Qtl / acre
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        Total: {c.total_expected_yield_qtl} Quintals
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                        Wholesale Rate vs MSP
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                        ₹{c.market_price_per_qtl} / Qtl
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600 }}>
                        MSP: ₹{c.govt_msp_per_qtl} / Qtl ({c.msp_season})
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                        Cultivation Cost
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                        ₹{c.cost_per_acre?.toLocaleString()} / acre
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        Total: ₹{c.total_cultivation_cost?.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Key Agronomic Risks */}
                  {c.major_risks && c.major_risks.length > 0 && (
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.75rem' }}>
                      <strong style={{ color: '#334155' }}>Key Risks & Considerations:</strong>
                      <ul style={{ paddingLeft: '1.2rem', marginTop: '0.2rem', marginBottom: 0 }}>
                        {c.major_risks.map((risk, rIdx) => (
                          <li key={rIdx}>{risk}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Sources & Action */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    paddingTop: '0.65rem',
                    borderTop: '1px solid var(--border-subtle)',
                    fontSize: '0.72rem',
                    color: '#94a3b8'
                  }}>
                    <span>
                      Basis: {c.yield_basis} • Price: {c.price_source} ({c.price_date})
                    </span>

                    <button
                      onClick={() => openAiExplainer({
                        headline: `Crop Planning Analysis: ${c.crop_name}`,
                        reasoning: `Cultivation advice for ${c.crop_name} across ${c.land_size_acres} acres in ${farmerContext.district}, ${farmerContext.state}.`,
                        ai_explanation: (
                          `Expected Yield: ${c.expected_yield_per_acre_qtl} Qtl/acre.\n` +
                          `Wholesale Rate: ₹${c.market_price_per_qtl}/Qtl (Govt MSP: ₹${c.govt_msp_per_qtl}/Qtl).\n` +
                          `Cultivation Cost: ₹${c.cost_per_acre}/acre.\n` +
                          `Estimated Net Return: ₹${c.total_estimated_net_return} for ${c.land_size_acres} acres.\n\n` +
                          `Major Risks: ${c.major_risks.join('; ')}.`
                        )
                      })}
                      style={{
                        color: '#d97706',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <Sparkles size={13} />
                      <span>Ask AI About this Crop</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};
