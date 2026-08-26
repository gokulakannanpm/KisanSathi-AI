import React from 'react';
import { CloudRain, Wind, Droplets, Thermometer, ArrowRight } from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';
import { LiveFallbackBadge } from '../Common/LiveFallbackBadge';

export const WeatherSnapshot = () => {
  const { weather, t, setActiveTab } = useFarmer();
  if (!weather) return null;

  return (
    <div className="ks-card ks-card-interactive" onClick={() => setActiveTab('weather')}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <CloudRain size={20} color="#0284c7" />
          <span>Live Weather (Nagpur)</span>
        </h3>
        <LiveFallbackBadge source={weather.source || 'live'} sourceName={weather.source_name} />
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
          {weather.temperature}°C
        </span>
        <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0284c7' }}>
          {weather.condition}
        </span>
      </div>

      {/* Key Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '0.5rem',
        background: '#f8fafc',
        padding: '0.65rem',
        borderRadius: 'var(--radius-md)',
        marginBottom: '0.75rem'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Rain Prob</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#dc2626' }}>
            {weather.rain_probability}%
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Humidity</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0369a1' }}>
            {weather.humidity}%
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Wind</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#475569' }}>
            {weather.wind_speed} km/h
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700 }}>
        <span>View 3-Day Forecast & Spraying Advisory</span>
        <ArrowRight size={14} />
      </div>
    </div>
  );
};
