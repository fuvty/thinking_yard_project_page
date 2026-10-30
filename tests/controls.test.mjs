import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {parseFragment} from 'parse5';

// Surface/semantics contracts matter across pages even when their layout changes.
test('adopted controls keep native semantics, selection state and supported surfaces',async()=>{
 let groups=0,disclosures=0;
 for(const slug of await readdir('projects')){
  const source=await readFile(`projects/${slug}/content.html`,'utf8').catch(()=>null);
  if(!source)continue;
  const visit=(node,surface='white')=>{
   const attrs=Object.fromEntries((node.attrs||[]).map(a=>[a.name,a.value]));
   const classes=(attrs.class||'').split(/\s+/);
   if(classes.includes('section'))surface='white';
   if(classes.includes('section-gray'))surface='gray';
   if(classes.includes('section-dark'))surface='dark';
   surface=attrs['data-ui-surface']||surface;
   assert(['white','gray','dark'].includes(surface),`${slug}: unknown surface`);
   if(classes.includes('sp-segmented')){
    groups++;
    assert.equal(attrs.role,'group',`${slug}: selector needs grouping semantics`);
    const buttons=(node.childNodes||[]).filter(n=>n.tagName==='button');
    const states=buttons.map(n=>n.attrs.find(a=>a.name==='aria-pressed')?.value);
    assert(buttons.length>=2,`${slug}: selector has multiple choices`);
    assert(states.every(s=>s==='true'||s==='false'),`${slug}: every choice exposes state`);
    assert.equal(states.filter(s=>s==='true').length,1,`${slug}: exactly one selected choice`);
   }
   assert(!classes.includes('sp-disclosure'),`${slug}: use the shared sp-fold component`);
   if(classes.includes('sp-fold')){
    disclosures++;
    assert.equal(node.tagName,'details');
    assert.notEqual(surface,'dark',`${slug}: disclosure must be on a light surface`);
    assert.equal(node.childNodes.find(n=>n.tagName)?.tagName,'summary');
    const hasClass=(n,name)=>n.attrs?.some(a=>a.name==='class'&&a.value.split(/\s+/).includes(name));
    assert.equal(node.childNodes.filter(n=>hasClass(n,'sp-fold-body')).length,1,`${slug}: one direct measurable disclosure body`);
    const summary=node.childNodes.find(n=>n.tagName==='summary');
    assert(summary.childNodes.some(n=>hasClass(n,'sp-fold-icon')),`${slug}: icon stays outside translated labels`);
   }
   if(classes.includes('sp-select'))assert.equal(node.tagName,'select');
   for(const child of node.childNodes||[])visit(child,surface);
  };visit(parseFragment(source));
 }
 assert(groups>=10 && disclosures>=15,'cross-project coverage must not silently disappear');
});
