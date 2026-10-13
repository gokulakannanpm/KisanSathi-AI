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
  Coins,
  MapPin,
  RefreshCw
} from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';
import { LiveFallbackBadge } from '../Common/LiveFallbackBadge';
import { COMMODITY_OPTIONS } from '../../config/constants';

export const MandiView = () => {
  const { mandiPrices, setMandiPrices, t, openAiExplainer, farmer } = useFarmer();
  const [selectedCommodity, setSelectedCommodity] = useState('All');
  const [selectedSource, setSelectedSource] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract unique commodities from options + current data
  const availableCommodities = Array.from(
    new Set([
      ...COMMODITY_OPTIONS,
      ...mandiPrices.map(p => p.commodity.split(' ')[0])
    ])
  );

  const filteredPrices = mandiPrices.filter((item) => {
    // 1. Commodity filter
    const matchesCommodity = 
      selectedCommodity === 'All' || 
      item.commodity.toLowerCase().includes(selectedCommodity.toLowerCase());

    // 2. Source filter
    let matchesSource = true;
    if (selectedSource === 'agmarknet') {
      matchesSource = !item.market.toLowerCase().includes('koyambedu');
    } else if (selectedSource === 'tamil_nadu') {
      matchesSource = item.state === 'Tamil Nadu' && !item.market.toLowerCase().includes('koyambedu');
    } else if (selectedSource === 'koyambedu') {
      matchesSource = item.market.toLowerCase().includes('koyambedu');
    }

    // 3. Search query
    const matchesSearch = 
      item.commodity.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.market.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.district && item.district.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.state && item.state.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCommodity && matchesSource && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* View Header */}
      <div>
        <h2 className="section-title">
          <TrendingUp size={24} color="#15803d" />
          <span>{t.mandiTitle || "Live APMC Mandi Rates & Market Trends"}</span>
        </h2>
        <p className="section-subtitle">
          {t.mandiSubtitle || "Verified wholesale modal prices with transparent data indicators"}
        </p>
      </div>

      {/* Farmer Location & Personalization Banner */}
      {farmer && (
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: 'var(--radius-lg)',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
          fontSize: '0.85rem',
          color: '#166534'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={18} color="#15803d" />
            <span>
              <strong>Personalized Location:</strong> Mandis matching {farmer.name}'s land holding in <strong>{farmer.district}, {farmer.state}</strong>
            </span>
          </div>
          {farmer.crops && farmer.crops.length > 0 && (
            <span style={{ fontSize: '0.78rem', background: '#dcfce7', padding: '0.2rem 0.5rem', borderRadius: '999px', fontWeight: 600 }}>
              Crops: {farmer.crops.join(', ')}
            </span>
          )}
        </div>
      )}

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
          <strong>{t.transparencyNoticeHeader || "Transparency Notice:"}</strong> {t.transparencyNoticeText || "Prices marked LIVE DATA are fetched in real-time from AGMARKNET. Items marked FALLBACK indicate rolling modal baseline from recent sessions. MSP is government announced and never fabricated."}
        </div>
      </div>

      {/* Market Source Category Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: 'All Market Sources' },
          { id: 'agmarknet', label: 'APMC Wholesale Mandis' },
          { id: 'tamil_nadu', label: 'Tamil Nadu Regulated' },
          { id: 'koyambedu', label: 'Chennai Koyambedu Terminal' }
        ].map(src => (
          <button
            key={src.id}
            onClick={() => setSelectedSource(src.id)}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.8rem',
              background: selectedSource === src.id ? '#15803d' : '#f8fafc',
              color: selectedSource === src.id ? 'white' : '#475569',
              border: `1px solid ${selectedSource === src.id ? '#15803d' : 'var(--border-medium)'}`
            }}
          >
            {src.label}
          </button>
        ))}
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
            placeholder={t.searchPlaceholder || "Search commodity, mandi, or state..."}
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

        {/* Commodity Filter Pills covering all supported crops */}
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
            {t.allCrops || "All Crops"}
          </button>
          {availableCommodities.map((crop) => (
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
              {t.crops?.[crop.toLowerCase().split(' ')[0]] || crop}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State when no records match filter */}
      {filteredPrices.length === 0 && (
        <div className="ks-card" style={{
          textAlign: 'center',
          padding: '2.5rem 1.5rem',
          background: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          border: '1px dashed var(--border-medium)'
        }}>
          <AlertCircle size={36} color="#94a3b8" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.4rem' }}>
            No Mandi Records Found
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '440px', margin: '0 auto 1.25rem' }}>
            No market arrivals found matching commodity "{selectedCommodity}" in the selected market category.
            We never substitute data from other states.
          </p>
          <button
            onClick={() => { setSelectedCommodity('All'); setSelectedSource('all'); setSearchQuery(''); }}
            className="btn-primary"
            style={{ margin: '0 auto' }}
          >
            Clear Filters & View All
          </button>
        </div>
      )}

      {/* Mandi Price Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '1.25rem' }}>
        {filteredPrices.map((item, idx) => {
          const hasMsp = item.msp !== null && item.msp !== undefined && item.msp > 0;
          const isAboveMsp = hasMsp && item.modal_price >= item.msp;
          const isKoyambedu = item.market.toLowerCase().includes('koyambedu');

          return (
            <div key={idx} className="ks-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                      {item.commodity}
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {item.variety || t.standardQuality || 'Standard Quality'} • {item.market}, {item.district}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 600, marginTop: '2px' }}>
                      {isKoyambedu ? 'Terminal Wholesale Market' : `${item.state} APMC Mandi`}
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
                      {t.modalMandiRate || "Modal Wholesale Rate"}
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#15803d' }}>
                      ₹{item.modal_price.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>/ {item.unit || t.perQuintal || "Quintal"}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{t.minMaxPrice || "Min - Max Range"}</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                      ₹{item.min_price} - ₹{item.max_price}
                    </div>
                  </div>
                </div>

                {/* Verified Government MSP Comparison Pill */}
                {hasMsp ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.8rem',
                    padding: '0.4rem 0.65rem',
                    borderRadius: '8px',
                    background: isAboveMsp ? '#dcfce7' : '#fee2e2',
                    color: isAboveMsp ? '#166534' : '#b91c1c',
                    fontWeight: 700,
                    marginBottom: '0.75rem'
                  }}>
                    <span>{t.govtMsp || "Govt MSP"}: ₹{item.msp}</span>
                    <span>{isAboveMsp ? `+₹${item.modal_price - item.msp} above MSP` : `-₹${item.msp - item.modal_price} below MSP`}</span>
                  </div>
                ) : (
                  <div style={{
                    fontSize: '0.75rem',
                    padding: '0.3rem 0.5rem',
                    borderRadius: '6px',
                    background: '#f1f5f9',
                    color: '#64748b',
                    fontWeight: 600,
                    marginBottom: '0.75rem'
                  }}>
                    MSP data unavailable (No government MSP mandated for this commodity)
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
                    <strong>{t.sellingAdvice || "Market Insight"}:</strong> {item.ai_selling_tip}
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
                <span>{t.date || "Arrival Date"}: {item.date}</span>
                <button
                  onClick={() => openAiExplainer({
                    headline: `Mandi Intelligence for ${item.commodity}`,
                    reasoning: `Analysis of ${item.commodity} at ${item.market} currently trading at ₹${item.modal_price}/${item.unit || 'quintal'}.`,
                    ai_explanation: item.ai_selling_tip
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
                  <span>{t.marketAdviceButton || "Market Advice"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
