export const languagePreferenceKey = 'thinking-yard-home-language';

/** @param {string} locale @param {readonly string[]} languages @param {string | null} saved */
export function shouldSuggestChinese(locale, languages, saved) {
  // Use the first supported language in preference order, not country or IP.
  const preferred = languages.find(language => /^(en|zh)(-|$)/i.test(language));
  return locale === 'en' && saved !== 'en' && saved !== 'zh' && /^zh(-|$)/i.test(preferred || '');
}

/** @param {() => Storage} storage */
export function readLanguagePreference(storage) {
  try { return storage().getItem(languagePreferenceKey); } catch { return null; }
}

/** @param {() => Storage} storage @param {string} locale */
export function saveLanguagePreference(storage, locale) {
  try { storage().setItem(languagePreferenceKey, locale); } catch { /* Links still work without storage. */ }
}
