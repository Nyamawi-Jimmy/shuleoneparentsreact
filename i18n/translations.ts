// Lightweight i18n for the ShuleOne parent app — the web's dictionaries
// (parent/i18n.js) plus a few app-only keys. Core journey (nav, home, fees,
// settings) is localized; other screens fall back to English.

export type Language = 'en' | 'sw';

export const translations: Record<Language, Record<string, string>> = {
  en: {
    // Nav / tabs
    'nav.home': 'Today',
    'nav.learning': 'Learning',
    'nav.fees': 'Fees',
    'nav.academics': 'Academics',
    'nav.messages': 'Messages',
    'nav.coding': 'Coding',
    'nav.bus': 'Transport',
    'nav.attendance': 'Attendance',
    'nav.diary': 'Diary',
    'nav.live': 'Live',
    'nav.calendar': 'Calendar',
    'nav.documents': 'Documents',
    'nav.settings': 'Settings',
    'nav.help': 'Help & Support',
    // Home
    'home.greetingMorning': 'Good morning, {name}',
    'home.greetingAfternoon': 'Good afternoon, {name}',
    'home.greetingEvening': 'Good evening, {name}',
    'home.glance': '{name}’s day at a glance',
    'home.quickAccess': 'Quick access',
    'home.fees': 'Fees',
    'home.attendance': 'Attendance',
    'home.bus': 'School bus',
    'home.updates': 'Updates',
    'home.payNow': 'Pay now',
    // Fees
    'fees.payMpesa': 'Pay with M-Pesa',
    'fees.outstanding': 'Outstanding balance',
    'fees.statement': 'Statements',
    // Common
    'common.done': 'Done',
    'common.continue': 'Continue',
    'common.cancel': 'Cancel',
    'common.save': 'Save changes',
    'common.today': 'Today',
    'settings.language': 'Language',
  },
  sw: {
    'nav.home': 'Leo',
    'nav.learning': 'Kujifunza',
    'nav.fees': 'Ada',
    'nav.academics': 'Masomo',
    'nav.messages': 'Ujumbe',
    'nav.coding': 'Kodi',
    'nav.bus': 'Usafiri',
    'nav.attendance': 'Mahudhurio',
    'nav.diary': 'Shajara',
    'nav.live': 'Moja kwa moja',
    'nav.calendar': 'Kalenda',
    'nav.documents': 'Nyaraka',
    'nav.settings': 'Mipangilio',
    'nav.help': 'Msaada',
    'home.greetingMorning': 'Habari ya asubuhi, {name}',
    'home.greetingAfternoon': 'Habari ya mchana, {name}',
    'home.greetingEvening': 'Habari ya jioni, {name}',
    'home.glance': 'Siku ya {name} kwa muhtasari',
    'home.quickAccess': 'Ufikiaji wa haraka',
    'home.fees': 'Ada',
    'home.attendance': 'Mahudhurio',
    'home.bus': 'Basi la shule',
    'home.updates': 'Taarifa',
    'home.payNow': 'Lipa sasa',
    'fees.payMpesa': 'Lipa na M-Pesa',
    'fees.outstanding': 'Salio linalodaiwa',
    'fees.statement': 'Taarifa za ada',
    'common.done': 'Imekamilika',
    'common.continue': 'Endelea',
    'common.cancel': 'Ghairi',
    'common.save': 'Hifadhi',
    'common.today': 'Leo',
    'settings.language': 'Lugha',
  },
};

/** Returns a t(key, vars) function with {var} interpolation, like the web. */
export function makeT(lang: Language) {
  const dict = translations[lang] || translations.en;
  const fallback = translations.en;
  return (key: string, vars?: Record<string, string | number>): string => {
    let str = dict[key] ?? fallback[key] ?? key;
    if (vars) {
      for (const k of Object.keys(vars)) {
        str = str.split(`{${k}}`).join(String(vars[k]));
      }
    }
    return str;
  };
}
