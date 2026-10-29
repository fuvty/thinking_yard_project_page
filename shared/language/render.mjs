const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function renderLanguageNotice(chineseHref) {
  return `<aside class="site-language-notice" data-open="false" inert aria-hidden="true" aria-label="语言 / Language" lang="zh-CN">
    <div class="site-language-inner"><p>使用中文浏览？</p><div class="site-language-actions">
      <a href="${escape(chineseHref)}" hreflang="zh-CN" data-home-language="zh">切换中文</a>
      <button type="button" lang="en" data-home-language="en">Keep English</button>
    </div></div>
  </aside>`;
}

export function renderLanguageData({locale, projectRoot, messages}) {
  const json = JSON.stringify({locale, projectRoot, messages}).replace(/</g, '\\u003c');
  return `<script type="application/json" id="site-language-data">${json}</script>`;
}

export function renderFallbackNotice(slug) {
  return `<aside class="site-language-notice" data-notice-kind="fallback" data-page="${escape(slug)}" data-open="false" inert aria-hidden="true" aria-label="页面语言" lang="zh-CN">
    <div class="site-language-inner"><p>此页暂无中文版，暂以英文显示。</p><div class="site-language-actions">
      <button type="button" data-dismiss-language-notice aria-label="关闭语言提示">关闭 <span aria-hidden="true">×</span></button>
    </div></div>
  </aside>`;
}

/** GitHub Pages has no per-route server redirects; keep old bookmarks working. */
export function renderLegacyRedirect(destination) {
  const target = JSON.stringify(destination).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><title>页面已迁移</title>
<script>location.replace(${target} + location.search + location.hash);</script>
</head><body><p>页面地址已更新。<a href="${escape(destination)}">前往页面</a></p></body></html>`;
}
