import {readLanguagePreference, saveLanguagePreference, shouldSuggestChinese, hasSeenFallback, rememberFallback} from './preferences.js';

function init() {
  const notice = document.querySelector('.site-language-notice');
  const storage = () => localStorage;
  const locale = document.documentElement.lang.startsWith('zh') ? 'zh' : 'en';
  function show(value) {
    if (!notice) return;
    notice.dataset.open = String(value);
    notice.inert = !value;
    notice.setAttribute('aria-hidden', String(!value));
  }
  if (notice?.dataset.noticeKind === 'fallback') {
    const session = () => sessionStorage;
    const slug = notice.dataset.page;
    const firstVisit = !hasSeenFallback(session, slug);
    show(firstVisit && window.scrollY <= 8);
    rememberFallback(session, slug);
    const onScroll = () => {
      if (window.scrollY <= 8) return;
      show(false);
      window.removeEventListener('scroll', onScroll);
    };
    if (firstVisit) window.addEventListener('scroll', onScroll, {passive:true});
  } else if (notice) {
    show(shouldSuggestChinese(locale, navigator.languages?.length ? navigator.languages : [navigator.language], readLanguagePreference(storage)));
  }
  document.addEventListener('click', event => {
    if (event.target.closest('[data-dismiss-language-notice]')) show(false);
    const choice = event.target.closest('[data-home-language]');
    if (!choice) return;
    const language = choice.dataset.homeLanguage;
    if (language !== 'en' && language !== 'zh') return;
    saveLanguagePreference(storage, language);
    show(false);
    // Both versions share section IDs. Switch at the same chapter when possible.
    if (choice.tagName === 'A') {
      choice.hash = location.hash;
      choice.search = location.search;
    }
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
else init();
