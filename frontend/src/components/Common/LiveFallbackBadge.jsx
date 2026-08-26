import React from 'react';
import { Radio, AlertCircle } from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';

export const LiveFallbackBadge = ({ source = 'live', sourceName = '', fallbackReason = '' }) => {
  const { t } = useFarmer();
  const isLive = source?.toLowerCase() === 'live';

  return (
    <div 
      className={`badge ${isLive ? 'badge-live' : 'badge-fallback'}`}
      title={isLive ? (sourceName || 'Live agricultural data source') : (fallbackReason || sourceName || 'Using verified historical fallback baseline')}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'help' }}
    >
      {isLive ? (
        <>
          <span className="pulse-dot"></span>
          <span>{t.liveData}</span>
        </>
      ) : (
        <>
          <span className="pulse-dot-amber"></span>
          <AlertCircle size={12} strokeWidth={2.5} />
          <span>{t.fallbackData}</span>
        </>
      )}
    </div>
  );
};
