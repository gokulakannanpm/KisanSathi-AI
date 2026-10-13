import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  Send, 
  Bot, 
  User,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  AlertCircle
} from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';
import { apiService } from '../../services/api';
import { translations } from '../../services/i18n';

export const AIExplainerModal = () => {
  const { isAiModalOpen, closeAiExplainer, aiModalContext, farmerId, farmer, language, t } = useFarmer();
  // Safe translation object
  const activeT = t || translations[language] || translations.en;

  const [messages, setMessages] = useState([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [providerUsed, setProviderUsed] = useState('');

  // Voice Interaction State
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [currentlySpeakingIdx, setCurrentlySpeakingIdx] = useState(null);

  const recognitionRef = useRef(null);
  const hasFetchedRef = useRef(false);

  // Stop active speech synthesis when closing or unmounting
  const stopSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setCurrentlySpeakingIdx(null);
    }
  };

  // Stop recognition
  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // Already stopped
      }
      setIsListening(false);
    }
  };

  // Setup Web Speech Recognition
  const toggleListening = () => {
    setVoiceError('');
    if (isListening) {
      stopListening();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError(activeT.voiceNotSupported || "Speech recognition is not supported in this browser. Please type your query.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;

      // Map app language to speech recognition tag
      const langMap = {
        en: 'en-IN',
        hi: 'hi-IN',
        ta: 'ta-IN',
        mr: 'mr-IN'
      };
      recognition.lang = langMap[language] || 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceError('');
      };

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setInputQuestion(transcript);
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setVoiceError(activeT.micPermissionDenied || "Microphone permission was denied. Please allow microphone access.");
        } else if (event.error === 'no-speech') {
          setVoiceError(activeT.noSpeechDetected || "No speech was detected. Please try speaking again.");
        } else {
          setVoiceError(`${activeT.voiceError || 'Voice recognition error'}: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      console.error("SpeechRecognition error:", e);
      setIsListening(false);
      setVoiceError("Unable to access microphone. Please type your question.");
    }
  };

  // Voice Output (Text-to-Speech)
  const toggleSpeech = (text, idx) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setVoiceError(activeT.ttsNotSupported || "Audio speech playback is not supported in this browser.");
      return;
    }

    if (currentlySpeakingIdx === idx) {
      stopSpeech();
      return;
    }

    stopSpeech();

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      const langMap = {
        en: 'en-IN',
        hi: 'hi-IN',
        ta: 'ta-IN',
        mr: 'mr-IN'
      };
      utterance.lang = langMap[language] || 'en-IN';
      utterance.rate = 0.95;

      utterance.onend = () => {
        setCurrentlySpeakingIdx(null);
      };

      utterance.onerror = (e) => {
        console.warn("Speech synthesis error:", e);
        setCurrentlySpeakingIdx(null);
      };

      setCurrentlySpeakingIdx(idx);
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("TTS initiation failed:", err);
      setCurrentlySpeakingIdx(null);
    }
  };

  // Fetch initial AI explanation from backend when modal opens
  useEffect(() => {
    if (isAiModalOpen) {
      if (hasFetchedRef.current) return;
      hasFetchedRef.current = true;

      let isMounted = true;
      setLoading(true);

      const safetyTimer = setTimeout(() => {
        if (isMounted) setLoading(false);
      }, 15000);

      apiService.askAiExplain({
        farmer_id: farmerId || farmer?.id || 'demo_farmer_01',
        context: aiModalContext,
        language: language || 'en'
      }).then(res => {
        if (!isMounted) return;
        setProviderUsed(res.provider_used || 'Rule Engine Fallback');
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
            text: aiModalContext?.ai_explanation || `Advisory based on farm memory and regional atmospheric conditions.`
          }
        ]);
      }).finally(() => {
        clearTimeout(safetyTimer);
        if (isMounted) setLoading(false);
      });

      return () => {
        isMounted = false;
        clearTimeout(safetyTimer);
        stopSpeech();
        stopListening();
      };
    } else {
      hasFetchedRef.current = false;
      setMessages([]);
      setLoading(false);
      stopSpeech();
      stopListening();
    }
  }, [isAiModalOpen]);

  if (!isAiModalOpen) return null;

  const handleAsk = async (e) => {
    e.preventDefault();
    const queryText = inputQuestion.trim();
    if (!queryText || loading) return;

    stopListening();
    stopSpeech();

    setInputQuestion('');
    setMessages(prev => [...prev, { sender: 'user', text: queryText }]);
    setLoading(true);

    let isMounted = true;
    const safetyTimer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 15000);

    try {
      const response = await apiService.askAiExplain({
        farmer_id: farmerId || farmer?.id || 'demo_farmer_01',
        question: queryText,
        context: aiModalContext,
        language: language || 'en'
      });

      if (!isMounted) return;
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
      if (!isMounted) return;
      console.error("AI question fetch error:", e);
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: "AI Assistant Note: Live AI service is currently unavailable. Operating in localized agricultural fallback mode."
        }
      ]);
    } finally {
      clearTimeout(safetyTimer);
      if (isMounted) setLoading(false);
    }
  };

  const handleClose = () => {
    stopSpeech();
    stopListening();
    closeAiExplainer();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
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
                  {activeT.aiModalTitle || "KisanSathi AI Farm Assistant"}
                </h2>
                {providerUsed && (
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    background: providerUsed.includes("Live AI") ? "#dcfce7" : "#fef3c7",
                    color: providerUsed.includes("Live AI") ? "#15803d" : "#b45309",
                    padding: '0.15rem 0.45rem',
                    borderRadius: '999px',
                    border: `1px solid ${providerUsed.includes("Live AI") ? "#86efac" : "#fcd34d"}`
                  }}>
                    {providerUsed.includes("Live AI") ? providerUsed : "Rule Engine Fallback"}
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {activeT.aiModalSubtitle || "Contextual agricultural reasoning"} ({farmer?.name || 'Farmer'})
              </p>
            </div>
          </div>

          <button 
            onClick={handleClose} 
            style={{ background: '#f1f5f9', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Voice Feedback Banner */}
        {voiceError && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            borderRadius: '8px',
            padding: '0.5rem 0.75rem',
            fontSize: '0.8rem',
            marginBottom: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{voiceError}</span>
          </div>
        )}

        {isListening && (
          <div style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            borderRadius: '8px',
            padding: '0.5rem 0.75rem',
            fontSize: '0.82rem',
            marginBottom: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', animation: 'pulse 1.5s infinite' }} />
              <strong>{activeT.listeningNow || "Listening... Speak your question in your language"}</strong>
            </div>
            <button
              onClick={stopListening}
              style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 700, textDecoration: 'underline' }}
            >
              Done
            </button>
          </div>
        )}

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
                whiteSpace: 'pre-line',
                position: 'relative'
              }}>
                {msg.text}

                {/* Voice Read Aloud Button for AI responses */}
                {msg.sender === 'ai' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.4rem' }}>
                    <button
                      onClick={() => toggleSpeech(msg.text, idx)}
                      title={currentlySpeakingIdx === idx ? "Stop Audio" : "Read Aloud"}
                      style={{
                        background: currentlySpeakingIdx === idx ? '#fee2e2' : '#f1f5f9',
                        color: currentlySpeakingIdx === idx ? '#b91c1c' : '#475569',
                        border: 'none',
                        borderRadius: '999px',
                        padding: '0.2rem 0.5rem',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        cursor: 'pointer'
                      }}
                    >
                      {currentlySpeakingIdx === idx ? (
                        <>
                          <VolumeX size={13} />
                          <span>{activeT.stopReading || 'Stop'}</span>
                        </>
                      ) : (
                        <>
                          <Volume2 size={13} />
                          <span>{activeT.readAloud || 'Listen'}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {msg.action_steps && msg.action_steps.length > 0 && (
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                    <strong>{activeT.recommendedActionSteps || "Recommended Action Steps:"}</strong>
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
              <span>{activeT.aiModalLoading || "KisanSathi AI is analyzing farm memory..."}</span>
            </div>
          )}
        </div>

        {/* Input form with Voice Recognition Microphone Control */}
        <form onSubmit={handleAsk} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="text"
            placeholder={activeT.aiModalPlaceholder || "Ask anything or tap mic to speak..."}
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

          {/* Microphone Voice Button */}
          <button
            type="button"
            onClick={toggleListening}
            title={isListening ? (activeT.stopListening || "Stop Listening") : (activeT.listen || "Speak question in your language")}
            style={{
              background: isListening ? '#ef4444' : '#f1f5f9',
              color: isListening ? 'white' : '#475569',
              border: isListening ? '1px solid #dc2626' : '1px solid var(--border-medium)',
              borderRadius: '50%',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              flexShrink: 0
            }}
            aria-label="Toggle Voice Input"
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          <button
            type="submit"
            disabled={loading || !inputQuestion.trim()}
            className="btn-primary"
            style={{ borderRadius: 'var(--radius-full)', padding: '0.65rem 1.15rem', flexShrink: 0 }}
          >
            <Send size={16} />
          </button>
        </form>

      </div>
    </div>
  );
};
