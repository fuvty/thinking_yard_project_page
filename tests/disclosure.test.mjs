import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source = await readFile(new URL('../shared/ui/components/disclosure.js', import.meta.url), 'utf8');
function fixture({open=false,reduced=false}={}) {
  const events=[], animations=[];
  let resize;
  class Element {
    constructor(height) { this.height=height; this.attrs=new Map(); this.handlers={}; this.style={removeProperty:key=>delete this.style[key]}; }
    addEventListener(name,callback) { this.handlers[name]=callback; }
    setAttribute(name,value) { this.attrs.set(name,value); }
    removeAttribute(name) { this.attrs.delete(name); }
    toggleAttribute(name,on) { on ? this.attrs.set(name,'') : this.attrs.delete(name); }
    getBoundingClientRect() { return {height:this.height}; }
    dispatchEvent(event) { events.push(event); }
  }
  const summary=new Element(76),body=new Element(160),details=new Element(open?236:76);
  details.open=open;
  details.querySelector=selector=>selector.includes('summary')?summary:body;
  details.animate=(frames,options)=>{const animation={frames,options,cancel(){this.cancelled=true;}};animations.push(animation);return animation;};
  const motion={matches:reduced,addEventListener:(_type,fn)=>motion.change=fn};
  vm.runInNewContext(source,{
    document:{querySelectorAll:()=>[details]},matchMedia:()=>motion,
    getComputedStyle:()=>({borderTopWidth:'0',borderBottomWidth:'0'}),
    ResizeObserver:class {constructor(fn){resize=fn;}observe(){}},
    CustomEvent:class {constructor(type,options){this.type=type;this.detail=options.detail;}}
  });
  return {details,summary,body,events,animations,motion,resize:()=>resize(),click:()=>summary.handlers.click({preventDefault(){}}),finish:()=>animations.at(-1).onfinish()};
}
test('disclosure closing excludes content immediately and notifies completion once',()=>{
  const f=fixture({open:true}); f.click();
  assert.equal(f.body.inert,true); assert.equal(f.details.open,true);
  assert.equal(f.summary.attrs.get('aria-expanded'),'false');
  assert.equal(f.events[0].type,'sp-fold-change');assert.equal(f.events[0].detail.open,false);
  assert.equal(f.animations[0].frames[1].height,'76px');
  f.finish();assert.equal(f.details.open,false);assert.equal(f.details.style.height,undefined);
  assert.equal(f.events.filter(e=>e.type==='sp-fold-settled').length,1);
});
test('reversing mid-motion preserves visible height and does not complete the abandoned transition',()=>{
  const f=fixture();f.click();f.details.height=150;f.click();
  assert(f.animations[0].cancelled);assert.equal(f.animations[1].frames[0].height,'150px');
  assert.equal(f.events.filter(e=>e.type==='sp-fold-settled').length,0);
  f.details.height=120;f.click();assert(f.animations[1].cancelled);
  assert.equal(f.animations[2].frames[0].height,'120px');f.finish();
  assert.equal(f.details.open,true);assert.equal(f.body.inert,false);
  assert.equal(f.events.filter(e=>e.type==='sp-fold-settled').length,1);
});
test('reduced motion settles immediately, including a preference change during travel',()=>{
  const f=fixture({reduced:true});f.click();assert.equal(f.details.open,true);assert.equal(f.animations.length,0);
  f.click();assert.equal(f.details.open,false);assert.equal(f.body.inert,true);
  const moving=fixture();moving.click();moving.motion.matches=true;moving.motion.change();
  assert(moving.animations[0].cancelled);assert.equal(moving.details.open,true);assert.equal(moving.details.style.height,undefined);
});
test('resizing open content retargets height without changing selection or lifecycle intent',()=>{
  const f=fixture();f.click();f.body.height=240;f.details.height=130;f.resize();
  assert.equal(f.animations[1].frames[1].height,'316px');
  assert.equal(f.events.filter(e=>e.type==='sp-fold-change').length,1);
  f.finish();assert.equal(f.details.style.height,undefined);
});
