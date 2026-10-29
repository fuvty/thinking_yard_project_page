import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldSuggestChinese, readLanguagePreference, saveLanguagePreference, languagePreferenceKey} from '../hub/language-preference.mjs';

test('only English home suggests Chinese, respecting the browser preference order', () => {
  for (const language of ['zh', 'zh-CN', 'zh-TW', 'zh-Hant', 'ZH-hans']) {
    assert.equal(shouldSuggestChinese('en', [language, 'en'], null), true);
    assert.equal(shouldSuggestChinese('zh', [language], null), false);
  }
  assert.equal(shouldSuggestChinese('en', ['en-US', 'zh-CN'], null), false);
  assert.equal(shouldSuggestChinese('en', ['fr', 'zh-CN', 'en'], null), true);
  assert.equal(shouldSuggestChinese('en', ['fr'], null), false);
  assert.equal(shouldSuggestChinese('en', [], null), false);
});

test('an explicit footer or prompt choice suppresses further suggestions', () => {
  const values = new Map();
  const storage = () => ({getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value)});
  assert.equal(readLanguagePreference(storage), null);
  for (const choice of ['en', 'zh']) {
    saveLanguagePreference(storage, choice);
    assert.equal(values.get(languagePreferenceKey), choice);
    assert.equal(shouldSuggestChinese('en', ['zh-CN'], readLanguagePreference(storage)), false);
  }
});

test('blocked storage cannot break language links or preference detection', () => {
  const blocked = () => { throw new Error('Storage unavailable'); };
  const writeBlocked = () => ({setItem() { throw new Error('Quota exceeded'); }});
  assert.equal(readLanguagePreference(blocked), null);
  assert.doesNotThrow(() => saveLanguagePreference(blocked, 'en'));
  assert.doesNotThrow(() => saveLanguagePreference(writeBlocked, 'zh'));
  assert.equal(shouldSuggestChinese('en', ['zh-CN'], readLanguagePreference(blocked)), true);
});
