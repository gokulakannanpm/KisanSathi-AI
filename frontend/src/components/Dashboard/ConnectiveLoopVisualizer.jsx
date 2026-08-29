import React, { useState } from 'react';
import { 
  User, 
  BookOpen, 
  CloudRain, 
  TrendingUp, 
  Cpu, 
  CheckCircle2, 
  ArrowRight,
  Database,
  Info
} from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';

export const ConnectiveLoopVisualizer = () => {
  const { t } = useFarmer();
  const [expanded, setExpanded] = useState(false);

  const steps = [
    {
      title: t.stepFarmerContext,
      sub: "2.5 Acres, Cotton/Soybean, Nagpur",
      icon: User,
      color: "#16a34a"
    },
    {
      title: t.stepFarmDiary,
      sub: "Spraying planned tomorrow 2 PM",
      icon: BookOpen,
      color: "#0284c7"
    },
    {
      title: t.stepLiveWeather,
      sub: "88% Thunderstorm (45-60mm rain)",
      icon: CloudRain,
      color: "#d97706"
    },
    {
      title: t.stepAiEngine,
      sub: "Cross-checks chemical rainfastness",
      icon: Cpu,
      color: "#7c3aed"
    },
    {
      title: t.stepHeroDecision,
      sub: "Postpone to Saturday -> Saves ₹1,800",
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
      marginBottom: '1.5rem',
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
              {t.connectiveLoop}
            </h3>
            <p style={{ fontSize: '0.75rem', color: '#bbf7d0' }}>
              {t.connectiveLoopSubtitle}
            </p>
          </div>
        </div>

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
            gap: '0.3rem'
          }}
        >
          <Info size={13} />
          <span>{expanded ? t.collapseLoop : t.howLoopWorks}</span>
        </button>
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
          <strong>The KisanSathi Breakthrough:</strong> Generic weather apps only tell the farmer "it will rain tomorrow". Generic mandi apps only list price numbers. KisanSathi connects the farmer's scheduled calendar entry (spraying tomorrow) with live radar rain probabilities, realizing that rainfall will wash away ₹1,800 worth of pesticide, and automatically alerts the farmer to reschedule — closing the feedback loop back into farm memory.
        </div>
      )}
    </div>
  );
};
