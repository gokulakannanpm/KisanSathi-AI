import React from 'react';
import { BookOpen, Plus, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';

export const DiarySnapshot = ({ onAddEntryClick }) => {
  const { diary, t, setActiveTab } = useFarmer();
  const recentEntries = diary.slice(0, 5);

  return (
    <div className="ks-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <BookOpen size={20} color="#7c3aed" />
          <span>{t.diaryTitle}</span>
        </h3>
        <button
          onClick={onAddEntryClick}
          style={{
            background: 'var(--primary-subtle)',
            color: 'var(--primary-dark)',
            border: '1px solid #86efac',
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '0.25rem 0.65rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}
        >
          <Plus size={14} />
          <span>{t.addDiaryEntry}</span>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
        {recentEntries.map((entry, idx) => {
          const isPlanned = entry.status === 'planned';
          return (
            <div
              key={entry.id || idx}
              style={{
                background: isPlanned ? '#fffbeb' : '#f8fafc',
                borderLeft: `4px solid ${isPlanned ? '#f59e0b' : '#22c55e'}`,
                borderRadius: '8px',
                padding: '0.5rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
                    {entry.activity_type}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'capitalize' }}>
                    ({entry.crop})
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#475569', maxWidth: '380px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.notes}
                </div>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: isPlanned ? '#b45309' : '#15803d',
                  background: isPlanned ? '#fef3c7' : '#dcfce7',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '999px'
                }}>
                  {isPlanned ? 'Planned' : 'Done'}
                </span>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                  {entry.date}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => setActiveTab('diary')}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700 }}
      >
        <span>View Full Farm Timeline & Diary History</span>
        <ArrowRight size={14} />
      </button>
    </div>
  );
};
