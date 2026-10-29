const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = paths => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
export function renderBackToTop(label = 'Back to top') {
  return `<button type="button" class="sp-back-to-top" id="scrollTop" aria-label="${escape(label)}" title="${escape(label)}" aria-hidden="true" inert>${icon('<path d="m6 14 6-6 6 6"/>')}</button>`;
}
export function renderCitation(bibtex) {
  const empty = !String(bibtex).trim();
  return `<div class="sp-citation${empty ? '' : ' reveal'}">
    <div class="sp-citation-header"><span class="sp-citation-title">BibTeX</span>
      <button type="button" class="sp-copy" data-copy-target="bibtexCode"${empty ? ' disabled data-copy-empty title="Citation forthcoming"' : ''}><span class="sp-copy-icon">${icon('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>')}</span><span class="sp-copy-check">${icon('<path d="m5 12 4 4L19 6"/>')}</span><span data-copy-label>Copy BibTeX</span></button>
    </div>
    <pre tabindex="0" aria-label="BibTeX citation"><code id="bibtexCode">${escape(bibtex)}</code></pre>
    <span class="sp-sr-only" role="status" data-copy-status></span>
  </div>`;
}

/** @param {{base?:string, name?:string, team?:string, homeHref?:string, labels?:{research:string,home:string,allProjects:string,label:string}, contact?:{label:string,email:string}, languageSwitch?:{locale:string,englishHref:string,chineseHref:string}}} [options] */
export function renderFooter({base = '', name = 'Scaling Paths', team = 'NICS-EFC', homeHref = `${base}/`, labels = {research:'Research projects', home:'Home', allProjects:'All projects', label:'Footer'}, languageSwitch, contact} = {}) {
  const languages = languageSwitch ? `<span class="sp-footer-languages" role="group" aria-label="中文 / English">
    <a href="${escape(languageSwitch.chineseHref)}" data-home-language="zh" lang="zh-CN" hreflang="zh-CN"${languageSwitch.locale === 'zh' ? ' aria-current="page"' : ''}>中文</a><span aria-hidden="true">/</span><a href="${escape(languageSwitch.englishHref)}" data-home-language="en" lang="en" hreflang="en"${languageSwitch.locale === 'en' ? ' aria-current="page"' : ''}>English</a>
  </span>` : '';
  const contactLine = contact ? `<p class="sp-footer-contact" id="contact"><span>${escape(contact.label)}</span><a href="mailto:${escape(contact.email)}">${escape(contact.email)}</a></p>` : '';
  return `<footer class="sp-footer"><div class="sp-footer-inner">
    <div class="sp-footer-identity"><strong>${escape(team)}</strong><p>${escape(name)} · ${escape(labels.research)}</p>${contactLine}</div>
    <nav class="sp-footer-links" aria-label="${escape(labels.label)}"><a href="${escape(homeHref)}">${escape(labels.home)}</a><a href="${escape(homeHref)}#projects">${escape(labels.allProjects)}</a>${languages}</nav>
  </div></footer>`;
}
