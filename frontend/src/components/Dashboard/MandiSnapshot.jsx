import React from 'react';
import { TrendingUp, ArrowRight } from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';
import { LiveFallbackBadge } from '../Common/LiveFallbackBadge';

export const MandiSnapshot = () => {
  const { mandiPrices, t, setActiveTab } = useFarmer();
  const topPrices = mandiPrices.slice(0, 2);
  const primarySource = topPrices[0]?.source || 'live';
  const primarySourceName = topPrices[0]?.source_name || '';

  return (
    <div className="ks-card ks-card-interactive" onClick={() => setActiveTab('mandi')}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <TrendingUp size={20} color="#15803d" />
          <span>{t.navMandi}</span>
        </h3>
        {topPrices.length > 0 && (
          <LiveFallbackBadge source={primarySource} sourceName={primarySourceName} />
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '0.75rem' }}>
        {topPrices.length === 0 ? (
          <div style={{ padding: '0.75rem', color: '#64748b', fontSize: '0.85rem', textAlign: 'center' }}>
            {t.noMandiRecordsFound || "No Mandi price records found"}
          </div>
        ) : (
          topPrices.map((item, idx) => (
            <div
              key={idx}
              style={{
                background: '#f8fafc',
                borderRadius: 'var(--radius-md)',
                padding: '0.65rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>
                  {item.commodity}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {item.market}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#15803d' }}>
                  ₹{item.modal_price.toLocaleString()}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'flex-end', marginTop: '2px' }}>
                  <LiveFallbackBadge source={item.source} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700 }}>
        <span>{t.exploreMandiStrategy}</span>
        <ArrowRight size={14} />
      </div>
    </div>
  );
};
