import React from 'react';
import { TrendingUp, ArrowRight, ArrowUpRight } from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';
import { LiveFallbackBadge } from '../Common/LiveFallbackBadge';

export const MandiSnapshot = () => {
  const { mandiPrices, t, setActiveTab } = useFarmer();
  const topPrices = mandiPrices.slice(0, 2);

  return (
    <div className="ks-card ks-card-interactive" onClick={() => setActiveTab('mandi')}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <TrendingUp size={20} color="#15803d" />
          <span>Mandi Prices & Trends</span>
        </h3>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '0.2rem 0.5rem', borderRadius: '999px' }}>
          APMC Live
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '0.75rem' }}>
        {topPrices.map((item, idx) => (
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'flex-end' }}>
                <LiveFallbackBadge source={item.source} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700 }}>
        <span>Explore All Commodities & Selling Strategy</span>
        <ArrowRight size={14} />
      </div>
    </div>
  );
};
