/**
 * KisanSathi AI — Local Deterministic Voice Navigation Router
 *
 * Maps recognized speech text to valid dashboard tabs using an explicit whitelist.
 * Never executes arbitrary code, never modifies farmer profile/diary data,
 * and never sends simple navigation commands to external LLMs.
 */

// Explicit whitelist of allowed navigation target tabs
export const SUPPORTED_NAV_TABS = ['dashboard', 'schemes', 'weather', 'mandi', 'diary', 'profile'];

export const TAB_LABELS = {
  dashboard: { en: 'Dashboard', ta: 'முகப்பு பலகை' },
  schemes: { en: 'Government Schemes', ta: 'அரசு திட்டங்கள்' },
  weather: { en: 'Weather', ta: 'வானிலை' },
  mandi: { en: 'Mandi Prices', ta: 'மண்டி விலை' },
  diary: { en: 'Farm Diary', ta: 'பண்ணை குறிப்பேடு' },
  profile: { en: 'My Farm', ta: 'எனது பண்ணை' }
};

// Whitelist dictionary mapping exact normalized phrases to supported tabs
const COMMAND_WHITELIST = {
  // --- Weather ---
  'weather': 'weather',
  'open weather': 'weather',
  'show weather': 'weather',
  'go to weather': 'weather',
  'weather forecast': 'weather',
  'check weather': 'weather',
  'weather report': 'weather',
  'வானிலை': 'weather',
  'வானிலை திற': 'weather',
  'வானிலையை திற': 'weather',
  'வானிலையைத் திற': 'weather',
  'வானிலையைக் காட்டு': 'weather',
  'வானிலை காட்டு': 'weather',
  'வானிலை தகவல்': 'weather',
  'வானிலை பக்கம்': 'weather',

  // --- Mandi Prices ---
  'mandi': 'mandi',
  'mandi prices': 'mandi',
  'open mandi': 'mandi',
  'open mandi prices': 'mandi',
  'show mandi': 'mandi',
  'show mandi prices': 'mandi',
  'market prices': 'mandi',
  'apmc rates': 'mandi',
  'check mandi': 'mandi',
  'மண்டி': 'mandi',
  'மண்டி விலை': 'mandi',
  'மண்டி விலைகள்': 'mandi',
  'மண்டி திற': 'mandi',
  'மண்டி விலையை திற': 'mandi',
  'மண்டி விலையைத் திற': 'mandi',
  'சந்தை விலை': 'mandi',
  'சந்தை விலையைக் காட்டு': 'mandi',
  'சந்தை விலை காட்டு': 'mandi',

  // --- Government Schemes ---
  'schemes': 'schemes',
  'open schemes': 'schemes',
  'government schemes': 'schemes',
  'open government schemes': 'schemes',
  'govt schemes': 'schemes',
  'open govt schemes': 'schemes',
  'show schemes': 'schemes',
  'subsidies': 'schemes',
  'check schemes': 'schemes',
  'திட்டங்கள்': 'schemes',
  'அரசு திட்டங்கள்': 'schemes',
  'திட்டங்களை திற': 'schemes',
  'திட்டங்களைத் திற': 'schemes',
  'அரசு திட்டங்களை திற': 'schemes',
  'அரசு திட்டங்களைத் திற': 'schemes',
  'திட்டங்கள் காட்டு': 'schemes',
  'அரசு திட்டங்கள் காட்டு': 'schemes',
  'மானியங்கள்': 'schemes',

  // --- Farm Diary ---
  'diary': 'diary',
  'farm diary': 'diary',
  'open diary': 'diary',
  'open farm diary': 'diary',
  'open my farm diary': 'diary',
  'show diary': 'diary',
  'my diary': 'diary',
  'farm log': 'diary',
  'குறிப்பேடு': 'diary',
  'பண்ணை குறிப்பேடு': 'diary',
  'குறிப்பேட்டை திற': 'diary',
  'குறிப்பேட்டைத் திற': 'diary',
  'பண்ணை குறிப்பேட்டை திற': 'diary',
  'பண்ணை குறிப்பேட்டைத் திற': 'diary',
  'டைரி': 'diary',
  'குறிப்பேடு காட்டு': 'diary',

  // --- Dashboard ---
  'dashboard': 'dashboard',
  'open dashboard': 'dashboard',
  'home': 'dashboard',
  'go to home': 'dashboard',
  'go to dashboard': 'dashboard',
  'main page': 'dashboard',
  'overview': 'dashboard',
  'முகப்பு': 'dashboard',
  'முகப்பு பலகை': 'dashboard',
  'முகப்புப்பலகை': 'dashboard',
  'முகப்புப் பலகை': 'dashboard',
  'முகப்பு பக்கம்': 'dashboard',
  'முகப்பை திற': 'dashboard',

  // --- Profile ---
  'profile': 'profile',
  'open profile': 'profile',
  'my farm': 'profile',
  'open my farm': 'profile',
  'farmer profile': 'profile',
  'show profile': 'profile',
  'எனது பண்ணை': 'profile',
  'விவசாயி விவரம்': 'profile',
  'விவரம்': 'profile',
  'சுயவிவரம்': 'profile',
  'சுய விவரம்': 'profile',
  'எனது பண்ணை திற': 'profile'
};

/**
 * Normalizes speech text: lowercase, strip punctuation, collapse whitespace.
 */
export function normalizeCommandText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Evaluates spoken command against the local whitelist.
 * Returns match object or unrecognized error feedback.
 */
export function matchVoiceCommand(rawText) {
  const normalized = normalizeCommandText(rawText);
  if (!normalized) {
    return {
      matched: false,
      feedbackEn: 'No spoken command detected. Please speak a navigation command.',
      feedbackTa: 'எந்தக் குரல் கட்டளையும் கேட்கவில்லை. வழிசெலுத்தல் கட்டளையை பேசவும்.'
    };
  }

  // Exact whitelist match
  const matchedTab = COMMAND_WHITELIST[normalized];
  if (matchedTab && SUPPORTED_NAV_TABS.includes(matchedTab)) {
    const labels = TAB_LABELS[matchedTab];
    return {
      matched: true,
      tabId: matchedTab,
      labelEn: labels.en,
      labelTa: labels.ta,
      feedbackEn: `Navigating to ${labels.en}...`,
      feedbackTa: `${labels.ta} பக்கத்திற்கு செல்கிறது...`
    };
  }

  // Prefix matching for commands like "please open weather" or "can you show mandi prices"
  for (const [phrase, tab] of Object.entries(COMMAND_WHITELIST)) {
    if (phrase.length > 3 && (normalized.startsWith(phrase) || normalized.endsWith(phrase))) {
      const labels = TAB_LABELS[tab];
      return {
        matched: true,
        tabId: tab,
        labelEn: labels.en,
        labelTa: labels.ta,
        feedbackEn: `Navigating to ${labels.en}...`,
        feedbackTa: `${labels.ta} பக்கத்திற்கு செல்கிறது...`
      };
    }
  }

  // Explicitly unrecognized command
  return {
    matched: false,
    feedbackEn: 'Command not recognized. Supported commands: "Open weather", "Show mandi prices", "Open schemes", "Open farm diary", "Open dashboard", or "Open profile".',
    feedbackTa: 'கட்டளை அடையாளம் காணப்படவில்லை. "வானிலை", "மண்டி விலை", "அரசு திட்டங்கள்", "பண்ணை குறிப்பேடு", "முகப்பு", அல்லது "எனது பண்ணை" என்று கூறவும்.'
  };
}
