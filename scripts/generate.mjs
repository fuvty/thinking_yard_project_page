import { mkdir, readFile, writeFile, cp, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderNavigation } from '../shared/navigation/render.mjs';
import { renderBackToTop, renderCitation, renderFooter } from '../shared/ui/render.mjs';
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
    slugs.add(p.slug);
  }
  // public is exclusively generated; source assets live in hub/, shared/, and projects/.
  if (clean) await rm(resolve(root,'public'),{recursive:true,force:true});
  await mkdir(resolve(root,'public'),{recursive:true});
  await cp(resolve(root,'hub/assets'),resolve(root,'public'),{recursive:true});
  await cp(resolve(root,'shared'),resolve(root,'public/shared'),{recursive:true,filter:src=>!src.endsWith('.mjs')});
  for (const project of projects) {
    const source = resolve(root,'projects',project.slug);
    const output = resolve(root,'public/projects',project.slug);
    const [meta,head,body,bibtex] = await Promise.all([
      json(`projects/${project.slug}/page.json`),readFile(resolve(source,'head.html'),'utf8'),readFile(resolve(source,'content.html'),'utf8'),readFile(resolve(source,'citation.bib'),'utf8'),
    ]);
    if ((body.match(/\{\{citation\}\}/g) || []).length !== 1) throw new Error(`${project.slug}: content.html must contain one {{citation}} slot`);
    await mkdir(output,{recursive:true});
    await cp(resolve(source,'static'),resolve(output,'static'),{recursive:true});
    const nav = renderNavigation({projects,categories,current:project.slug,name:project.name,sections:meta.sections,base});
    const url = `${siteURL()}projects/${project.slug}/`;
    const styles = ['tokens','components',...(meta.theme==='research'?['research']:[])].map(name=>`<link rel="stylesheet" href="${base}/shared/styles/${name}.css">`).join('\n');
    const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(meta.title)}</title><meta name="description" content="${escape(meta.description)}">
<link rel="canonical" href="${escape(url)}">
<meta property="og:title" content="${escape(meta.title)}"><meta property="og:description" content="${escape(meta.description)}"><meta property="og:url" content="${escape(url)}"><meta property="og:type" content="website">
${head.replaceAll('{{base}}',base).replace(/<link[^>]+href="\.\/static\/css\/index\.css[^"]*"[^>]*>/, match => `${styles}\n${match}`)}
<link rel="stylesheet" href="${base}/shared/navigation/styles.css">
<link rel="stylesheet" href="${base}/shared/ui/styles.css">
<script defer src="${base}/shared/navigation/controller.js"></script>
<script defer src="${base}/shared/ui/controller.js"></script>
</head><body>
${nav}
${body.replaceAll('{{citation}}',renderCitation(bibtex))}
${renderFooter({base,name:site.name,team:site.team})}
${renderBackToTop()}
</body></html>\n`;
    await writeFile(resolve(output,'index.html'),html);
  }
  await writeFile(resolve(root,'public/.nojekyll'),'');
  const urls = [siteURL(),`${siteURL()}zh/`,...projects.map(p=>`${siteURL()}projects/${p.slug}/`)];
  await writeFile(resolve(root,'public/sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(url=>`<url><loc>${escape(url)}</loc></url>`).join('')}</urlset>`);
  await writeFile(resolve(root,'public/robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${siteURL()}sitemap.xml\n`);
  console.log(`Generated ${projects.length} project pages (${base || '/'}).`);
}
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) await generate({clean:true});
