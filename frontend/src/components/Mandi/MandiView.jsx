import React, { useState } from 'react';
import { 
  TrendingUp, 
  Search, 
  Filter, 
  AlertCircle, 
  Sparkles, 
  Calendar, 
  ShieldCheck, 
  ArrowUpRight, 
  Coins 
} from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';
import { LiveFallbackBadge } from '../Common/LiveFallbackBadge';
import { COMMODITY_OPTIONS } from '../../config/constants';

export const MandiView = () => {
  const { mandiPrices, t, openAiExplainer } = useFarmer();
  const [selectedCommodity, setSelectedCommodity] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPrices = mandiPrices.filter((item) => {
    const matchesCommodity = selectedCommodity === 'All' || item.commodity.toLowerCase().includes(selectedCommodity.toLowerCase());
    const matchesSearch = item.commodity.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.market.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCommodity && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* View Header */}
      <div>
        <h2 className="section-title">
          <TrendingUp size={24} color="#15803d" />
          <span>{t.mandiTitle}</span>
        </h2>
        <p className="section-subtitle">
          {t.mandiSubtitle}
        </p>
      </div>

      {/* Notice Banner explaining Live vs Fallback */}
      <div style={{
        background: '#ffffff',
        border: '1px solid var(--border-medium)',
        borderRadius: 'var(--radius-lg)',
        padding: '0.85rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <AlertCircle size={20} color="#d97706" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '0.85rem', color: '#475569' }}>
          <strong>Transparency Notice:</strong> Prices marked <span className="badge badge-live" style={{ fontSize: '0.7rem' }}>LIVE DATA</span> are fetched in real time from AGMARKNET. Items marked <span className="badge badge-fallback" style={{ fontSize: '0.7rem' }}>FALLBACK CACHE</span> indicate active connection retries or rolling modal baseline from recent market sessions.
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Search */}
        <div style={{
          position: 'relative',
          flex: '1',
          minWidth: '240px'
        }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 0.75rem 0.65rem 2.4rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-medium)',
              background: '#ffffff',
              fontSize: '0.9rem'
            }}
          />
        </div>

        {/* Commodity Filter Pills */}
        <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '4px', maxWidth: '100%' }}>
          <button
            onClick={() => setSelectedCommodity('All')}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '999px',
              fontWeight: 700,
              fontSize: '0.8rem',
              background: selectedCommodity === 'All' ? '#15803d' : '#ffffff',
              color: selectedCommodity === 'All' ? 'white' : '#64748b',
              border: '1px solid var(--border-subtle)',
              whiteSpace: 'nowrap'
            }}
          >
            {t.allCrops}
          </button>
          {['Cotton', 'Soybean', 'Wheat', 'Gram'].map((crop) => (
            <button
              key={crop}
              onClick={() => setSelectedCommodity(crop)}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '999px',
                fontWeight: 700,
                fontSize: '0.8rem',
                background: selectedCommodity === crop ? '#15803d' : '#ffffff',
                color: selectedCommodity === crop ? 'white' : '#64748b',
                border: '1px solid var(--border-subtle)',
                whiteSpace: 'nowrap'
              }}
            >
              {crop}
            </button>
          ))}
        </div>
      </div>

      {/* Mandi Price Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '1.25rem' }}>
        {filteredPrices.map((item, idx) => {
          const isAboveMsp = item.modal_price >= (item.msp || 0);
          return (
            <div key={idx} className="ks-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                      {item.commodity}
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {item.variety || 'Standard Quality'} • {item.market}, {item.district}
                    </div>
                  </div>
                  <LiveFallbackBadge 
                    source={item.source} 
                    sourceName={item.source_name} 
                    fallbackReason={item.fallback_reason} 
                  />
                </div>

                {/* Price Display */}
                <div style={{
                  background: '#f8fafc',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  margin: '0.75rem 0'
                }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                      {t.modalMandiRate}
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#15803d' }}>
                      ₹{item.modal_price.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>/ Qtl</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{t.minMaxPrice}</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                      ₹{item.min_price} - ₹{item.max_price}
                    </div>
                  </div>
                </div>

                {/* MSP Comparison Pill */}
                {item.msp && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.8rem',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '8px',
                    background: isAboveMsp ? '#dcfce7' : '#fee2e2',
                    color: isAboveMsp ? '#166534' : '#b91c1c',
                    fontWeight: 700,
                    marginBottom: '0.75rem'
                  }}>
                    <span>Govt MSP: ₹{item.msp}</span>
                    <span>{isAboveMsp ? `+₹${item.modal_price - item.msp} ${t.aboveMsp}` : `-₹${item.msp - item.modal_price} ${t.belowMsp}`}</span>
                  </div>
                )}

                {/* AI Selling Tip */}
                {item.ai_selling_tip && (
                  <div style={{
                    background: '#f0fdf4',
                    borderLeft: '3px solid #16a34a',
                    padding: '0.65rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    color: '#166534',
                    lineHeight: 1.4
                  }}>
                    <strong>{t.sellingAdvice}:</strong> {item.ai_selling_tip}
                  </div>
                )}
              </div>

              {/* Bottom Metadata & Ask AI */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--border-subtle)',
                fontSize: '0.75rem',
                color: '#94a3b8'
              }}>
                <span>Date: {item.date}</span>
                <button
                  onClick={() => openAiExplainer({
                    headline: `Mandi Intelligence for ${item.commodity}`,
                    reasoning: `Analysis of ${item.commodity} at ${item.market} currently trading at ₹${item.modal_price}/quintal.`,
                    ai_explanation: item.ai_selling_tip
                  })}
                  style={{
                    color: '#d97706',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <Sparkles size={13} />
                  <span>{t.marketAdviceButton}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
