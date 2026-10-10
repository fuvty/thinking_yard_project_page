const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = paths => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
export function renderBackToTop() {
  return `<button type="button" class="sp-back-to-top" id="scrollTop" aria-label="Back to top" title="Back to top" aria-hidden="true" inert>${icon('<path d="m6 14 6-6 6 6"/>')}</button>`;
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

export function renderFooter({base = '', name = 'Scaling Paths', team = 'NICS-EFC'} = {}) {
  return `<footer class="sp-footer"><div class="sp-footer-inner">
    <div class="sp-footer-identity"><strong>${escape(team)}</strong><p>${escape(name)} · Research projects</p></div>
    <nav class="sp-footer-links" aria-label="Footer"><a href="${escape(base)}/">Home</a><a href="${escape(base)}/#projects">All projects</a></nav>
  </div></footer>`;
}
