import { mkdir, readFile, writeFile, cp, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderNavigation } from '../shared/navigation/render.mjs';
import { renderBackToTop, renderCitation, renderFooter } from '../shared/ui/render.mjs';
import { getUI, localize, homePath, projectPath, hasChinese } from '../shared/language/locale.mjs';
import { renderLanguageNotice, renderLanguageData, renderFallbackNotice, renderLegacyRedirect } from '../shared/language/render.mjs';
import { translateContent, translateMetadata } from '../shared/language/project.mjs';
import { basePath, siteURL } from '../config/paths.mjs';
export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const json = async path => JSON.parse(await readFile(resolve(root,path),'utf8'));
const escape = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function generate({clean = false} = {}) {
  const base = basePath();
  const [projects,categories,site] = await Promise.all([json('config/projects.json'),json('config/categories.json'),json('config/site.json')]);
  const slugs = new Set();
  for (const p of projects) {
    if (!/^[a-z][a-z0-9-]*$/.test(p.slug) || slugs.has(p.slug)) throw new Error(`Invalid or duplicate project slug: ${p.slug}`);
    if (!categories.some(c=>c.id===p.category)) throw new Error(`Unknown category for ${p.slug}`);
    if (p.locales && (p.locales.length !== 1 || p.locales[0] !== 'zh')) throw new Error(`Unsupported locales for ${p.slug}`);
    slugs.add(p.slug);
  }
  // public is exclusively generated; source assets live in hub/, shared/, and projects/.
  if (clean) await rm(resolve(root,'public'),{recursive:true,force:true});
  await mkdir(resolve(root,'public'),{recursive:true});
  await cp(resolve(root,'hub/assets'),resolve(root,'public'),{recursive:true});
  await cp(resolve(root,'shared'),resolve(root,'public/shared'),{recursive:true,filter:src=>!src.endsWith('.mjs')});
  const urls = [siteURL(),`${siteURL()}zh/`];
  let pageCount = 0;
  for (const project of projects) {
    const source = resolve(root,'projects',project.slug);
    const output = resolve(root,'public/projects',project.slug);
    const [meta,head,body,bibtex] = await Promise.all([
      json(`projects/${project.slug}/page.json`),readFile(resolve(source,'head.html'),'utf8'),readFile(resolve(source,'content.html'),'utf8'),readFile(resolve(source,'citation.bib'),'utf8'),
    ]);
    if ((body.match(/\{\{citation\}\}/g) || []).length !== 1) throw new Error(`${project.slug}: content.html must contain one {{citation}} slot`);
    await mkdir(output,{recursive:true});
    await cp(resolve(source,'static'),resolve(output,'static'),{recursive:true});
    const bilingual = hasChinese(project);
    const projectRoot = projectPath(project,'en',base);
    const chineseHref = projectPath(project,'zh',base);
    const englishURL = new URL(projectRoot,siteURL()).href;
    const chineseURL = new URL(chineseHref,siteURL()).href;
    const alternates = bilingual ? `<link rel="alternate" hreflang="en" href="${englishURL}"><link rel="alternate" hreflang="zh-CN" href="${chineseURL}"><link rel="alternate" hreflang="x-default" href="${englishURL}">` : '';
    const styles = ['tokens','components',...(meta.theme==='research'?['research']:[])].map(name=>`<link rel="stylesheet" href="${base}/shared/styles/${name}.css">`).join('\n');
    const pageHead = head.replace(/<link[^>]+href="\.\/static\/css\/index\.css[^"]*"[^>]*>/, match => `${styles}\n${match}`);
    const resolveAssets = html => html.replaceAll('{{base}}',base).replace(/(["'])(?:\.\/)?static\//g,(_,quote)=>`${quote}${projectRoot}static/`);
    for (const locale of ['en','zh']) {
      const translation = locale === 'en' || !bilingual ? null : await json(`projects/${project.slug}/locales/${locale}.json`);
      const page = translation ? translateMetadata(meta,translation) : meta;
      const content = translation ? translateContent(body,translation,project.slug) : body;
      const ui = getUI(locale);
      const fallback = locale === 'zh' && !bilingual;
      const contentLanguage = translation ? 'zh-CN' : 'en';
      const messages = {...ui.messages, ...translation?.runtime};
      const homeHref = homePath(locale,base);
      const languageSwitch = {locale,englishHref:projectRoot,chineseHref,chineseAvailable:bilingual};
      const nav = renderNavigation({projects:projects.map(p=>({...localize(p,locale),href:projectPath(p,locale,base)})),categories:categories.map(c=>localize(c,locale)),current:project.slug,name:project.name,sections:page.sections,base,homeHref,labels:ui.navigation,groupLabels:ui.groupLabels});
      const url = locale === 'zh' ? chineseURL : englishURL;
      if (!fallback) urls.push(url);
      const html = `<!doctype html>
<html lang="${locale==='zh'?'zh-CN':'en'}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(page.title)}</title><meta name="description" content="${escape(page.description)}">
<link rel="canonical" href="${escape(fallback ? englishURL : url)}">${alternates}${fallback ? '<meta name="robots" content="noindex,follow">' : ''}
<meta property="og:title" content="${escape(page.title)}"><meta property="og:description" content="${escape(page.description)}"><meta property="og:url" content="${escape(url)}"><meta property="og:type" content="website"><meta property="og:locale" content="${translation?'zh_CN':'en_US'}">
${renderLanguageData({locale,projectRoot,messages})}
<script src="${base}/shared/language/runtime.js"></script>
${resolveAssets(pageHead)}
<link rel="stylesheet" href="${base}/shared/navigation/styles.css">
<link rel="stylesheet" href="${base}/shared/ui/styles.css">
<link rel="stylesheet" href="${base}/shared/language/styles.css"><script type="module" src="${base}/shared/language/controller.js"></script>
<script defer src="${base}/shared/navigation/controller.js"></script>
<script defer src="${base}/shared/ui/controller.js"></script>
</head><body>
${fallback ? renderFallbackNotice(project.slug) : bilingual ? renderLanguageNotice(languageSwitch.chineseHref) : ''}
${nav}
<div class="site-project-content" lang="${contentLanguage}">
${resolveAssets(content.replaceAll('{{citation}}',`<div lang="${locale === 'zh' ? 'zh-CN' : 'en'}">${renderCitation(bibtex,messages)}</div>`))}
</div>
${renderFooter({base,name:site.name,team:site.team,homeHref,labels:ui.footer,languageSwitch})}
${renderBackToTop(ui.backToTop)}
</body></html>\n`;
      const destination = locale === 'en' ? output : resolve(root,'public/zh/projects',project.slug);
      await mkdir(destination,{recursive:true});
      await writeFile(resolve(destination,'index.html'),html);
      pageCount++;
    }
    if (bilingual) {
      await mkdir(resolve(output,'zh'),{recursive:true});
      await writeFile(resolve(output,'zh/index.html'),renderLegacyRedirect(chineseHref));
    }
  }
  await writeFile(resolve(root,'public/.nojekyll'),'');
  await writeFile(resolve(root,'public/sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(url=>`<url><loc>${escape(url)}</loc></url>`).join('')}</urlset>`);
  await writeFile(resolve(root,'public/robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${siteURL()}sitemap.xml\n`);
  console.log(`Generated ${pageCount} project pages (${base || '/'}).`);
}
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) await generate({clean:true});
