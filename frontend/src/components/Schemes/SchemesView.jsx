import React, { useState } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Search, 
  ChevronRight, 
  Info,
  AlertTriangle
} from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';
import { AudioNarrationButton } from '../Common/AudioNarrationButton';

export const SchemesView = () => {
  const { schemes, setSelectedScheme, t, farmer } = useFarmer();
  // Matching / eligible schemes is the default primary view
  const [filterEligibleOnly, setFilterEligibleOnly] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const eligibleCount = schemes.filter(s => s.eligible).length;

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
          <span>{t.schemesHeader || "Government Schemes & Subsidies"}</span>
        </h2>
        <p className="section-subtitle">
          {farmer ? (
            <>
              {t.schemesEvaluatedFor || "Deterministic, rule-based matching evaluated for"} {farmer.name}'s <strong>{farmer.land_size_acres} {t.perAcre || "Acre"}</strong> {farmer.state || ''}
            </>
          ) : (
            <>
              {t.schemesGeneralCatalogue || "Displaying government schemes catalogue with general eligibility criteria."}
            </>
          )}
        </p>
      </div>

      {/* Profile-Unavailable State Banner */}
      {!farmer && (
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fef3c7',
          borderRadius: 'var(--radius-lg)',
          padding: '0.85rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.85rem',
          color: '#92400e'
        }}>
          <AlertTriangle size={20} color="#d97706" style={{ flexShrink: 0 }} />
          <div>
            <strong>{t.farmerProfileUnavailable || "Farmer Profile Unavailable"}:</strong> {t.farmerProfileUnavailableDesc || "Personalized eligibility evaluation requires an active farmer profile. Please select or register a farmer in the top bar to verify landholding and crop rules. General criteria shown below."}
          </div>
        </div>
      )}

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
            placeholder={t.searchSchemePlaceholder || "Search scheme name or benefit..."}
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

        {/* Filter Toggle: Defaults to Eligible / Matching Schemes */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setFilterEligibleOnly(true)}
            style={{
              padding: '0.45rem 0.95rem',
              borderRadius: '999px',
              fontWeight: 700,
              fontSize: '0.8rem',
              background: filterEligibleOnly ? '#166534' : '#ffffff',
              color: filterEligibleOnly ? 'white' : '#166534',
              border: '1px solid #86efac',
              cursor: 'pointer'
            }}
          >
            {t.eligibleSchemes || "Eligible Schemes"} ({eligibleCount})
          </button>
          <button
            onClick={() => setFilterEligibleOnly(false)}
            style={{
              padding: '0.45rem 0.95rem',
              borderRadius: '999px',
              fontWeight: 700,
              fontSize: '0.8rem',
              background: !filterEligibleOnly ? '#15803d' : '#ffffff',
              color: !filterEligibleOnly ? 'white' : '#64748b',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer'
            }}
          >
            {t.allSchemes || "All Schemes"} ({schemes.length})
          </button>
        </div>
      </div>

      {/* Empty State */}
      {filteredSchemes.length === 0 && (
        <div className="ks-card" style={{
          textAlign: 'center',
          padding: '2.5rem 1.5rem',
          background: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          border: '1px dashed var(--border-medium)'
        }}>
          <Info size={36} color="#94a3b8" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.4rem' }}>
            {filterEligibleOnly ? (t.noMatchingEligibleSchemes || "No Matching Eligible Schemes") : (t.noSchemesFound || "No Schemes Found")}
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '440px', margin: '0 auto 1.25rem' }}>
            {filterEligibleOnly 
              ? (t.noEligibleSchemesHint || "Based on your current land size and crop preferences, no eligible schemes matched. Switch to 'All Schemes' to view universal central and state programmes.")
              : (t.noSchemesSearchHint || "No schemes match your search query.")}
          </p>
          {filterEligibleOnly && (
            <button
              onClick={() => setFilterEligibleOnly(false)}
              className="btn-primary"
              style={{ margin: '0 auto' }}
            >
              {t.switchToAllSchemes || "Switch to All Schemes"} ({schemes.length})
            </button>
          )}
        </div>
      )}

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
                borderLeft: `5px solid ${
                  scheme.eligibility_status === 'eligible' ? '#22c55e' :
                  scheme.eligibility_status === 'potentially_eligible' ? '#f59e0b' :
                  scheme.eligibility_status === 'insufficient_information' ? '#0284c7' : '#94a3b8'
                }`
              }}
              onClick={() => setSelectedScheme(scheme)}
            >
              <div>
                {/* Eligibility Badge & Audio Button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '0.5rem' }}>
                  {(() => {
                    const status = scheme.eligibility_status || (scheme.eligible ? 'eligible' : 'ineligible');
                    if (status === 'eligible') {
                      return (
                        <span className="badge badge-eligible">
                          <CheckCircle2 size={13} />
                          <span>{t.eligible || "Eligible"}</span>
                        </span>
                      );
                    } else if (status === 'potentially_eligible') {
                      return (
                        <span className="badge" style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fcd34d' }}>
                          <Info size={13} />
                          <span>{t.potentiallyEligible || "Potentially Eligible"}</span>
                        </span>
                      );
                    } else if (status === 'insufficient_information') {
                      return (
                        <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc' }}>
                          <AlertTriangle size={13} />
                          <span>{t.infoNeeded || "Details Needed"}</span>
                        </span>
                      );
                    } else {
                      return (
                        <span className="badge badge-ineligible">
                          <XCircle size={13} />
                          <span>{t.notEligible || "Not Eligible"}</span>
                        </span>
                      );
                    }
                  })()}

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
                    {t.benefits || "Benefits"}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#14532d', fontWeight: 600, lineHeight: 1.4 }}>
                    {scheme.benefits}
                  </div>
                </div>

                {/* Deterministic Eligibility Breakdown */}
                {scheme.eligibility_reasons && scheme.eligibility_reasons.length > 0 && (
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.75rem' }}>
                    <div style={{ fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                      {t.eligibilityVerification || "Eligibility Verification"}:
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
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedScheme(scheme);
                  }}
                  style={{
                    color: 'var(--primary)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <span>{t.viewDetailsApply || "View Details & Apply"}</span>
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
