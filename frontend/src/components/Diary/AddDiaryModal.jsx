import React, { useState } from 'react';
import { X, Save, PlusCircle, AlertCircle } from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';

export const AddDiaryModal = ({ isOpen, onClose }) => {
  const { addDiaryEntry, t, farmer } = useFarmer();
  const [activityType, setActivityType] = useState('Pesticide Spraying');
  const [crop, setCrop] = useState('cotton');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('planned');
  const [notes, setNotes] = useState('');
  const [quantityCost, setQuantityCost] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!notes.trim()) return;

    setSubmitting(true);
    try {
      await addDiaryEntry({
        activity_type: activityType,
        crop,
        date,
        status,
        notes,
        quantity_cost: quantityCost || undefined
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '1.5rem' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
            {t.addDiaryEntry}
          </h2>
          <button onClick={onClose} style={{ background: '#f1f5f9', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                {t.activityType}
              </label>
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-medium)', background: '#fff' }}
              >
                <option value="Pesticide Spraying">Pesticide Spraying</option>
                <option value="Fertilizer Application">Fertilizer Application</option>
                <option value="Drip Irrigation">Drip Irrigation</option>
                <option value="Sowing">Sowing</option>
                <option value="Weeding">Weeding</option>
                <option value="Harvesting">Harvesting</option>
                <option value="Market Sale">Market Sale</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                {t.crop}
              </label>
              <select
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-medium)', background: '#fff' }}
              >
                <option value="cotton">Cotton (कपास)</option>
                <option value="soybean">Soybean (सोयाबीन)</option>
                <option value="wheat">Wheat (गेहूं)</option>
                <option value="gram">Gram (चना)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                {t.date}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-medium)', background: '#fff' }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                {t.status}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-medium)', background: '#fff' }}
              >
                <option value="planned">Planned (Upcoming)</option>
                <option value="completed">Completed (Done)</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
              {t.notes}
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Scheduled Chlorpyrifos spray for pink bollworm prevention across Plot A..."
              style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-medium)', background: '#fff' }}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
              {t.costQuantity}
            </label>
            <input
              type="text"
              value={quantityCost}
              onChange={(e) => setQuantityCost(e.target.value)}
              placeholder="e.g. ₹1,800 or 50kg bag"
              style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-medium)', background: '#fff' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
              style={{ flex: 1 }}
            >
              <Save size={18} />
              <span>{submitting ? 'Saving...' : t.saveEntry}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              {t.cancel}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
