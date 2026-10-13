import React, { useState } from 'react';
import { 
  User, 
  BookOpen, 
  CloudRain, 
  TrendingUp, 
  Cpu, 
  CheckCircle2, 
  Database,
  Info,
  Sprout
} from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';

export const ConnectiveLoopVisualizer = () => {
  const { t, farmer, weather, diary, recommendation, openCropPlanner } = useFarmer();
  const [expanded, setExpanded] = useState(false);

  // Dynamic context generation
  const farmerLand = farmer?.land_size_acres ? `${farmer.land_size_acres} Acres` : '2.5 Acres';
  const farmerCrops = (farmer?.crops && farmer.crops.length > 0)
    ? farmer.crops.map(c => t.crops?.[c.toLowerCase()] || c).join('/')
    : 'Cotton/Soybean';
  const farmerLoc = farmer?.district || farmer?.village || 'Nagpur';
  const farmerSub = `${farmerLand}, ${farmerCrops}, ${farmerLoc}`;

  const plannedDiary = diary?.find(d => d.status === 'planned');
  const diarySub = plannedDiary
    ? `${t.activityTypes?.[plannedDiary.activity_type] || plannedDiary.activity_type} (${plannedDiary.crop || ''})`
    : (t.loopDiarySub || "Scheduled operations tracked in memory");

  const weatherSub = (weather && !weather.location_unresolved && weather.rain_probability !== null && weather.rain_probability !== undefined)
    ? `${weather.rain_probability}% ${weather.condition || ''}`
    : (t.loopWeatherSub || "Real-time rainfall radar feed");

  const aiSub = t.loopAiSub || "Cross-checks chemical rainfastness";

  const heroSub = recommendation
    ? (recommendation.headline || recommendation.action)
    : (t.actionableDecisionSub || "Smart scheduling protects crops & inputs");

  const steps = [
    {
      title: t.stepFarmerContext || "1. Farmer Context",
      sub: farmerSub,
      icon: User,
      color: "#16a34a"
    },
    {
      title: t.stepFarmDiary || "2. Farm Diary",
      sub: diarySub,
      icon: BookOpen,
      color: "#0284c7"
    },
    {
      title: t.stepLiveWeather || "3. Live Weather",
      sub: weatherSub,
      icon: CloudRain,
      color: "#d97706"
    },
    {
      title: t.stepAiEngine || "4. AI Engine",
      sub: aiSub,
      icon: Cpu,
      color: "#7c3aed"
    },
    {
      title: t.stepHeroDecision || "5. Hero Decision",
      sub: heroSub,
      icon: CheckCircle2,
      color: "#dc2626"
    }
  ];

  return (
    <div className="ks-card" style={{ 
      background: 'linear-gradient(135deg, #092e1b 0%, #134e2a 100%)',
      color: 'white',
      borderRadius: 'var(--radius-xl)',
      padding: '1.25rem',
      border: '1px solid rgba(134, 239, 172, 0.3)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            background: 'rgba(34, 197, 94, 0.25)',
            borderRadius: '8px',
            padding: '0.35rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Database size={18} color="#86efac" />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#f0fdf4' }}>
              {t.connectiveLoop || "The Connective Loop"}
            </h3>
            <p style={{ fontSize: '0.75rem', color: '#bbf7d0' }}>
              {t.connectiveLoopSubtitle || "How persistent farm history + live weather + mandi prices turn into personalized decisions"}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            id="btn-suggest-crop-to-sow"
            onClick={() => openCropPlanner && openCropPlanner()}
            style={{
              background: '#22c55e',
              color: '#052e16',
              fontSize: '0.75rem',
              fontWeight: 800,
              padding: '0.3rem 0.75rem',
              borderRadius: '999px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              border: 'none',
              cursor: 'pointer'
            }}
            title={t.suggestCropToSowDesc || "Analyze soil, season, and verified market trends to suggest optimal crops"}
          >
            <Sprout size={13} color="#052e16" />
            <span>{t.suggestCropToSow || 'Suggest Crop to Sow'}</span>
          </button>

          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              color: 'white',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.3rem 0.65rem',
              borderRadius: '999px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <Info size={13} />
            <span>{expanded ? (t.collapseLoop || "Collapse Loop") : (t.howLoopWorks || "How Loop Works")}</span>
          </button>
        </div>
      </div>

      {/* Horizontal Pipeline Step Flow */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '0.75rem',
        marginTop: '0.5rem'
      }}>
        {steps.map((step, idx) => {
          const StepIcon = step.icon;
          return (
            <div 
              key={idx}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                padding: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <div style={{
                  background: step.color,
                  borderRadius: '6px',
                  padding: '0.3rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  <StepIcon size={14} />
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f0fdf4' }}>
                  {step.title}
                </span>
              </div>
              <p style={{ fontSize: '0.72rem', color: '#dcfce7', lineHeight: 1.3 }}>
                {step.sub}
              </p>
            </div>
          );
        })}
      </div>

      {expanded && (
        <div style={{
          marginTop: '1rem',
          padding: '0.85rem',
          background: 'rgba(0, 0, 0, 0.25)',
          borderRadius: '10px',
          fontSize: '0.8rem',
          lineHeight: 1.5,
          color: '#e2e8f0',
          borderLeft: '3px solid #4ade80'
        }}>
          <strong>{t.loopBreakthroughTitle || "The KisanSathi Breakthrough:"}</strong> {t.loopBreakthroughText || "Generic weather apps only tell the farmer 'it will rain tomorrow'. Generic mandi apps only list price numbers. KisanSathi connects the farmer's scheduled calendar operations with live radar rain probabilities, cross-referencing input costs and chemical rainfastness to automatically alert the farmer with actionable rescheduling."}
        </div>
      )}
    </div>
  );
};
