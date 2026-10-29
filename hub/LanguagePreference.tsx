'use client';

import {useEffect, useState, type ReactNode, type MouseEvent} from 'react';
import {readLanguagePreference, saveLanguagePreference, shouldSuggestChinese} from './language-preference.mjs';

const storage = () => window.localStorage;

export default function LanguagePreference({locale, chineseHref, children}: {
  locale: 'en' | 'zh'; chineseHref: string; children: ReactNode;
}) {
  const [suggest, setSuggest] = useState(false);
  useEffect(() => {
    setSuggest(shouldSuggestChinese(locale, navigator.languages?.length ? navigator.languages : [navigator.language], readLanguagePreference(storage)));
  }, [locale]);

  function choose(language: string) {
    saveLanguagePreference(storage, language);
    setSuggest(false);
  }

  function selectFooterLanguage(event: MouseEvent<HTMLDivElement>) {
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[data-home-language]');
    if (link?.dataset.homeLanguage) choose(link.dataset.homeLanguage);
  }

  return <>
    <aside className="home-language-notice" data-open={suggest} inert={!suggest} aria-hidden={!suggest} aria-label="语言 / Language" lang="zh-CN">
      <div className="home-language-inner">
      <p>也可以用中文浏览</p>
      <div className="home-language-actions">
        <a href={chineseHref} hrefLang="zh-CN" onClick={() => choose('zh')}>切换中文 <span aria-hidden="true">→</span></a>
        <button type="button" lang="en" onClick={() => choose('en')}>Keep English</button>
      </div>
      </div>
    </aside>
    <div onClick={selectFooterLanguage}>{children}</div>
  </>;
}
