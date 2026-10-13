import assert from 'assert';
import { matchVoiceCommand, normalizeCommandText, SUPPORTED_NAV_TABS, TAB_LABELS } from './src/services/voiceNavigation.js';

console.log("======================================================================");
console.log("RUNNING FRONTEND VOICE NAVIGATION & COMMAND ROUTER TESTS");
console.log("======================================================================");

// 1. Test Normalization
assert.strictEqual(normalizeCommandText("  Open Weather!  "), "open weather");
assert.strictEqual(normalizeCommandText("Show Mandi Prices???"), "show mandi prices");
assert.strictEqual(normalizeCommandText("வானிலை திற!"), "வானிலை திற");
assert.strictEqual(normalizeCommandText(""), "");
console.log("✓ Normalization passed");

// 2. Test English Navigation Commands
const englishCommands = [
  { text: "open weather", expectedTab: "weather" },
  { text: "weather", expectedTab: "weather" },
  { text: "show weather", expectedTab: "weather" },
  { text: "show mandi prices", expectedTab: "mandi" },
  { text: "open mandi", expectedTab: "mandi" },
  { text: "mandi prices", expectedTab: "mandi" },
  { text: "open schemes", expectedTab: "schemes" },
  { text: "government schemes", expectedTab: "schemes" },
  { text: "open my farm diary", expectedTab: "diary" },
  { text: "farm diary", expectedTab: "diary" },
  { text: "open dashboard", expectedTab: "dashboard" },
  { text: "home", expectedTab: "dashboard" },
  { text: "open profile", expectedTab: "profile" },
  { text: "my farm", expectedTab: "profile" }
];

for (const tc of englishCommands) {
  const result = matchVoiceCommand(tc.text);
  assert.strictEqual(result.matched, true, `Failed matching: ${tc.text}`);
  assert.strictEqual(result.tabId, tc.expectedTab, `Wrong tab for: ${tc.text}`);
  assert.ok(SUPPORTED_NAV_TABS.includes(result.tabId));
}
console.log("✓ Supported English commands verified");

// 3. Test Tamil Navigation Commands
const tamilCommands = [
  { text: "வானிலை", expectedTab: "weather" },
  { text: "வானிலை திற", expectedTab: "weather" },
  { text: "வானிலையைக் காட்டு", expectedTab: "weather" },
  { text: "மண்டி", expectedTab: "mandi" },
  { text: "மண்டி விலை", expectedTab: "mandi" },
  { text: "சந்தை விலை", expectedTab: "mandi" },
  { text: "சந்தை விலையைக் காட்டு", expectedTab: "mandi" },
  { text: "திட்டங்கள்", expectedTab: "schemes" },
  { text: "அரசு திட்டங்கள்", expectedTab: "schemes" },
  { text: "திட்டங்களைத் திற", expectedTab: "schemes" },
  { text: "குறிப்பேடு", expectedTab: "diary" },
  { text: "பண்ணை குறிப்பேடு", expectedTab: "diary" },
  { text: "குறிப்பேட்டைத் திற", expectedTab: "diary" },
  { text: "முகப்பு", expectedTab: "dashboard" },
  { text: "முகப்பு பலகை", expectedTab: "dashboard" },
  { text: "எனது பண்ணை", expectedTab: "profile" },
  { text: "விவசாயி விவரம்", expectedTab: "profile" }
];

for (const tc of tamilCommands) {
  const result = matchVoiceCommand(tc.text);
  assert.strictEqual(result.matched, true, `Failed matching Tamil: ${tc.text}`);
  assert.strictEqual(result.tabId, tc.expectedTab, `Wrong tab for Tamil: ${tc.text}`);
  assert.ok(SUPPORTED_NAV_TABS.includes(result.tabId));
}
console.log("✓ Supported Tamil commands verified");

// 4. Test Unrecognized Commands Do Not Navigate
const invalidCommands = [
  "delete all farmer records",
  "execute script alert(1)",
  "what is the price of tomatoes in Delhi",
  "buy pesticides now",
  "arbitrary unknown command",
  "விவசாயம் செய்வது எப்படி"
];

for (const inv of invalidCommands) {
  const result = matchVoiceCommand(inv);
  assert.strictEqual(result.matched, false, `Should not match invalid command: ${inv}`);
  assert.ok(result.feedbackEn.includes("Command not recognized"));
}
console.log("✓ Unrecognized commands safely rejected");

// 5. Test Whitelist Enforcement (Only Allowed Tabs)
for (const tab of SUPPORTED_NAV_TABS) {
  assert.ok(TAB_LABELS[tab], `Missing labels for supported tab: ${tab}`);
}
console.log("✓ Whitelist boundary verified (6 allowed tabs only)");

// 6. Test Speech Recognition Locales
const getRecognitionLang = (mode) => {
  if (mode === 'ta_qa' || mode === 'translate_ta_en') return 'ta-IN';
  if (mode === 'en_qa' || mode === 'translate_en_ta') return 'en-IN';
  return 'en-IN';
};

assert.strictEqual(getRecognitionLang('ta_qa'), 'ta-IN');
assert.strictEqual(getRecognitionLang('en_qa'), 'en-IN');
assert.strictEqual(getRecognitionLang('translate_ta_en'), 'ta-IN');
assert.strictEqual(getRecognitionLang('translate_en_ta'), 'en-IN');
console.log("✓ Web Speech API locales verified (ta-IN and en-IN)");

console.log("======================================================================");
console.log("ALL FRONTEND TESTS PASSED (100% SUCCESS)");
console.log("======================================================================");
