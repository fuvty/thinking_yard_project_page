import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayback} from '../projects/tokenrouter/static/js/playback.js';

function harness(t,reduced=false) {
 const button={handlers:{},attrs:{},addEventListener(event,fn){this.handlers[event]=fn;},setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k];}};
 const range={value:'0',handlers:{},addEventListener(event,fn){this.handlers[event]=fn;}};
 const motion={matches:reduced,addEventListener(_,fn){this.change=fn;}};
 const document={hidden:false,addEventListener(_,fn){this.visibility=fn;}};
 let observer,next=0;const frames=new Map(),renders=[];
 for(const [key,value] of Object.entries({
  matchMedia:()=>motion,document,
  requestAnimationFrame:fn=>{frames.set(++next,fn);return next;},
  cancelAnimationFrame:id=>frames.delete(id),
  IntersectionObserver:class {constructor(fn){observer=fn;}observe(){}}
 })) {
  const original=Object.getOwnPropertyDescriptor(globalThis,key);
  Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
  t.after(()=>original?Object.defineProperty(globalThis,key,original):delete globalThis[key]);
 }
 const playback=createPlayback({querySelector:()=>button},{duration:10000,label:'test illustration',range,render:p=>renders.push(p)});
 const tick=now=>{const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(now));};
 return {button,range,motion,document,frames,renders,playback,tick,visible:ratio=>observer([{isIntersecting:ratio>0,intersectionRatio:ratio}])};
}

test('Explanatory playback pauses off-screen and scrubbing never resumes unexpectedly',t=>{
 const h=harness(t);
 assert.equal(h.frames.size,0);
 h.visible(.1);assert.equal(h.frames.size,0);
 h.visible(.5);h.tick(1000);h.tick(3000);assert.equal(h.playback.progress,.2);
 h.visible(0);assert.equal(h.frames.size,0);
 h.visible(.5);h.tick(80000);assert.equal(h.playback.progress,.2,'Returning does not advance hidden time');
 h.range.value='750';h.range.handlers.input();assert.equal(h.playback.progress,.75);assert.equal(h.frames.size,0);
 h.visible(0);h.visible(.5);assert.equal(h.frames.size,0,'A manually paused figure stays paused');
 h.button.handlers.click();h.tick(90000);h.tick(95000);
 assert.equal(h.playback.progress,1);assert.equal(h.button.attrs['aria-label'],'Replay test illustration');assert.equal(h.button.attrs['aria-pressed'],'false');assert.equal(h.frames.size,0);
 h.button.handlers.click();assert.equal(h.playback.progress,0);assert.equal(h.frames.size,1);
 h.document.hidden=true;h.document.visibility();assert.equal(h.frames.size,0);
});

test('Reduced motion keeps figures static and permits manual stage selection',t=>{
 const h=harness(t,true);h.visible(.8);
 assert.equal(h.playback.progress,1);assert.equal(h.frames.size,0);
 h.playback.seek(.4);assert.equal(h.playback.progress,.4);assert.equal(h.frames.size,0);
 h.playback.restart();assert.equal(h.playback.progress,1);assert.equal(h.frames.size,0);
 h.motion.matches=false;h.motion.change();assert.equal(h.frames.size,0);
 h.button.handlers.click();assert.equal(h.frames.size,1);
 h.motion.matches=true;h.motion.change();assert.equal(h.playback.progress,1);assert.equal(h.frames.size,0);
});
