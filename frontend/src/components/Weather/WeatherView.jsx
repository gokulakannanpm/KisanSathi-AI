import React, { useState } from 'react';
import {
  CloudRain,
  Wind,
  Droplets,
  Thermometer,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Calendar,
  PlusCircle,
  Check,
  MapPin,
  Clock
} from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';
import { LiveFallbackBadge } from '../Common/LiveFallbackBadge';

export const WeatherView = () => {
  const { weather, t, farmer, addDiaryEntry } = useFarmer();
  const [addedAdviceIds, setAddedAdviceIds] = useState([]);
  const [addingId, setAddingId] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  if (!weather) return null;

  // Handle Location Unresolved State
  if (weather.location_unresolved) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <h2 className="section-title">
            <CloudRain size={24} color="#0284c7" />
            <span>{t.weatherTitle || "Agricultural Weather Intelligence"}</span>
          </h2>
        </div>

        <div className="ks-card" style={{
          textAlign: 'center',
          padding: '2.5rem 1.5rem',
          background: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          border: '1px dashed #f59e0b'
        }}>
          <AlertTriangle size={36} color="#d97706" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.4rem' }}>
            {t.locationWeatherUnavailable || "Location Weather Unavailable"}
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '440px', margin: '0 auto 1.25rem' }}>
            {weather.message || (t.locationUnresolvedMessage || "We could not resolve GPS radar coordinates for your farm location. We never silently substitute another region's weather.")}
          </p>
        </div>
      </div>
    );
  }

  // Display accurate resolved location
  const locationLabel = weather.resolved_location ||
    (farmer?.district ? `${farmer.district}, ${farmer.state}` : 'Regional Agrometeorological Station');

  // Add Weather Action to Farm Diary (Persisted as Planned Activity)
  const handleAddToDiary = async (advice) => {
    if (addedAdviceIds.includes(advice.id) || addingId === advice.id) return;
    setAddingId(advice.id);
    setFeedbackMsg('');

    try {
      const todayDate = new Date().toISOString().split('T')[0];
      const entry = {
        date: todayDate,
        activity_type: `Weather Advisory`,
        crop: (advice.crop || farmer?.crops?.[0] || 'farm').toLowerCase(),
        notes: `[Planned Action] ${advice.action}. Reason: ${advice.reason} (${advice.weather_context})`,
        quantity_cost: "0",
        status: "planned",
        triggered_alert: advice.urgency === 'High'
      };

      await addDiaryEntry(entry);
      setAddedAdviceIds(prev => [...prev, advice.id]);
      setFeedbackMsg(t.actionAddedSuccess || `Action added to Farm Diary as planned task!`);
      setTimeout(() => setFeedbackMsg(''), 4000);
    } catch (err) {
      console.error("Failed to add weather action to diary:", err);
      setFeedbackMsg(t.actionAddFailed || `Failed to save action to diary. Please try again.`);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Header & Source */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 className="section-title">
            <CloudRain size={24} color="#0284c7" />
            <span>{t.weatherTitle || "Agricultural Weather Intelligence"}</span>
          </h2>
          <p className="section-subtitle">
            {t.weatherSubtitle || "Station real-time weather & radar feed synced with your farm holding"}
          </p>
        </div>
        <LiveFallbackBadge source={weather.source} sourceName={weather.source_name} fallbackReason={weather.fallback_reason} />
      </div>

      {/* Main Condition Hero */}
      <div className="ks-card" style={{
        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
        color: 'white',
        borderRadius: 'var(--radius-xl)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, background: 'rgba(255,255,255,0.2)', padding: '0.25rem 0.65rem', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <MapPin size={14} />
              <span>{t.currentStatus || "Current Status"} • {locationLabel}</span>
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginTop: '0.75rem' }}>
              <span style={{ fontSize: '3.5rem', fontWeight: 800, lineHeight: 1 }}>
                {weather.temperature !== null && weather.temperature !== undefined ? `${weather.temperature}°C` : '--'}
              </span>
              <span style={{ fontSize: '1.35rem', fontWeight: 700, color: '#e0f2fe' }}>
                {weather.condition || '--'}
              </span>
            </div>
            <div style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: '0.25rem' }}>
              {t.lastSynced || "Last Synced"}: {weather.fetched_at ? new Date(weather.fetched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'} via {weather.source_name || 'Agrometeorological Feed'}
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
              <span>{t.sprayingFeasibility || "Spraying Window"}</span>
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fee2e2' }}>
              {weather.advisory?.spraying_index || (t.sprayingSafe || 'SAFE (Dry Window)')}
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
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{t.rainProbLabel || "Rain Probability"}</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{weather.rain_probability ?? 0}%</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Wind size={22} color="#bae6fd" />
            <div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{t.windSpeed || "Wind Speed"}</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{weather.wind_speed ?? 0} km/h</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Thermometer size={22} color="#bae6fd" />
            <div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{t.humidity || "Humidity"}</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{weather.humidity ?? 0}%</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={22} color="#fef08a" />
            <div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{t.irrigationNeed || "Irrigation Need"}</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{weather.advisory?.irrigation_need || 'Normal'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Actionable Weather Advice */}
      {weather.actionable_advice && weather.actionable_advice.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Clock size={18} color="#15803d" />
              <span>{t.actionableWeatherAdvice || "Actionable Weather Advice for Your Farm"}</span>
            </h3>
            {feedbackMsg && (
              <span style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 700, background: '#dcfce7', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                {feedbackMsg}
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {weather.actionable_advice.map((adv) => {
              const isAdded = addedAdviceIds.includes(adv.id);
              return (
                <div
                  key={adv.id}
                  className="ks-card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderLeft: `5px solid ${adv.urgency === 'High' ? '#ef4444' : '#10b981'}`,
                    gap: '0.75rem'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        background: adv.urgency === 'High' ? '#fee2e2' : '#e0f2fe',
                        color: adv.urgency === 'High' ? '#b91c1c' : '#0369a1'
                      }}>
                        {adv.urgency} Urgency • {adv.time_period}
                      </span>
                      {adv.crop && (
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                          Crop: {t.crops?.[adv.crop.toLowerCase()] || adv.crop}
                        </span>
                      )}
                    </div>

                    <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem' }}>
                      {adv.action}
                    </h4>

                    <p style={{ fontSize: '0.84rem', color: '#475569', lineHeight: 1.5, marginBottom: '0.5rem' }}>
                      {adv.reason}
                    </p>

                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      Context: {adv.weather_context}
                    </div>
                  </div>

                  {/* Add to Farm Diary Action Button */}
                  <div style={{ paddingTop: '0.65rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => handleAddToDiary(adv)}
                      disabled={isAdded || addingId === adv.id}
                      style={{
                        padding: '0.4rem 0.8rem',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        background: isAdded ? '#dcfce7' : '#15803d',
                        color: isAdded ? '#15803d' : 'white',
                        border: isAdded ? '1px solid #86efac' : 'none',
                        cursor: isAdded ? 'default' : 'pointer'
                      }}
                    >
                      {isAdded ? (
                        <>
                          <Check size={14} />
                          <span>{t.actionAddedToDiary || 'Added to Diary'}</span>
                        </>
                      ) : (
                        <>
                          <PlusCircle size={14} />
                          <span>{addingId === adv.id ? (t.adding || 'Adding...') : (t.addToFarmDiary || 'Add to Farm Diary')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3-Day Forecast Cards */}
      <div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Calendar size={18} color="var(--primary)" />
          <span>{t.threeDayForecastTitle || "3-Day Operations Forecast"}</span>
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
                  {day.spraying_safe ? (t.sprayingSafe || "Safe to Spray") : (t.sprayingUnsafe || "Unsafe / Rain Risk")}
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
          <span>{t.drainageAdvisoryTitle || "Drainage & Field Precautions"}</span>
        </h4>
        <p style={{ fontSize: '0.85rem', color: '#78350f', lineHeight: 1.5 }}>
          {weather.advisory?.drainage_advisory || (t.drainageAdvisoryDefault || 'Ensure drainage channels and trenches across your cultivated plots are cleared to avoid root waterlogging during precipitation.')}
        </p>
      </div>

    </div>
  );
};
