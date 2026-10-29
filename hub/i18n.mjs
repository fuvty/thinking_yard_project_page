import en from './locales/en.json' with { type: 'json' };
import zh from './locales/zh.json' with { type: 'json' };

/** @typedef {'en' | 'zh'} Locale */
/** @param {Locale} locale */
export const getCopy = locale => locale === 'zh' ? zh : en;

/**
 * English remains the source and fallback. Project identity, assets and routes
 * stay in the registry; only presentation text is localized.
 * @template T
 * @param {T & {translations?: {zh?: Partial<T>}}} item
 * @param {Locale} locale
 * @returns {T}
 */
export function localize(item, locale) {
  return locale === 'zh' ? {...item, ...item.translations?.zh} : item;
}

/** @param {Locale} locale @param {string} [base] */
export const homePath = (locale, base = '') => `${base}/${locale === 'zh' ? 'zh/' : ''}`;
