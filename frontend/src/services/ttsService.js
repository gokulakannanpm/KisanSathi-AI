class TTSService {
  constructor() {
    this.currentAudio = null;
    this.isPlaying = false;
    this.onStateChange = null;
  }

  setListener(callback) {
    this.onStateChange = callback;
  }

  notify(playing, text = '') {
    this.isPlaying = playing;
    if (this.onStateChange) {
      this.onStateChange({ isPlaying: playing, text });
    }
  }

  async speakScheme(scheme, language = 'en') {
    this.stop();

    // 1. Try backend audio streaming endpoint first if available
    try {
      const audioUrl = `/api/schemes/${scheme.id}/audio?language=${language}&stream=true`;
      const response = await fetch(audioUrl, { method: 'HEAD' });
      if (response.ok) {
        this.currentAudio = new Audio(audioUrl);
        this.currentAudio.onplay = () => this.notify(true, scheme.name);
        this.currentAudio.onended = () => this.notify(false);
        this.currentAudio.onerror = () => {
          this.speakWithWebSpeech(scheme, language);
        };
        await this.currentAudio.play();
        return;
      }
    } catch (e) {
      // Backend not running or audio endpoint unavailable, fallback to Web Speech
    }

    // 2. Fallback to Web Speech API
    this.speakWithWebSpeech(scheme, language);
  }

  speakWithWebSpeech(scheme, language = 'en') {
    if (!('speechSynthesis' in window)) {
      alert("Text-to-speech is not supported on this browser.");
      return;
    }

    window.speechSynthesis.cancel();

    const narrationText = `${scheme.name}. ` +
      `Eligibility: ${scheme.eligible ? 'You are eligible.' : 'Not eligible.'} ` +
      `Benefits: ${scheme.benefits} ` +
      `Key required documents: ${scheme.required_documents ? scheme.required_documents.slice(0, 3).join(', ') : ''}.`;

    const utterance = new SpeechSynthesisUtterance(narrationText);
    
    // Map language codes to BCP-47
    const langMap = {
      'en': 'en-IN',
      'hi': 'hi-IN',
      'ta': 'ta-IN',
      'mr': 'mr-IN'
    };
    utterance.lang = langMap[language] || 'en-IN';
    utterance.rate = 0.9; // Farmer-friendly clear pace

    utterance.onstart = () => this.notify(true, scheme.name);
    utterance.onend = () => this.notify(false);
    utterance.onerror = () => this.notify(false);

    window.speechSynthesis.speak(utterance);
  }

  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.notify(false);
  }
}

export const ttsService = new TTSService();
