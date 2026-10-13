import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Send,
  Bot,
  User,
  Mic,
  MicOff,
  Compass,
  Languages,
  Square
} from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';
import { apiService } from '../../services/api';
import { translations } from '../../services/i18n';
import { matchVoiceCommand } from '../../services/voiceNavigation';

export const AIExplainerModal = () => {
  const {
    isAiModalOpen,
    closeAiExplainer,
    aiModalContext,
    farmerId,
    farmer,
    language,
    t,
    setActiveTab
  } = useFarmer();

  const activeT = t || translations[language] || translations.en;

  const [messages, setMessages] = useState([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [providerUsed, setProviderUsed] = useState('');

  // Interaction Modes:
  // - 'ta_qa': Mode A (Tamil speech -> Tamil answer)
  // - 'en_qa': Mode B (English speech -> English answer)
  // - 'translate_ta_en': Mode C (Tamil -> English translation)
  // - 'translate_en_ta': Mode D (English -> Tamil translation)
  // - 'voice_nav': Voice Navigation (Local deterministic whitelist)
  const [activeMode, setActiveMode] = useState(language === 'ta' ? 'ta_qa' : 'en_qa');
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState(null);

  const hasFetchedRef = useRef(false);
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);

  // Check Web Speech API capability in the current browser
  const isSpeechSupported = typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  // Get Web Speech recognition locale for the active mode
  const getRecognitionLang = (mode) => {
    if (mode === 'ta_qa' || mode === 'translate_ta_en') return 'ta-IN';
    if (mode === 'en_qa' || mode === 'translate_en_ta') return 'en-IN';
    // For voice navigation: respect current app language if Tamil, else en-IN
    return language === 'ta' ? 'ta-IN' : 'en-IN';
  };

  // Synchronize initial mode with app language when modal opens
  useEffect(() => {
    if (isAiModalOpen) {
      if (activeMode === 'ta_qa' && language === 'en') {
        setActiveMode('en_qa');
      } else if (activeMode === 'en_qa' && language === 'ta') {
        setActiveMode('ta_qa');
      }
    }
  }, [isAiModalOpen, language]);

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
        language: language || 'en',
        mode: 'qa'
      }).then(res => {
        if (!isMounted) return;
        setProviderUsed(res?.provider_used || 'Rule Engine Fallback');
        setMessages([
          {
            sender: 'ai',
            text: res?.explanation_text || (aiModalContext?.ai_explanation || "Advisory based on farm memory and regional atmospheric conditions."),
            action_steps: res?.action_steps,
            provider: res?.provider_used
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
      };
    } else {
      hasFetchedRef.current = false;
      setMessages([]);
      setLoading(false);
      setProviderUsed('');
      setSpeechError(null);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
      setIsListening(false);
      isListeningRef.current = false;
    }
  }, [isAiModalOpen, farmerId, farmer?.id, aiModalContext, language]);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  if (!isAiModalOpen) return null;

  // ---------------------------------------------------------------------------
  // Speech Recognition Controls (Web Speech API)
  // ---------------------------------------------------------------------------
  const startListening = () => {
    if (!isSpeechSupported) {
      setSpeechError(
        activeT.micUnsupported ||
        "Speech recognition is not supported in this browser. Please use Chrome, Edge, or a Web Speech API-compatible browser."
      );
      return;
    }

    // Prevent multiple simultaneous recording sessions
    if (isListeningRef.current) return;

    setSpeechError(null);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = getRecognitionLang(activeMode);

      recognition.onstart = () => {
        setIsListening(true);
        isListeningRef.current = true;
        setSpeechError(null);
      };

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript) {
          setInputQuestion(currentTranscript);
        }
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        isListeningRef.current = false;
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setSpeechError(
            activeT.micPermissionDenied ||
            "Microphone permission was denied. Please allow microphone access in your browser settings."
          );
        } else if (event.error === 'no-speech') {
          setSpeechError("No speech detected. Please speak closer to the microphone and try again.");
        } else if (event.error === 'network') {
          setSpeechError("Speech recognition network failure. Please verify internet connection.");
        } else {
          setSpeechError(`Speech recognition notice: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        isListeningRef.current = false;
        // Important: Never submit automatically on end. Let the user review and edit the transcript.
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn("Speech recognition initialization error:", err);
      setIsListening(false);
      isListeningRef.current = false;
      setSpeechError("Could not start speech recognition session. Please try again.");
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
    isListeningRef.current = false;
  };

  const cancelListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }
    setIsListening(false);
    isListeningRef.current = false;
    setSpeechError(null);
  };

  // ---------------------------------------------------------------------------
  // Submission Handler (Supports Q&A Modes, Translation Modes & Voice Nav)
  // ---------------------------------------------------------------------------
  const handleAsk = async (e) => {
    e.preventDefault();
    const queryText = inputQuestion.trim();
    // Prevent empty or duplicate submissions while loading or listening
    if (!queryText || loading || isListening) return;

    setInputQuestion('');
    setSpeechError(null);

    // MODE: Voice Navigation (Local deterministic whitelist - No Groq call)
    if (activeMode === 'voice_nav') {
      setMessages(prev => [...prev, { sender: 'user', text: queryText, mode: 'voice_nav' }]);
      const navResult = matchVoiceCommand(queryText);

      if (navResult.matched) {
        const feedback = language === 'ta' ? navResult.feedbackTa : navResult.feedbackEn;
        setMessages(prev => [
          ...prev,
          {
            sender: 'ai',
            text: `🧭 ${feedback}`,
            is_navigation: true,
            target_tab: navResult.tabId,
            provider: 'Voice Navigation Router (Local Whitelist)'
          }
        ]);
        setActiveTab(navResult.tabId);
        // Automatically close modal after brief confirmation so farmer sees the target tab
        setTimeout(() => {
          closeAiExplainer();
        }, 1200);
      } else {
        const feedback = language === 'ta' ? navResult.feedbackTa : navResult.feedbackEn;
        setMessages(prev => [
          ...prev,
          {
            sender: 'ai',
            text: `⚠️ ${feedback}`,
            is_navigation: false,
            provider: 'Voice Navigation Router'
          }
        ]);
      }
      return;
    }

    // MODES: Translation Modes (C, D) and Q&A Modes (A, B)
    const isTrans = activeMode === 'translate_ta_en' || activeMode === 'translate_en_ta';
    const targetLang = activeMode === 'translate_ta_en'
      ? 'en'
      : (activeMode === 'translate_en_ta'
        ? 'ta'
        : (activeMode === 'ta_qa' ? 'ta' : 'en'));

    setMessages(prev => [...prev, { sender: 'user', text: queryText, mode: activeMode }]);
    setLoading(true);

    let isMounted = true;
    const safetyTimer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 15000);

    try {
      const response = await apiService.askAiExplain({
        farmer_id: farmerId || farmer?.id || 'demo_farmer_01',
        question: queryText,
        // Translation requests must never be polluted with unrelated agricultural context
        context: isTrans ? null : aiModalContext,
        language: targetLang,
        mode: activeMode,
        is_translation: isTrans
      });

      if (!isMounted) return;
      setProviderUsed(response?.provider_used || providerUsed);
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: response?.explanation_text || "Advisory calculated from agronomic model.",
          action_steps: response?.action_steps,
          provider: response?.provider_used,
          is_translation: response?.is_translation || isTrans,
          original_text: response?.original_text || queryText,
          translated_text: response?.translated_text
        }
      ]);
    } catch (e) {
      if (!isMounted) return;
      console.error("AI question fetch error:", e);
      if (isTrans) {
        setMessages(prev => [
          ...prev,
          {
            sender: 'ai',
            text: activeMode === 'translate_en_ta'
              ? "மொழிபெயர்ப்பு தற்காலிகமாக கிடைக்கவில்லை. மீண்டும் முயற்சிக்கவும்."
              : "Translation is temporarily unavailable. Please try again.",
            is_translation: true,
            original_text: queryText,
            translated_text: null,
            provider: 'Translation Unavailable (Offline)'
          }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            sender: 'ai',
            text: activeT.aiServiceUnavailable || "AI Assistant Note: Live AI service is currently unavailable. Operating in localized agricultural fallback mode."
          }
        ]);
      }
    } finally {
      clearTimeout(safetyTimer);
      if (isMounted) setLoading(false);
    }
  };

  const handleClose = () => {
    cancelListening();
    closeAiExplainer();
  };

  const modesList = [
    { id: 'ta_qa', label: activeT.modeTaQa || 'தமிழ் கேள்வி', locale: 'ta-IN' },
    { id: 'en_qa', label: activeT.modeEnQa || 'English Q&A', locale: 'en-IN' },
    { id: 'translate_ta_en', label: activeT.modeTaToEn || 'தமிழ் → English', locale: 'ta-IN' },
    { id: 'translate_en_ta', label: activeT.modeEnToTa || 'English → தமிழ்', locale: 'en-IN' },
    { id: 'voice_nav', label: activeT.modeVoiceNav || 'Voice Nav', locale: language === 'ta' ? 'ta-IN' : 'en-IN' }
  ];

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '1.25rem', maxWidth: '660px', width: '92%' }}>

        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
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
                    {providerUsed.includes("Live AI") ? providerUsed : (activeT.ruleEngineFallback || providerUsed)}
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.15rem 0 0 0' }}>
                {activeT.aiModalSubtitle || "Contextual agricultural reasoning & voice assistant"} ({farmer?.name || 'Farmer'})
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            style={{ background: '#f1f5f9', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Four Language Modes + Voice Navigation Selector */}
        <div style={{
          display: 'flex',
          gap: '0.35rem',
          padding: '0.35rem',
          background: '#f8fafc',
          borderRadius: '10px',
          border: '1px solid var(--border-subtle)',
          marginBottom: '0.75rem',
          overflowX: 'auto',
          alignItems: 'center'
        }}>
          {modesList.map(m => {
            const isSelected = activeMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  if (isListening) cancelListening();
                  setActiveMode(m.id);
                  setSpeechError(null);
                }}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  fontWeight: isSelected ? 700 : 500,
                  background: isSelected ? '#15803d' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#475569',
                  border: isSelected ? '1px solid #166534' : '1px solid #e2e8f0',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  transition: 'all 0.15s ease'
                }}
              >
                {m.id === 'voice_nav' ? <Compass size={13} /> : (m.id.startsWith('translate') ? <Languages size={13} /> : <Sparkles size={13} />)}
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Chat / Explanation Stream */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
          maxHeight: '340px',
          minHeight: '160px',
          overflowY: 'auto',
          padding: '0.5rem',
          marginBottom: '0.75rem'
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
                {/* TRANSLATION RESPONSE DISPLAY: Distinct Original Transcript & Translated Result */}
                {msg.is_translation ? (
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                      {activeT.sourceTranscriptLabel || "Original Transcript:"}
                    </div>
                    <div style={{
                      fontStyle: 'italic',
                      color: '#334155',
                      marginBottom: '0.6rem',
                      padding: '0.4rem 0.6rem',
                      background: 'rgba(0,0,0,0.04)',
                      borderRadius: '6px'
                    }}>
                      "{msg.original_text}"
                    </div>

                    {msg.translated_text ? (
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                          {activeT.translatedResultLabel || "Translated Output:"}
                        </div>
                        <div style={{ color: '#0f172a', fontWeight: 600, fontSize: '0.95rem' }}>
                          {msg.translated_text}
                        </div>
                      </div>
                    ) : (
                      <div style={{ color: '#dc2626', fontWeight: 600, fontSize: '0.85rem' }}>
                        ⚠️ {msg.text}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {msg.text}

                    {msg.action_steps && msg.action_steps.length > 0 && (
                      <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                        <strong>{activeT.recommendedActionSteps || "Recommended Action Steps:"}</strong>
                        <ul style={{ paddingLeft: '1.2rem', marginTop: '0.25rem', marginBottom: 0 }}>
                          {msg.action_steps.map((st, i) => (
                            <li key={i}>{st}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#64748b', fontSize: '0.85rem', padding: '0.5rem' }}>
              <Sparkles size={16} className="animate-spin" color="#d97706" />
              <span>{activeT.aiModalLoading || "KisanSathi AI is analyzing farm memory..."}</span>
            </div>
          )}
        </div>

        {/* Speech Input & Submission Form */}
        <form onSubmit={handleAsk} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>

          {/* Active Listening Status Bar */}
          {isListening && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.35rem 0.75rem',
              background: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: '8px',
              fontSize: '0.8rem',
              color: '#991b1b'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#ef4444',
                  display: 'inline-block'
                }} />
                <strong>{activeT.micListening || "Listening..."} ({getRecognitionLang(activeMode)})</strong>
                <span style={{ fontSize: '0.72rem', color: '#7f1d1d' }}>Review/edit before submitting</span>
              </div>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button
                  type="button"
                  onClick={stopListening}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #dc2626',
                    color: '#dc2626',
                    borderRadius: '6px',
                    padding: '0.2rem 0.5rem',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <Square size={10} fill="#dc2626" />
                  <span>{activeT.micStop || "Stop"}</span>
                </button>
                <button
                  type="button"
                  onClick={cancelListening}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #94a3b8',
                    color: '#475569',
                    borderRadius: '6px',
                    padding: '0.2rem 0.5rem',
                    fontSize: '0.72rem',
                    cursor: 'pointer'
                  }}
                >
                  {activeT.micCancel || "Cancel"}
                </button>
              </div>
            </div>
          )}

          {/* Speech Error Banner */}
          {speechError && (
            <div style={{
              padding: '0.35rem 0.65rem',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              fontSize: '0.75rem',
              color: '#b91c1c'
            }}>
              ⚠️ {speechError}
            </div>
          )}

          {/* Microphone Button + Editable Transcript Input + Submit Button */}
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              disabled={loading}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isListening ? '#ef4444' : '#f0fdf4',
                border: `1px solid ${isListening ? '#dc2626' : '#86efac'}`,
                color: isListening ? '#ffffff' : '#15803d',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.15s ease'
              }}
              title={isListening ? "Stop Recording" : `Speak (${getRecognitionLang(activeMode)})`}
              aria-label="Microphone voice input"
            >
              {isListening ? <Square size={16} fill="#ffffff" /> : <Mic size={18} />}
            </button>

            <input
              type="text"
              placeholder={
                activeMode === 'voice_nav'
                  ? (language === 'ta' ? "கட்டளையைப் பேசவும் (எ.கா. 'வானிலை', 'மண்டி விலை')..." : "Speak or type command (e.g. 'Open weather', 'Show mandi prices')...")
                  : (activeMode === 'translate_ta_en'
                    ? "தமிழ் உரை பேசவும் / எழுதவும் (English மொழிபெயர்ப்புக்கு)..."
                    : (activeMode === 'translate_en_ta'
                      ? "Speak or type English text for Tamil translation..."
                      : (activeMode === 'ta_qa'
                        ? "தமிழில் விவசாயக் கேள்வி கேட்கவும்..."
                        : (activeT.aiModalPlaceholder || "Ask anything about your farm..."))))
              }
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
              disabled={loading || isListening || !inputQuestion.trim()}
              className="btn-primary"
              style={{
                borderRadius: 'var(--radius-full)',
                padding: '0.65rem 1.15rem',
                flexShrink: 0,
                opacity: (loading || isListening || !inputQuestion.trim()) ? 0.6 : 1
              }}
              aria-label="Submit query"
            >
              <Send size={16} />
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
