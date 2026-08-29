import React from 'react';
import { 
  CloudRain, 
  Wind, 
  Droplets, 
  Thermometer, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Calendar 
} from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';
import { LiveFallbackBadge } from '../Common/LiveFallbackBadge';

export const WeatherView = () => {
  const { weather, t, openAiExplainer } = useFarmer();
  if (!weather) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Header & Source */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 className="section-title">
            <CloudRain size={24} color="#0284c7" />
            <span>{t.weatherTitle}</span>
          </h2>
          <p className="section-subtitle">
            {t.weatherSubtitle}
          </p>
        </div>
        <LiveFallbackBadge source={weather.source} sourceName={weather.source_name} />
      </div>

      {/* Main Condition Hero */}
      <div className="ks-card" style={{
        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
        color: 'white',
        borderRadius: 'var(--radius-xl)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, background: 'rgba(255,255,255,0.2)', padding: '0.25rem 0.65rem', borderRadius: '999px' }}>
              Current Status • Nagpur, Maharashtra
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginTop: '0.75rem' }}>
              <span style={{ fontSize: '3.5rem', fontWeight: 800, lineHeight: 1 }}>
                {weather.temperature}°C
              </span>
              <span style={{ fontSize: '1.35rem', fontWeight: 700, color: '#e0f2fe' }}>
                {weather.condition}
              </span>
            </div>
            <div style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: '0.25rem' }}>
              Last Synced: {new Date(weather.fetched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} via {weather.source_name}
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(6px)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem 1.25rem',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            minWidth: '220px'
          }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fef08a', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <ShieldAlert size={16} />
              <span>{t.sprayingFeasibility}</span>
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fee2e2' }}>
              {weather.advisory?.spraying_index || 'HIGH RISK (Delay Spray)'}
            </div>
          </div>
        </div>

        {/* 4-Metric Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.75rem',
          marginTop: '1.5rem',
          paddingTop: '1rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Droplets size={22} color="#bae6fd" />
            <div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{t.rainProbLabel}</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{weather.rain_probability}%</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Wind size={22} color="#bae6fd" />
            <div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{t.windSpeed}</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{weather.wind_speed} km/h</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Thermometer size={22} color="#bae6fd" />
            <div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{t.humidity}</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{weather.humidity}%</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={22} color="#fef08a" />
            <div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{t.irrigationNeed}</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{weather.advisory?.irrigation_need || 'Zero'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3-Day Forecast Cards */}
      <div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Calendar size={18} color="var(--primary)" />
          <span>{t.threeDayForecastTitle}</span>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {weather.forecast_3day?.map((day, idx) => (
            <div 
              key={idx}
              className="ks-card"
              style={{
                borderTop: `4px solid ${day.spraying_safe ? '#22c55e' : '#ef4444'}`,
                background: day.spraying_safe ? '#f0fdf4' : '#fef2f2'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                  {day.day}
                </span>
                <span className={`badge ${day.spraying_safe ? 'badge-eligible' : 'badge-danger'}`}>
                  {day.spraying_safe ? t.sprayingSafe : t.sprayingUnsafe}
                </span>
              </div>

              <div style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 600, marginBottom: '0.5rem' }}>
                {day.condition}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b' }}>
                <span>Rain: <strong style={{ color: day.rain_prob > 50 ? '#dc2626' : '#166534' }}>{day.rain_prob}%</strong></span>
                <span>Temp: <strong>{day.temp_min}° - {day.temp_max}°C</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Advisory Card */}
      <div className="ks-card" style={{ background: '#fffbeb', border: '1px solid #fef3c7' }}>
        <h4 style={{ color: '#b45309', fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <AlertTriangle size={18} />
          <span>{t.drainageAdvisoryTitle}</span>
        </h4>
        <p style={{ fontSize: '0.85rem', color: '#78350f', lineHeight: 1.5 }}>
          {weather.advisory?.drainage_advisory || 'Heavy downpours expected. Please ensure that drainage trenches on your 2.5 acre cotton and soybean plots are cleared of weeds to avoid root waterlogging.'}
        </p>
      </div>

    </div>
  );
};
