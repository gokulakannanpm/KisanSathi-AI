import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  Cpu, 
  ShieldCheck, 
  HelpCircle 
} from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';
import { apiService } from '../../services/api';

export const AIExplainerModal = () => {
  const { isAiModalOpen, closeAiExplainer, aiModalContext, farmerId, farmer } = useFarmer();
  const [messages, setMessages] = useState([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [providerUsed, setProviderUsed] = useState('');

  // Fetch initial AI explanation from backend when modal opens
  useEffect(() => {
    if (isAiModalOpen) {
      let isMounted = true;
      setLoading(true);

      apiService.askAiExplain({
        farmer_id: farmerId || farmer?.id || 'demo_farmer_01',
        context: aiModalContext
      }).then(res => {
        if (!isMounted) return;
        setProviderUsed(res.provider_used || 'KisanSathi Farm Intelligence Engine');
        setMessages([
          {
            sender: 'ai',
            text: res.explanation_text,
            action_steps: res.action_steps,
            provider: res.provider_used
          }
        ]);
      }).catch(err => {
        if (!isMounted) return;
        console.error("AI Explainer fetch error:", err);
        setMessages([
          {
            sender: 'ai',
            text: aiModalContext?.ai_explanation || `Analysis based on live farm memory and regional atmospheric radar conditions.`
          }
        ]);
      }).finally(() => {
        if (isMounted) setLoading(false);
      });

      return () => {
        isMounted = false;
      };
    }
  }, [isAiModalOpen, farmerId, aiModalContext]);

  if (!isAiModalOpen) return null;

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!inputQuestion.trim() || loading) return;

    const userText = inputQuestion;
    setInputQuestion('');
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);

    try {
      const response = await apiService.askAiExplain({
        farmer_id: farmerId || farmer?.id || 'demo_farmer_01',
        question: userText,
        context: aiModalContext
      });

      setProviderUsed(response.provider_used || providerUsed);

      setMessages(prev => [
        ...prev, 
        { 
          sender: 'ai', 
          text: response.explanation_text,
          action_steps: response.action_steps,
          provider: response.provider_used
        }
      ]);
    } catch (e) {
      console.error("AI question fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={closeAiExplainer}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '1.25rem', maxWidth: '640px' }}>
        
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white',
              borderRadius: '10px',
              padding: '0.4rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  KisanSathi AI Farm Assistant
                </h2>
                {providerUsed && (
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    background: providerUsed.includes("Offline") ? "#fef3c7" : "#dcfce7",
                    color: providerUsed.includes("Offline") ? "#b45309" : "#15803d",
                    padding: '0.15rem 0.45rem',
                    borderRadius: '999px',
                    border: `1px solid ${providerUsed.includes("Offline") ? "#fcd34d" : "#86efac"}`
                  }}>
                    {providerUsed.includes("Offline") ? "Fallback Mode" : "Live Rule AI Engine"}
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Contextual agricultural reasoning & plain-language explanations for {farmer?.name || 'Farmer'}
              </p>
            </div>
          </div>

          <button onClick={closeAiExplainer} style={{ background: '#f1f5f9', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} />
          </button>
        </div>

        {/* Chat / Explanation Stream */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
          maxHeight: '380px',
          overflowY: 'auto',
          padding: '0.5rem',
          marginBottom: '1rem'
        }}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: '0.65rem',
                alignItems: 'flex-start',
                flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row'
              }}
            >
              <div style={{
                background: msg.sender === 'user' ? '#15803d' : '#f8fafc',
                color: msg.sender === 'user' ? 'white' : '#15803d',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {msg.sender === 'user' ? <User size={16} /> : <Bot size={18} color="#d97706" />}
              </div>

              <div style={{
                background: msg.sender === 'user' ? '#15803d' : '#f8fafc',
                color: msg.sender === 'user' ? 'white' : '#0f172a',
                padding: '0.85rem 1rem',
                borderRadius: '14px',
                maxWidth: '85%',
                fontSize: '0.88rem',
                lineHeight: 1.55,
                border: msg.sender === 'user' ? 'none' : '1px solid var(--border-medium)',
                whiteSpace: 'pre-line'
              }}>
                {msg.text}

                {msg.action_steps && msg.action_steps.length > 0 && (
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                    <strong>Recommended Action Steps:</strong>
                    <ul style={{ paddingLeft: '1.2rem', marginTop: '0.25rem' }}>
                      {msg.action_steps.map((st, i) => (
                        <li key={i}>{st}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#64748b', fontSize: '0.85rem' }}>
              <Sparkles size={16} className="animate-spin" color="#d97706" />
              <span>KisanSathi AI is analyzing farm memory...</span>
            </div>
          )}
        </div>

        {/* Input form */}
        <form onSubmit={handleAsk} style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder="Ask anything (e.g. 'Why should I wait until Saturday to spray?')"
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            style={{
              flex: 1,
              padding: '0.65rem 1rem',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-medium)',
              background: '#ffffff',
              fontSize: '0.88rem'
            }}
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ borderRadius: 'var(--radius-full)', padding: '0.65rem 1.25rem' }}
          >
            <Send size={16} />
          </button>
        </form>

      </div>
    </div>
  );
};
