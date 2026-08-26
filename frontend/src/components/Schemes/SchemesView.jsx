import React, { useState } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Search, 
  ExternalLink, 
  Volume2, 
  ChevronRight, 
  ShieldCheck, 
  Sparkles,
  Info
} from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';
import { AudioNarrationButton } from '../Common/AudioNarrationButton';

export const SchemesView = () => {
  const { schemes, setSelectedScheme, t, language, farmer } = useFarmer();
  const [filterEligibleOnly, setFilterEligibleOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSchemes = schemes.filter((s) => {
    const matchesEligibility = filterEligibleOnly ? s.eligible : true;
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesEligibility && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* View Header */}
      <div>
        <h2 className="section-title">
          <FileText size={24} color="#15803d" />
          <span>{t.schemesHeader}</span>
        </h2>
        <p className="section-subtitle">
          Deterministic, rule-based matching evaluated against your <strong>{farmer?.land_size_acres || 2.5} acre</strong> farm holding in {farmer?.state || 'Maharashtra'}
        </p>
      </div>

      {/* Search and Filters Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search scheme name or benefit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 0.75rem 0.65rem 2.4rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-medium)',
              background: '#ffffff',
              fontSize: '0.9rem'
            }}
          />
        </div>

        {/* Filter Toggle */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setFilterEligibleOnly(false)}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '999px',
              fontWeight: 700,
              fontSize: '0.8rem',
              background: !filterEligibleOnly ? '#15803d' : '#ffffff',
              color: !filterEligibleOnly ? 'white' : '#64748b',
              border: '1px solid var(--border-subtle)'
            }}
          >
            All Schemes ({schemes.length})
          </button>
          <button
            onClick={() => setFilterEligibleOnly(true)}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '999px',
              fontWeight: 700,
              fontSize: '0.8rem',
              background: filterEligibleOnly ? '#166534' : '#ffffff',
              color: filterEligibleOnly ? 'white' : '#166534',
              border: '1px solid #86efac'
            }}
          >
            Eligible Only ({schemes.filter(s => s.eligible).length})
          </button>
        </div>
      </div>

      {/* Schemes Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {filteredSchemes.map((scheme) => {
          return (
            <div 
              key={scheme.id} 
              className="ks-card ks-card-interactive"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderLeft: `5px solid ${scheme.eligible ? '#22c55e' : '#94a3b8'}`
              }}
              onClick={() => setSelectedScheme(scheme)}
            >
              <div>
                {/* Eligibility Badge & Audio Button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '0.5rem' }}>
                  <span className={`badge ${scheme.eligible ? 'badge-eligible' : 'badge-ineligible'}`}>
                    {scheme.eligible ? (
                      <>
                        <CheckCircle2 size={13} />
                        <span>{t.eligible}</span>
                      </>
                    ) : (
                      <>
                        <XCircle size={13} />
                        <span>{t.notEligible}</span>
                      </>
                    )}
                  </span>

                  <AudioNarrationButton scheme={scheme} />
                </div>

                {/* Scheme Title & Description */}
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.3, marginBottom: '0.5rem' }}>
                  {scheme.name}
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5, marginBottom: '0.85rem' }}>
                  {scheme.description}
                </p>

                {/* Benefits Pill */}
                <div style={{
                  background: '#f0fdf4',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem',
                  border: '1px solid #bbf7d0',
                  marginBottom: '0.75rem'
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                    {t.benefits}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#14532d', fontWeight: 600, lineHeight: 1.4 }}>
                    {scheme.benefits}
                  </div>
                </div>

                {/* Why Eligible Breakdown */}
                {scheme.eligibility_reasons && scheme.eligibility_reasons.length > 0 && (
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.75rem' }}>
                    <div style={{ fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                      Eligibility Verification:
                    </div>
                    <ul style={{ paddingLeft: '1.1rem', margin: 0 }}>
                      {scheme.eligibility_reasons.slice(0, 2).map((reason, rIdx) => (
                        <li key={rIdx} style={{ marginBottom: '0.2rem' }}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Action Buttons Footer */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--border-subtle)',
                marginTop: '0.5rem'
              }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {scheme.department || 'Govt of India'}
                </span>
                
                <button
                  style={{
                    color: 'var(--primary)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <span>View Details & Apply</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
