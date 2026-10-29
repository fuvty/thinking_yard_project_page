// Available before project scripts run. Measurements and source assets stay shared.
(() => {
  const config = JSON.parse(document.getElementById('site-language-data')?.textContent || '{}');
  globalThis.SiteI18n = {
    t(text, values = {}) {
      return (config.messages?.[text] ?? text).replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);
    },
    asset(path) { return new URL(path, new URL(config.projectRoot || './', location.href)).href; },
  };
})();
