import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldSuggestChinese, readLanguagePreference, saveLanguagePreference, languagePreferenceKey} from '../shared/language/preferences.js';

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

test('one controller opens the prompt, remembers choices across pages and preserves chapter hashes', async () => {
  const {readFile} = await import('node:fs/promises');
  const {default:vm} = await import('node:vm');
  const source = (await readFile(new URL('../shared/language/controller.js',import.meta.url),'utf8')).replace(/^import .*;\n/, '');
  const values = new Map();
  const storage = {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
  const load = (lang, hash = '') => {
    const notice = {dataset:{},setAttribute(name,value){this[name]=value;}};
    const events = {};
    vm.runInNewContext(source,{
      readLanguagePreference,saveLanguagePreference,shouldSuggestChinese,localStorage:storage,
      navigator:{languages:['zh-CN','en']},location:{hash},
      document:{documentElement:{lang},readyState:'complete',querySelector:()=>notice,addEventListener:(name,fn)=>{events[name]=fn;}},
    });
    return {notice,click:choice=>events.click({target:{closest:()=>choice}})};
  };
  const page = load('en','#results');
  assert.equal(page.notice.dataset.open,'true');
  assert.equal(page.notice.inert,false);
  const choice = {dataset:{homeLanguage:'zh'},tagName:'A'};
  page.click(choice);
  assert.equal(choice.hash,'#results');
  assert.equal(page.notice.dataset.open,'false');
  assert.equal(page.notice.inert,true);
  assert.equal(values.get(languagePreferenceKey),'zh');
  assert.equal(load('en').notice.dataset.open,'false');
  values.clear();
  assert.equal(load('zh-CN').notice.dataset.open,'false');
  const keepEnglish = load('en');
  keepEnglish.click({dataset:{homeLanguage:'en'},tagName:'BUTTON'});
  assert.equal(keepEnglish.notice['aria-hidden'],'true');
  assert.equal(load('en').notice.dataset.open,'false');
});
