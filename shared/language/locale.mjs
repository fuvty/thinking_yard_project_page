import en from './en.json' with {type: 'json'};
import zh from './zh.json' with {type: 'json'};

/** @typedef {'en'|'zh'} Locale */
/** @param {Locale} locale */
export const getUI = locale => locale === 'zh' ? zh : en;

/** @template T @param {T & {translations?: {zh?: Partial<T>}}} item @param {Locale} locale @returns {T} */
export const localize = (item, locale) => locale === 'zh' ? {...item, ...item.translations?.zh} : item;
/** @param {Locale} locale @param {string} [base] */
export const homePath = (locale, base = '') => `${base}/${locale === 'zh' ? 'zh/' : ''}`;
/** @param {{slug:string,locales?:string[]}} project @param {Locale} locale @param {string} [base] */
export const projectPath = (project, locale, base = '') => `${homePath(locale, base)}projects/${project.slug}/`;

/** Content availability is independent of the selected site language. */
export const hasChinese = project => project.locales?.includes('zh') ?? false;
