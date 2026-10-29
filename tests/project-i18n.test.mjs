import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {parseFragment} from 'parse5';
import {translateContent, translateMetadata} from '../shared/language/project.mjs';
import {renderLanguageData, renderLanguageNotice} from '../shared/language/render.mjs';
import {projectPath, getUI} from '../shared/language/locale.mjs';
import {renderCitation} from '../shared/ui/render.mjs';
import projects from '../config/projects.json' with {type:'json'};
const read = path => readFile(new URL(`../${path}`,import.meta.url),'utf8');
function interactiveStructure(html) {
  const nodes = [];
  function visit(node) {
    const attrs = Object.fromEntries((node.attrs || []).filter(({name}) => name === 'id' || name === 'value' || name.startsWith('data-') && !name.startsWith('data-i18n') && name !== 'data-emphasis' || ['href','src','poster'].includes(name)).map(({name,value})=>[name,value]));
    if (Object.keys(attrs).length) nodes.push({tag:node.tagName,attrs});
    (node.childNodes || []).forEach(visit);
  }
  visit(parseFragment(html));
  return nodes;
}
test('project translations preserve anchors, control values, media, data attributes, and the citation slot',async()=>{
  for (const project of projects.filter(p=>p.locales?.includes('zh'))) {
    const source = await read(`projects/${project.slug}/content.html`);
    const translation = JSON.parse(await read(`projects/${project.slug}/locales/zh.json`));
    const meta = JSON.parse(await read(`projects/${project.slug}/page.json`));
    const chinese = translateContent(source,translation,project.slug);
    assert.deepEqual(interactiveStructure(chinese),interactiveStructure(source),project.slug);
    assert.equal((chinese.match(/\{\{citation\}\}/g)||[]).length,1);
    assert.deepEqual(Object.keys(translation.page.sections).sort(),meta.sections.map(s=>s.id).sort());
    const translatedMeta = translateMetadata(meta,translation);
    assert.deepEqual(translatedMeta.sections.map(s=>[s.id,s.group]),meta.sections.map(s=>[s.id,s.group]));
    for (const section of translatedMeta.sections) assert(section.label && section.description);
  }
});
test('translation errors fail early instead of publishing incomplete or stale copy',()=>{
  const source = '<p data-i18n="body">English</p><img data-i18n-attrs="figure" alt="Figure">';
  const dictionary = {html:{body:'中文 <strong>内容</strong>'},attributes:{figure:{alt:'图示'}}};
  assert.match(translateContent(source,dictionary),/alt="图示"/);
  assert.throws(()=>translateContent(source,{...dictionary,html:{}}),/missing html translation body/);
  assert.throws(()=>translateContent(source,{...dictionary,html:{...dictionary.html,old:'旧'}}),/unused html translation old/);
  assert.throws(()=>translateContent(source,{...dictionary,attributes:{figure:{src:'wrong.png'}}}),/unsupported translated attribute src/);
});
test('shared runtime uses route-safe asset paths, full phrase interpolation, and English fallbacks',async()=>{
  const source = await read('shared/language/runtime.js');
  for (const base of ['', '/thinking_yard_project_page']) for (const locale of ['en','zh']) {
    const project = projects.find(p=>p.slug==='r2r');
    const data = {locale,projectRoot:projectPath(project,'en',base),messages:locale==='zh'?{'Request {number}':'请求 {number}'}:{}};
    const context = {document:{getElementById:()=>({textContent:JSON.stringify(data)})},location:{href:`https://test.example${projectPath(project,locale,base)}`},URL};
    vm.runInNewContext(source,context);
    assert.equal(context.SiteI18n.t('Request {number}',{number:4}),locale==='zh'?'请求 4':'Request 4');
    assert.equal(context.SiteI18n.t('Untranslated model name'),'Untranslated model name');
    assert.equal(context.SiteI18n.asset('./static/data.json'),`https://test.example${base}/projects/r2r/static/data.json`);
  }
});
test('shared prompt and citation copy are localized without altering scientific citation text',()=>{
  assert.match(renderLanguageNotice('/zh/projects/r2r/'),/href="\/zh\/projects\/r2r\/"/);
  const data = renderLanguageData({locale:'zh',projectRoot:'/projects/r2r/',messages:{test:'</script>'}});
  assert(!data.includes('"</script>"'));
  const citation = '@article{paper, title={Original Paper}}';
  const rendered = renderCitation(citation,getUI('zh').messages);
  assert(rendered.includes(citation));
  assert(rendered.includes('复制 BibTeX'));
  assert(rendered.includes('BibTeX 引用'));
});


test('named semantic emphasis can move with word order but must keep its identity and role',()=>{
  const source = '<p data-i18n="idea"><strong data-emphasis="cache">cache engineering</strong> enables <em data-emphasis="reuse">reuse</em>.</p>';
  const html = {idea:'通过<em data-emphasis="reuse">复用</em>实现<strong data-emphasis="cache">缓存工程</strong>。'};
  assert.doesNotThrow(()=>translateContent(source,{html}));
  assert.throws(()=>translateContent(source,{html:{idea:'没有强调。'}}),/emphasis markers differ/);
  assert.throws(()=>translateContent(source,{html:{idea:'<strong data-emphasis="cache">缓存</strong><strong data-emphasis="cache">缓存</strong>'}}),/duplicate emphasis/);
  assert.throws(()=>translateContent(source,{html:{idea:'<strong data-emphasis="cache">缓存</strong><strong data-emphasis="reuse">复用</strong>'}}),/emphasis markers differ/);
});
