import en from './locales/en.json' with { type: 'json' };
import zh from './locales/zh.json' with { type: 'json' };

import {getUI} from '../shared/language/locale.mjs';

/** @typedef {'en' | 'zh'} Locale */
const sharedCopy = locale => {
  const {messages, ...ui} = getUI(locale);
  return ui;
};
const copy = {en: {...en, ...sharedCopy('en')}, zh: {...zh, ...sharedCopy('zh')}};
/** @param {Locale} locale */
export const getCopy = locale => copy[locale];

export {localize, homePath, projectPath} from '../shared/language/locale.mjs';
