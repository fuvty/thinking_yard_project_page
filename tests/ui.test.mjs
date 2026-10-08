import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const script=await readFile(new URL('../shared/ui/controller.js',import.meta.url),'utf8');
function ui({clipboard='success',fallback=true,reduced=false,snap='none'}={}) {
 const timers=new Map(),frames=new Map(),written=[];let timerId=0,frameId=0,document;
 class Element {
  constructor(){this.events={};this.attrs={};this.dataset={};this.style={};this.textContent='';const classes=new Set();this.classList={toggle:(n,on)=>on?classes.add(n):classes.delete(n),contains:n=>classes.has(n)};}
  addEventListener(name,fn){this.events[name]=fn;}
  emit(name,event={}){return this.events[name]?.(event);}
  setAttribute(k,v){this.attrs[k]=v;}
  focus(){document.activeElement=this;}
  select(){}remove(){this.removed=true;}
 }
 const top=new Element(),copy=new Element(),label=new Element(),status=new Element(),home=new Element(),code=new Element();code.textContent='@article{example, title={A & B}}';copy.dataset.copyTarget='bibtexCode';
 copy.querySelector=()=>label;copy.closest=()=>({querySelector:()=>status});
 document={documentElement:{style:{scrollSnapType:'',scrollBehavior:''}},activeElement:copy,body:{appendChild:f=>{document.field=f;}},querySelector:()=>home,querySelectorAll:()=>[copy],getElementById:id=>id==='scrollTop'?top:code,createElement:()=>new Element(),execCommand:()=>fallback};
 const window=new Element();window.location={hash:'#bibtex',pathname:'/projects/c2c/',search:'?test=1'};window.history={replaceState:(_state,_title,url)=>{window.replacedURL=url;}};window.getComputedStyle=()=>({scrollSnapType:snap});window.requestAnimationFrame=fn=>{frames.set(++frameId,fn);return frameId;};window.cancelAnimationFrame=id=>frames.delete(id);window.scrollY=600;window.matchMedia=()=>({matches:reduced});window.scrollTo=options=>{window.scrollOptions=options;};window.setTimeout=fn=>{timers.set(++timerId,fn);return timerId;};window.clearTimeout=id=>timers.delete(id);
 const navigator={clipboard:{writeText:async text=>{written.push(text);if(clipboard==='failure')throw Error('Denied');}}};if(clipboard==='missing')delete navigator.clipboard;
 vm.runInNewContext(script,{window,document,navigator});
 return {top,copy,label,status,home,code,document,window,written,flushFrames:()=>{while(frames.size){const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn());}},flush:()=>{[...timers.values()].forEach(fn=>fn());timers.clear();}};
}
test('back to top shares visibility, reduced motion and keyboard focus restoration',()=>{
 for(const reduced of [false,true]){
  const n=ui({reduced});assert(!n.top.inert);assert(n.top.classList.contains('is-visible'));
  n.top.emit('click',{detail:0});assert.equal(n.window.scrollOptions.behavior,reduced?'instant':'smooth');assert.equal(n.window.scrollOptions.top,0);
  n.window.scrollY=0;n.window.emit('scroll');assert(n.top.inert);assert.equal(n.top.attrs['aria-hidden'],'true');n.flushFrames();assert.equal(n.document.activeElement,n.home);assert.equal(n.window.replacedURL,'/projects/c2c/?test=1');
 }
});
test('copy preserves citation text and resets consistent success feedback',async()=>{
 const n=ui();await n.copy.emit('click');assert.deepEqual(n.written,[n.code.textContent]);assert.equal(n.copy.dataset.state,'success');assert.equal(n.label.textContent,'Copied');assert.equal(n.copy.disabled,false);
 n.flush();assert.equal(n.label.textContent,'Copy BibTeX');assert.equal(n.copy.dataset.state,undefined);
});
test('empty citations do not clear the clipboard or report copy success',async()=>{
 for(const clipboard of ['success','missing'])for(const text of ['', ' \n\t ']){
  const n=ui({clipboard});n.code.textContent=text;await n.copy.emit('click');
  assert.deepEqual(n.written,[]);assert.equal(n.document.field,undefined);
  assert.equal(n.copy.dataset.state,undefined);assert.notEqual(n.label.textContent,'Copied');
 }
});
test('copy fallback cleans up and never claims success when clipboard and fallback fail',async()=>{
 for(const clipboard of ['failure','missing']){
  const success=ui({clipboard});await success.copy.emit('click');assert.equal(success.copy.dataset.state,'success');assert(success.document.field.removed);assert.equal(success.document.activeElement,success.copy);
  const failure=ui({clipboard,fallback:false});await failure.copy.emit('click');assert.equal(failure.copy.dataset.state,'error');assert.equal(failure.label.textContent,'Try again');assert.match(failure.status.textContent,/Copy failed/);assert(failure.document.field.removed);assert.equal(failure.copy.disabled,false);
 }
});

test('mandatory story snapping is temporarily suspended and restored on return to top',()=>{
 const n=ui({snap:'y mandatory'});n.top.emit('click',{detail:0});
 assert.equal(n.window.scrollOptions.behavior,'instant');assert.equal(n.document.documentElement.style.scrollSnapType,'none');
 n.flushFrames();assert.equal(n.document.documentElement.style.scrollSnapType,'');assert.equal(n.document.documentElement.style.scrollBehavior,'');
});
