import React from 'react';
import { CloudRain, ArrowRight } from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';
import { LiveFallbackBadge } from '../Common/LiveFallbackBadge';

export const WeatherSnapshot = () => {
  const { weather, t, setActiveTab } = useFarmer();
  if (!weather) return null;

  const tempDisplay = (weather.temperature !== null && weather.temperature !== undefined)
    ? `${weather.temperature}°C`
    : '--';

  const conditionDisplay = weather.location_unresolved
    ? (t.locationUnresolved || 'Location weather unavailable')
    : (weather.condition || '--');

  const rainDisplay = (weather.rain_probability !== null && weather.rain_probability !== undefined)
    ? `${weather.rain_probability}%`
    : '--';

  const humidityDisplay = (weather.humidity !== null && weather.humidity !== undefined)
    ? `${weather.humidity}%`
    : '--';

  const windDisplay = (weather.wind_speed !== null && weather.wind_speed !== undefined)
    ? `${weather.wind_speed} km/h`
    : '--';

  return (
    <div className="ks-card ks-card-interactive" onClick={() => setActiveTab('weather')}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <CloudRain size={20} color="#0284c7" />
          <span>{t.navWeather}</span>
        </h3>
          <span className="badge badge-live">🟢 LIVE WEATHER</span>      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
          {tempDisplay}
        </span>
        <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0284c7' }}>
          {conditionDisplay}
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
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{t.rainProbLabel || "Rain Prob"}</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#dc2626' }}>
            {rainDisplay}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{t.humidity || "Humidity"}</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0369a1' }}>
            {humidityDisplay}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{t.windSpeed || "Wind Speed"}</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#475569' }}>
            {windDisplay}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700 }}>
        <span>{t.viewWeatherForecast}</span>
        <ArrowRight size={14} />
      </div>
    </div>
  );
};
