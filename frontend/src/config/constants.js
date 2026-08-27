export const DEFAULT_FARMER_ID = 'demo_farmer_01';

export const DEMO_FARMERS = [
  { id: 'demo_farmer_01', name: 'Ramesh Kumar', location: 'Nagpur, MH', land: '2.5 Ac' },
  { id: 'demo_farmer_02', name: 'Suresh Patel', location: 'Rajkot, GJ', land: '6.0 Ac' },
  { id: 'demo_farmer_03', name: 'Anitha Selvam', location: 'Thanjavur, TN', land: '1.5 Ac' },
  { id: 'demo_farmer_04', name: 'Vikram Singh', location: 'Bhatinda, PB', land: '12.0 Ac' }
];

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' }
];

export const API_BASE = '/api';

export const COMMODITY_OPTIONS = [
  'Cotton',
  'Soybean',
  'Wheat',
  'Gram (Chana)',
  'Paddy (Dhan)',
  'Maize',
  'Onion',
  'Mustard'
];

export const STATES_AND_DISTRICTS = {
  'Maharashtra': ['Nagpur', 'Amravati', 'Nashik', 'Pune', 'Aurangabad', 'Yavatmal'],
  'Gujarat': ['Rajkot', 'Surat', 'Ahmedabad', 'Junagadh'],
  'Tamil Nadu': ['Thanjavur', 'Coimbatore', 'Madurai', 'Salem', 'Tiruchirappalli'],
  'Punjab': ['Bhatinda', 'Ludhiana', 'Patiala', 'Amritsar', 'Jalandhar']
};
