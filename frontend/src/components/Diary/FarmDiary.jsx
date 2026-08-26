import React, { useState } from 'react';
import { 
  BookOpen, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Tag, 
  Coins, 
  AlertCircle 
} from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';

export const FarmDiary = ({ onAddEntryClick }) => {
  const { diary, t } = useFarmer();
  const [selectedFilter, setSelectedFilter] = useState('all');

  const filteredEntries = diary.filter((entry) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'planned') return entry.status === 'planned';
    if (selectedFilter === 'completed') return entry.status === 'completed';
    return entry.crop?.toLowerCase() === selectedFilter.toLowerCase();
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* View Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 className="section-title">
            <BookOpen size={24} color="#7c3aed" />
            <span>{t.diaryTitle}</span>
          </h2>
          <p className="section-subtitle">
            {t.diarySubtitle}
          </p>
        </div>

        <button
          onClick={onAddEntryClick}
          className="btn-primary"
          style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)' }}
        >
          <Plus size={18} />
          <span>{t.addDiaryEntry}</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '4px' }}>
        {[
          { id: 'all', label: 'All Activities' },
          { id: 'planned', label: 'Planned Tasks' },
          { id: 'completed', label: 'Completed Actions' },
          { id: 'cotton', label: 'Cotton' },
          { id: 'soybean', label: 'Soybean' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedFilter(tab.id)}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '999px',
              fontWeight: 700,
              fontSize: '0.8rem',
              background: selectedFilter === tab.id ? '#7c3aed' : '#ffffff',
              color: selectedFilter === tab.id ? 'white' : '#64748b',
              border: '1px solid var(--border-subtle)',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Chronological Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
        {filteredEntries.map((entry, idx) => {
          const isPlanned = entry.status === 'planned';
          return (
            <div
              key={entry.id || idx}
              className="ks-card"
              style={{
                borderLeft: `5px solid ${isPlanned ? '#f59e0b' : '#22c55e'}`,
                background: isPlanned ? '#fffdf7' : '#ffffff'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                      {entry.activity_type}
                    </h3>
                    <span style={{
                      background: 'rgba(124, 58, 237, 0.1)',
                      color: '#7c3aed',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '999px',
                      textTransform: 'capitalize'
                    }}>
                      {entry.crop}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className={`badge ${isPlanned ? 'badge-warning' : 'badge-eligible'}`}>
                    {isPlanned ? (
                      <>
                        <Clock size={12} />
                        <span>Planned Action</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={12} />
                        <span>Completed</span>
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                {entry.notes}
              </p>

              {/* Bottom Metadata */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.78rem',
                color: '#64748b',
                paddingTop: '0.5rem',
                borderTop: '1px solid var(--border-subtle)'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Calendar size={14} />
                  <span>{entry.date}</span>
                </span>

                {entry.quantity_cost && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#15803d', fontWeight: 700 }}>
                    <Coins size={14} />
                    <span>{entry.quantity_cost}</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
