import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {roadNetwork,pointAt,createRoadMotion,roadMotionAt} from '../projects/tokenrouter/static/js/model.js';

const source=readFileSync(new URL('../projects/tokenrouter/static/js/hero.js',import.meta.url),'utf8')
  .replace(/^import .*\n/,'').replace('export function initRoads()','function initRoads()');
function setup({reduced=false,width=1210,height=720}={}) {
  let now=0,frame=0,resize,laneWidth=roadNetwork(width,height).laneWidth;
  const callbacks=new Map(),handlers=new Map(),controlHandlers=new Map();
  class Element {constructor(control=false){this.control=control;}closest(){return this.control?this:null;}}
  const target=new Element(),heads=[],feedback=[],highlights=[];
  const context={clearRect(){heads.length=0;feedback.length=0;highlights.length=0;},setTransform(){},beginPath(){},moveTo(){},lineTo(){},setLineDash(){},stroke(){if(this.lineWidth===laneWidth&&this.strokeStyle.startsWith('rgba('))highlights.push(this.strokeStyle);},fill(){},drawImage(){},
    arc(x,y,r){assert(Number.isFinite(x)&&Number.isFinite(y));if(r===3.1)heads.push([x,y]);else if(r>=9)feedback.push([x,y,r]);}};
  const backdrop={...context,clearRect(){},stroke(){},arc(){}};
  const hero={clientWidth:width,clientHeight:height,getBoundingClientRect:()=>({left:0,top:0}),addEventListener:(name,fn)=>handlers.set(name,fn)};
  const canvas={parentElement:hero,getContext:()=>context};
  const control={addEventListener:(name,fn)=>controlHandlers.set(name,fn),setAttribute(){},querySelector:()=>({setAttribute(){}})};
  const motion={matches:reduced,addEventListener(name,fn){this.change=fn;}};
  const win={scrollY:0,getSelection:()=>({toString:()=>''})};
  vm.runInNewContext(source+'\ninitRoads();',{roadNetwork,pointAt,createRoadMotion,roadMotionAt,Element,window:win,
    document:{hidden:false,querySelector:id=>id==='#routing-roads'?canvas:control,createElement:()=>({getContext:()=>backdrop}),addEventListener(){}},
    matchMedia:()=>motion,devicePixelRatio:1,performance:{now:()=>now},
    requestAnimationFrame:fn=>{callbacks.set(++frame,fn);return frame;},cancelAnimationFrame:id=>callbacks.delete(id),
    ResizeObserver:class{constructor(fn){resize=fn;}observe(){}},IntersectionObserver:class{observe(){}}});
  function send(name,extra={}){handlers.get(name)?.({isPrimary:true,button:0,pointerId:1,clientX:650,clientY:250,target,...extra});}
  function tap(extra={}){send('pointerdown',extra);send('pointerup',extra);}
  function advance(seconds){for(let i=0;i<Math.ceil(seconds*20);i++){now+=50;const pending=[...callbacks.values()];callbacks.clear();pending.forEach(fn=>fn(now));}}
  return {heads,feedback,highlights,send,tap,advance,win,motion,callbacks,control:new Element(true),pause:()=>controlHandlers.get('click')(),
    resize(w,h){laneWidth=roadNetwork(w,h).laneWidth;hero.clientWidth=w;hero.clientHeight=h;resize();}};
}

test('Hero clicks add temporary traffic at the road edges, and complete trips retire naturally',()=>{
  const h=setup();assert.equal(h.heads.length,12);
  h.tap();assert.equal(h.heads.length,28);
  assert.equal(new Set(h.highlights).size,8,'Every entrance highlights in its own color');
  assert.deepEqual(h.feedback[0],[650,250,9],'The click location acknowledges immediately, before requests enter');
  assert(h.heads.slice(12).every(([x,y])=>x<0||x>1210||y<0||y>720),'Added requests start outside the viewport');
  h.advance(1);
  assert(h.heads.slice(12).some(([x,y])=>x>=0&&x<=1210&&y>=0&&y<=720),'New requests arrive promptly through entrances');
  h.advance(.5);assert.equal(h.feedback.length,0,'Feedback fades while requests continue their routes');
  h.win.getSelection=()=>({toString:()=>'TokenRouter'});
  for(let i=0;i<9;i++)h.tap();
  assert.equal(h.highlights.length,8,'Repeated clicks retrigger one pulse across eight entrances');
  h.advance(2);assert.equal(h.heads.length,172,'All ten clicks add requests, including those beyond the old cap');
  h.advance(35);assert.equal(h.heads.length,12,'Temporary traffic drains completely back to the baseline');
});

test('Controls, drags, scrolling and paused animation do not inject requests',()=>{
  const h=setup();
  h.tap({target:h.control});h.tap({button:2});
  h.send('pointerdown');h.send('pointermove',{clientX:700});h.send('pointerup');
  h.send('pointerdown');h.win.scrollY=30;h.send('pointerup');
  h.send('pointerdown');h.send('pointercancel');h.send('pointerup');
  assert.equal(h.heads.length,12);
  assert.equal(h.feedback.length,0,'Controls and gestures do not show a misleading click response');
  h.pause();h.tap();assert.equal(h.heads.length,12);assert.equal(h.callbacks.size,0);
  assert.equal(h.feedback.length,0);
  h.pause();h.tap();assert.equal(h.heads.length,28);
  h.pause();assert.equal(h.feedback.length,0,'Pausing clears the transient ripple instead of freezing it');
});

test('Mobile repeated taps keep adding requests, resizing preserves them, and reduced motion stays paused',()=>{
  const h=setup({reduced:true,width:390,height:844});
  h.tap();assert.equal(h.heads.length,12);assert.equal(h.callbacks.size,0);
  h.motion.matches=false;h.motion.change();h.tap();assert.equal(h.heads.length,24);
  h.tap();h.tap();h.tap();h.advance(1);assert.equal(h.heads.length,60);
  h.resize(1210,720);assert.equal(h.heads.length,60,'Resizing preserves in-flight requests');
  h.advance(35);assert.equal(h.heads.length,12);
});


test('Port branches keep a fixed hue; only distance between ring joins changes request and trail colors',()=>{
  const color=vm.runInNewContext(source+'\nrequestColor;');
  for(const [w,h] of [[390,844],[1210,720]]) {
    for(const road of roadNetwork(w,h).roads) {
      const {ringStart,ringEnd}=road.gates,length=road.travel.length;
      const entry=color({origin:road.origin,destination:road.origin},0);
      const exit=color({origin:road.destination,destination:road.destination},0);
      for(const fraction of [0,.25,.75,1]) {
        assert.equal(color(road,ringStart*fraction/length),entry,'Every incoming branch sample keeps its port color');
        assert.equal(color(road,(ringEnd+(length-ringEnd)*fraction)/length),exit,'Every outgoing branch sample keeps its port color');
      }
      for(const fraction of [.25,.5,.75]) {
        assert.equal(color(road,(ringStart+(ringEnd-ringStart)*fraction)/length),
          color({origin:road.origin,destination:road.destination},fraction),'Hue follows ring distance, not whole-route distance');
      }
      assert.equal(color(road,(ringStart+.00001)/length),entry,'No color jump at the entrance join');
      assert.equal(color(road,(ringEnd-.00001)/length),exit,'No color jump at the exit join');
    }
  }
});
