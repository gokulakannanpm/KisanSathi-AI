import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Sparkles, 
  Calendar, 
  ShieldCheck, 
  Clock, 
  Coins, 
  Check, 
  ArrowRight,
  HelpCircle,
  TrendingUp,
  CloudRain
} from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';

export const HeroRecommendation = () => {
  const { recommendation, acknowledgeRecommendationAction, t, openAiExplainer } = useFarmer();
  const [submitting, setSubmitting] = useState(false);

  if (!recommendation) return null;

  const isCompleted = recommendation.is_acknowledged;

  const handleToggleAcknowledge = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await acknowledgeRecommendationAction({
        action_key: "postpone_action",
        status: isCompleted ? "pending" : "postponed",
        postponed_to_date: recommendation.recommended_new_date || "Saturday, 29 August 2026"
      });
    } catch (e) {
      console.error("Failed to acknowledge action:", e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section 
      className="hero-decision-card warning-mode" 
      style={{ padding: '1.5rem', marginBottom: '1.5rem' }}
      aria-label="Priority AI Recommendation"
    >
      {/* Top Banner Status */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        flexWrap: 'wrap', 
        gap: '0.75rem',
        marginBottom: '1rem' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-warning" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
            <AlertTriangle size={14} strokeWidth={2.5} />
            <span>{t.recommendationHero}</span>
          </span>
          <span style={{
            background: 'rgba(217, 119, 6, 0.15)',
            color: '#b45309',
            fontWeight: 700,
            fontSize: '0.75rem',
            padding: '0.3rem 0.6rem',
            borderRadius: '999px'
          }}>
            {t.confidence}: {recommendation.confidence || 96}%
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#78350f', fontWeight: 600 }}>
          <Clock size={14} />
          <span>{isCompleted ? (recommendation.status_label || 'Acknowledged & Rescheduled') : 'Active Farm Alert'}</span>
        </div>
      </div>

      {/* Hero Decision Headline */}
      <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ 
          fontSize: '1.45rem', 
          fontWeight: 800, 
          color: '#9a3412',
          lineHeight: 1.25,
          letterSpacing: '-0.01em',
          marginBottom: '0.5rem'
        }}>
          {recommendation.headline || recommendation.action}
        </h2>
        
        {/* Core Reasoning in Large Readable Font */}
        <p style={{ 
          fontSize: '1.05rem', 
          color: '#1f2937', 
          fontWeight: 500,
          lineHeight: 1.6,
          background: 'rgba(255, 255, 255, 0.85)',
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          borderLeft: '4px solid #d97706',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
        }}>
          <strong>{t.reasoning}:</strong> {recommendation.reasoning}
        </p>
      </div>

      {/* Impact & Recommended Alternative Pills */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '0.75rem',
        marginBottom: '1.25rem'
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 1rem',
          border: '1px solid #fed7aa',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem'
        }}>
          <div style={{
            background: '#ffedd5',
            color: '#c2410c',
            borderRadius: '8px',
            padding: '0.45rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Coins size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              {t.estimatedImpact}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#15803d', fontWeight: 700 }}>
              {recommendation.estimated_impact || 'Saves ₹1,800 + Protects Crop Health'}
            </div>
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 1rem',
          border: '1px solid #fed7aa',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem'
        }}>
          <div style={{
            background: '#dcfce7',
            color: '#15803d',
            borderRadius: '8px',
            padding: '0.45rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Calendar size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              Optimal Rescheduled Window
            </div>
            <div style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 700 }}>
              {recommendation.recommended_new_date || 'Saturday, 29 Aug (07:30 AM)'}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.75rem', 
        flexWrap: 'wrap' 
      }}>
        <button
          onClick={() => openAiExplainer(recommendation)}
          className="btn-primary"
          style={{
            background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
            boxShadow: '0 4px 12px rgba(217, 119, 6, 0.35)'
          }}
        >
          <Sparkles size={18} />
          <span>{t.exploreAiDeepDive}</span>
        </button>

        <button
          onClick={handleToggleAcknowledge}
          disabled={submitting}
          className="btn-secondary"
          style={{
            background: isCompleted ? '#dcfce7' : '#ffffff',
            borderColor: isCompleted ? '#86efac' : 'var(--border-medium)',
            color: isCompleted ? '#166534' : 'var(--text-main)'
          }}
        >
          {isCompleted ? (
            <>
              <Check size={18} color="#166534" />
              <span>{t.actionPostponed}</span>
            </>
          ) : (
            <>
              <ShieldCheck size={18} />
              <span>{submitting ? 'Saving...' : 'Acknowledge & Postpone'}</span>
            </>
          )}
        </button>
      </div>
    </section>
  );
};
