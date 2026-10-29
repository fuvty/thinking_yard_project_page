import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import * as preferences from '../shared/language/preferences.js';
import {renderFooter} from '../shared/ui/render.mjs';
import {renderLegacyRedirect, renderFallbackNotice} from '../shared/language/render.mjs';
import {projectPath, hasChinese} from '../shared/language/locale.mjs';
import {basePath, siteURL} from '../config/paths.mjs';
import projects from '../config/projects.json' with {type:'json'};
const controller = (await readFile(new URL('../shared/language/controller.js',import.meta.url),'utf8')).replace(/^import .*;\n/,'');
const memoryStorage = () => {const data = new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};};
function page({session=memoryStorage(),saved=memoryStorage(),slug='tah2',scrollY=0,notice=true,hash='#results'}={}) {
  const banner = notice ? {dataset:{noticeKind:'fallback',page:slug},setAttribute(key,value){this[key]=value;}} : null;
  const events = {}, windowEvents = {};
  const window = {scrollY,addEventListener:(key,fn)=>{windowEvents[key]=fn;},removeEventListener:key=>delete windowEvents[key]};
  vm.runInNewContext(controller,{...preferences,localStorage:saved,sessionStorage:session,location:{hash,search:'?preview=1'},navigator:{languages:['zh-CN']},window,
    document:{documentElement:{lang:'zh-CN'},readyState:'complete',querySelector:()=>banner,addEventListener:(key,fn)=>{events[key]=fn;}}});
  return {banner,session,saved,scroll:y=>{window.scrollY=y;windowEvents.scroll?.();},click:(selector,choice)=>events.click({target:{closest:value=>selector===value?choice:null}})};
}
test('missing translations keep a Chinese site route independent of translation availability',()=>{
  for(const base of ['', '/thinking_yard_project_page']) for(const p of projects){
    assert.equal(projectPath(p,'zh',base),`${base}/zh/projects/${p.slug}/`);
    assert.equal(projectPath(p,'en',base),`${base}/projects/${p.slug}/`);
  }
});
test('fallback notice is per project per session, scrolls away once, and never changes language preference',()=>{
  const saved = memoryStorage(); saved.setItem(preferences.languagePreferenceKey,'zh');
  const n = page({saved});
  assert.equal(n.banner.dataset.open,'true'); assert.equal(n.banner.inert,false);
  n.scroll(9); assert.equal(n.banner.dataset.open,'false'); assert.equal(n.banner.inert,true);
  n.scroll(0); assert.equal(n.banner.dataset.open,'false');
  assert.equal(page({session:n.session}).banner.dataset.open,'false');
  assert.equal(page({session:n.session,slug:'moa'}).banner.dataset.open,'true');
  assert.equal(saved.getItem(preferences.languagePreferenceKey),'zh');
});
test('deep links do not flash a fallback bar and manual dismissal works with blocked storage',()=>{
  assert.equal(page({scrollY:200}).banner.dataset.open,'false');
  const blocked = {getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
  const n = page({session:blocked});
  n.click('[data-dismiss-language-notice]',{});
  assert.equal(n.banner['aria-hidden'],'true');
});
test('English remains selectable on an unavailable page, preserving query and anchor',()=>{
  const n = page({notice:false});
  const choice = {tagName:'A',dataset:{homeLanguage:'en'}};
  n.click('[data-home-language]',choice);
  assert.equal(choice.hash,'#results'); assert.equal(choice.search,'?preview=1');
  assert.equal(n.saved.getItem(preferences.languagePreferenceKey),'en');
  const top = {tagName:'A',dataset:{homeLanguage:'en'}};
  page({notice:false,hash:''}).click('[data-home-language]',top);
  assert.equal(top.search,'?preview=1');
  const footer = renderFooter({languageSwitch:{locale:'zh',englishHref:'/projects/tah2/',chineseHref:'/zh/projects/tah2/',chineseAvailable:false}});
  assert.match(footer,/aria-disabled="true"/);assert.match(footer,/暂未提供/);
  assert(!footer.includes('data-home-language="zh"'));
  assert(footer.includes('href="/projects/tah2/" data-home-language="en"'));
});
test('legacy redirects preserve query and section without another copy of project content',()=>{
  const html = renderLegacyRedirect('/site/zh/projects/akv/');
  let redirected;
  vm.runInNewContext(html.match(/<script>(.*?)<\/script>/s)[1],{location:{hash:'#results',search:'?preview=1',replace:url=>{redirected=url;}}});
  assert.equal(redirected,'/site/zh/projects/akv/?preview=1#results');
  assert(html.includes('noindex,follow'));
  assert(renderFallbackNotice('tah2').includes('data-page="tah2"'));
});
test('generated Chinese shells retain shared assets, English content language and honest search metadata',async()=>{
  const base=basePath();
  const sitemap=await readFile('public/sitemap.xml','utf8');
  for(const p of projects){
    const html=await readFile(`public/zh/projects/${p.slug}/index.html`,'utf8');
    assert(html.includes(`href="${base}/zh/" class="sp-home"`));
    assert(html.includes(`href="${base}/zh/projects/tah2/"`));
    assert(html.includes(`${base}/projects/${p.slug}/static/`));
    if(hasChinese(p)){
      assert(html.includes('class="site-project-content" lang="zh-CN"'));
      assert(!html.includes('data-notice-kind="fallback"'));
      assert(sitemap.includes(`${siteURL()}zh/projects/${p.slug}/`));
    }else{
      assert(html.includes('class="site-project-content" lang="en"'));
      assert(html.includes('data-notice-kind="fallback"'));
      assert(html.includes('aria-disabled="true"'));
      assert(!html.includes('hreflang="zh-CN"'));
      assert(html.includes(`<link rel="canonical" href="${siteURL()}projects/${p.slug}/">`));
      assert(!sitemap.includes(`${siteURL()}zh/projects/${p.slug}/`));
    }
  }
});
