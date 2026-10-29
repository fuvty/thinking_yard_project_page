import test from 'node:test';
import assert from 'node:assert/strict';
import { getCopy, localize, homePath, projectPath } from '../hub/i18n.mjs';
import projects from '../config/projects.json' with {type:'json'};
import categories from '../config/categories.json' with {type:'json'};
import site from '../config/site.json' with {type:'json'};
import { renderNavigation } from '../shared/navigation/render.mjs';
import { renderFooter, renderBackToTop } from '../shared/ui/render.mjs';

function textKeys(value, path = '') {
  if (typeof value === 'string') { assert(value.trim(), `Empty translation: ${path}`); return [path]; }
  return Object.entries(value).flatMap(([key, child]) => textKeys(child, `${path}.${key}`));
}
test('home translations cover the same copy and preserve the story anchors', () => {
  assert.deepEqual(textKeys(getCopy('zh')), textKeys(getCopy('en')));
  const ids = getCopy('en').stages.map(stage => stage.id);
  assert.deepEqual(getCopy('zh').stages.map(stage => stage.id), ids);
  assert.deepEqual(site.hubSections.slice(0, 4).map(section => section.id), ids);
});
test('new registry entries work without translation and partial translations retain English fallbacks', () => {
  const added = {slug:'new-project', name:'New Project', description:'English description', logo:'shared/assets/new.svg', route:'03'};
  assert.deepEqual(localize(added, 'zh'), added);
  const partial = {...added, translations:{zh:{description:'中文简介'}}};
  assert.equal(localize(partial, 'en').description, added.description);
  assert.deepEqual(localize(partial, 'zh'), {...partial, description:'中文简介'});
  assert.equal(partial.description, added.description);
  for (const project of projects) {
    const translated = localize(project, 'zh');
    for (const field of ['slug','name','category','route','logo']) assert.equal(translated[field], project[field]);
    assert(translated.description.trim());
  }
});
test('Chinese home navigation and footer preserve base paths and preserve the Chinese site context for every project', () => {
  const copy = getCopy('zh');
  for (const base of ['', '/thinking_yard_project_page']) {
    const homeHref = homePath('zh', base);
    const html = renderNavigation({projects:projects.map(p=>({...localize(p,'zh'),href:projectPath(p,'zh',base)})), categories:categories.map(c=>localize(c,'zh')),
      sections:site.hubSections.map(s=>localize(s,'zh')), base, homeHref, labels:copy.navigation, groupLabels:copy.groupLabels});
    assert(html.includes(`href="${base}/zh/" class="sp-home"`));
    assert(!html.includes('data-home-language'));
    for (const project of projects) assert(html.includes(`href="${projectPath(project,'zh',base)}"`));
    assert(html.includes(`${base}/zh/projects/tah2/`));
    assert(html.includes(copy.navigation.contents));
    const footer = renderFooter({base,homeHref,labels:copy.footer,
      languageSwitch:{locale:'zh',englishHref:homePath('en',base),chineseHref:homePath('zh',base)}});
    assert.equal((footer.match(/data-home-language=/g)||[]).length, 2);
    assert(footer.includes(`href="${base}/" data-home-language="en"`));
    assert(footer.includes('hreflang="zh-CN" aria-current="page"'));
    assert(!footer.includes('hreflang="en" aria-current'));
    assert(footer.includes(`href="${base}/zh/#projects"`));
    assert(renderBackToTop(copy.backToTop).includes(`aria-label="${copy.backToTop}"`));
  }
});
test('default navigation and footer renderers keep their English defaults', () => {
  const html = renderNavigation({projects,categories,base:'/site',current:'tah'});
  assert(!html.includes('data-home-language'));
  assert(!renderFooter().includes('data-home-language'));
  assert(html.includes('>Home</span>'));
  assert(html.includes('>On this page</span>'));
  assert(html.includes('href="/site/" class="sp-home"'));
});
