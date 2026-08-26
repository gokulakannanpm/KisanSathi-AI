import React from 'react';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  FileCheck, 
  ListOrdered, 
  Building2, 
  Sparkles 
} from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';
import { AudioNarrationButton } from '../Common/AudioNarrationButton';

export const SchemeDetailModal = () => {
  const { selectedScheme, setSelectedScheme, t, openAiExplainer } = useFarmer();
  if (!selectedScheme) return null;

  return (
    <div className="modal-overlay" onClick={() => setSelectedScheme(null)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '1.5rem' }}>
        
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <span className={`badge ${selectedScheme.eligible ? 'badge-eligible' : 'badge-ineligible'}`}>
                {selectedScheme.eligible ? t.eligible : t.notEligible}
              </span>
              <AudioNarrationButton scheme={selectedScheme} />
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.25 }}>
              {selectedScheme.name}
            </h2>
          </div>

          <button
            onClick={() => setSelectedScheme(null)}
            style={{
              background: '#f1f5f9',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b'
            }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Description */}
        <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.6, marginBottom: '1.25rem' }}>
          {selectedScheme.description}
        </p>

        {/* Benefits Box */}
        <div style={{
          background: '#f0fdf4',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          border: '1px solid #86efac',
          marginBottom: '1.25rem'
        }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            {t.benefits}
          </h3>
          <p style={{ fontSize: '0.95rem', color: '#14532d', fontWeight: 600, lineHeight: 1.5 }}>
            {selectedScheme.benefits}
          </p>
        </div>

        {/* Eligibility Verification Breakdown */}
        {selectedScheme.eligibility_reasons && (
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
              {t.eligibilityReasons}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {selectedScheme.eligibility_reasons.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.85rem', color: '#334155' }}>
                  <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Required Documents */}
        {selectedScheme.required_documents && selectedScheme.required_documents.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FileCheck size={18} color="var(--primary)" />
              <span>{t.documentsRequired}</span>
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.4rem' }}>
              {selectedScheme.required_documents.map((doc, dIdx) => (
                <div key={dIdx} style={{
                  background: '#f8fafc',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  color: '#334155',
                  border: '1px solid var(--border-subtle)'
                }}>
                  • {doc}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Application Steps */}
        {selectedScheme.application_steps && selectedScheme.application_steps.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ListOrdered size={18} color="#0284c7" />
              <span>{t.applicationSteps}</span>
            </h3>
            <ol style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: '#334155', lineHeight: 1.6 }}>
              {selectedScheme.application_steps.map((step, sIdx) => (
                <li key={sIdx} style={{ marginBottom: '0.35rem' }}>{step}</li>
              ))}
            </ol>
          </div>
        )}

        {/* Footer Link & Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
          {selectedScheme.official_application_link && (
            <a
              href={selectedScheme.official_application_link}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
              style={{ flex: '1', minWidth: '180px' }}
            >
              <span>{t.applyOnline}</span>
              <ExternalLink size={16} />
            </a>
          )}

          <button
            onClick={() => {
              openAiExplainer({
                headline: `Government Scheme Guidance: ${selectedScheme.name}`,
                reasoning: `Eligibility & application procedure assistance for ${selectedScheme.name}`,
                ai_explanation: selectedScheme.benefits + "\n\nApplication Guide: " + selectedScheme.application_steps.join(" ")
              });
            }}
            className="btn-secondary"
          >
            <Sparkles size={16} color="#d97706" />
            <span>Ask AI About Scheme</span>
          </button>
        </div>

      </div>
    </div>
  );
};
