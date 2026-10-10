import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const scope=vm.createContext({});
vm.runInContext(readFileSync(new URL('../projects/akv/static/js/serving-interface.js',import.meta.url),'utf8'),scope);
const scene=scope.AKVInterfaceScene;
const plain=value=>JSON.parse(JSON.stringify(value));

// Reconstruct the required states from a request alone. It must describe the
// same computation even when none of the earlier requests reached this server.
function coldReplay(body) {
  const active=new Map();
  body.messages.forEach((_,id)=>{
    const history=[...active.values()].map(cache=>cache.valueState);
    active.set(id,{id,valueState:`m${id}${history.length?`(${history.join(',')})`:''}`,keyPositions:[0,1,2,3].map(i=>id*4+i)});
    for(const dropped of body.cache.drop?.[id]??[]) active.delete(dropped);
    if(body.cache.reposition?.includes(id)) {
      let position=0;
      for(const cache of active.values()) cache.keyPositions=cache.keyPositions.map(()=>position++);
    }
  });
  return [...active.values()];
}

test('each complete request independently specifies the illustrated server state',()=>{
  const requests=plain(scene.requests);
  requests.forEach((request,index)=>{
    const displayed=JSON.parse(scene.requestText(index));
    assert.deepEqual(displayed,request.body);
    const actual=plain(scene.frame(request.still)).caches.filter(cache=>cache.active).map(({id,valueState,keyPositions})=>({id,valueState,keyPositions}));
    assert.deepEqual(actual,coldReplay(displayed));
    if(index>0) {
      const earlier=requests[index-1].body;
      assert.deepEqual(displayed.messages.slice(0,earlier.messages.length),earlier.messages);
      for(const [after,targets] of Object.entries(earlier.cache.drop??{})) assert.deepEqual(displayed.cache.drop[after],targets);
    }
  });
  const html=readFileSync(new URL('../projects/akv/content.html',import.meta.url),'utf8');
  const fallback=JSON.parse(html.match(/id="interface-request-code">([\s\S]*?)<\/code>/)[1]);
  assert.deepEqual(fallback,requests[2].body);
});

test('each round appends one message, then applies only that round’s new operations',()=>{
  const histories=plain(scene.requests).map(({body})=>{
    const ops=[];
    body.messages.forEach((_,id)=>{
      ops.push(`append${id}`);
      for(const dropped of body.cache.drop?.[id]??[]) ops.push(`drop${dropped}`);
      if(body.cache.reposition?.includes(id)) ops.push('repos');
    });
    return ops;
  });
  assert.deepEqual(histories[0],['append0']);
  assert.deepEqual(histories[1].slice(histories[0].length),['append1','drop0']);
  assert.deepEqual(histories[2].slice(histories[1].length),['append2','drop1','repos']);
  const at=time=>plain(scene.frame(time));
  const active=time=>at(time).caches.filter(cache=>cache.active).map(cache=>cache.id);
  assert.deepEqual(at(5).messages,[0]);
  assert.deepEqual(at(15.5).messages,[0,1]);
  assert.deepEqual(at(32).messages,[0,1,2]);
  assert.deepEqual(active(5),[0]);
  assert.deepEqual(active(12),[0,1]);
  assert.deepEqual(active(15.5),[1]);
  assert.deepEqual(active(23),[1,2]);
  assert.deepEqual(active(27),[2]);
  assert.equal(at(26.5).caches.find(cache=>cache.id===2).repositioned,false);
  assert.equal(at(32).caches.find(cache=>cache.id===2).repositioned,true);
});

test('compatible KV persists across requests; repos changes K positions without moving or changing message identity and V',()=>{
  const cacheAt=(time,id)=>plain(scene.frame(time)).caches.find(cache=>cache.id===id);
  for(const [before,after,id] of [[5,12,0],[15.5,23,1]]) {
    const earlier=cacheAt(before,id),reused=cacheAt(after,id);
    assert.equal(earlier.computedAt,reused.computedAt);
    assert.equal(earlier.valueState,reused.valueState);
    assert.equal(reused.reused,true);
  }
  const beforeRepos=cacheAt(26.5,2),afterRepos=cacheAt(32,2);
  assert.equal(beforeRepos.computedAt,afterRepos.computedAt);
  assert.equal(beforeRepos.valueState,afterRepos.valueState);
  assert.equal(beforeRepos.x,afterRepos.x);
  assert.equal(afterRepos.reused,false,'m₂ was computed within request 3');
  assert.deepEqual(beforeRepos.keyPositions,[8,9,10,11]);
  assert.deepEqual(afterRepos.keyPositions,[0,1,2,3]);
  for(let t=0;t<=scene.duration;t+=.2) {
    const frame=plain(scene.frame(t));
    for(const {from,to} of frame.attention) {
      assert.equal(frame.caches.find(cache=>cache.id===to).active,true);
      assert.equal(frame.caches.find(cache=>cache.id===from).ready,false);
    }
    assert.doesNotMatch(scene.draw(t),/NaN|Infinity|undefined/);
    const c=frame.caches.find(cache=>cache.id===2);
    if(c) assert.match(scene.draw(t),new RegExp(`data-interface-kv="2" data-x="${beforeRepos.x}"`));
  }
});

test('request text fades out before changing and back in while the server preserves its cache',()=>{
  const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<.001);
  for(const request of plain(scene.requests).slice(1)) {
    const boundary=request.start;
    close(scene.frame(boundary-.9).requestOpacity,1);
    close(scene.frame(boundary-.45).requestOpacity,.5);
    close(scene.frame(boundary).requestOpacity,0);
    close(scene.frame(boundary+.6).requestOpacity,.5);
    close(scene.frame(boundary+1.2).requestOpacity,1);
    const before=plain(scene.frame(boundary-.01));
    const after=plain(scene.frame(boundary+.01));
    assert.equal(after.request,before.request+1);
    const persistent=frame=>frame.caches.map(({id,x,computedAt,active,valueState,keyPositions})=>({id,x,computedAt,active,valueState,keyPositions}));
    assert.deepEqual(persistent(after),persistent(before));
  }
});

test('code highlights the message or precise operate-after entry being executed, never carried history',()=>{
  const steps=[
    {request:0,key:'append0',start:1.5,end:4.1,text:'{"role":"user", "content":"Search ICLR"}'},
    {request:1,key:'append1',start:8.7,end:11.3,text:'{"role":"assistant", "content":"Searching"}'},
    {request:1,key:'drop0',start:14,end:15.1,text:'"1": [0]'},
    {request:2,key:'append2',start:19.5,end:22.1,text:'{"role":"tool", "content":"ICLR is..."}'},
    {request:2,key:'drop1',start:24.8,end:25.9,text:'"2": [1]'},
    {request:2,key:'repos',start:28.6,end:30.6,text:'"reposition": [2]'}
  ];
  for(const step of steps) {
    assert.equal(scene.frame(step.start-.01).operation,null);
    assert.equal(scene.frame(step.start).operation,step.key);
    assert.equal(scene.frame(step.end-.01).operation,step.key);
    assert.equal(scene.frame(step.end+1e-6).operation,null);
    const frame=plain(scene.frame((step.start+step.end)/2));
    assert.equal(frame.request,step.request);
    const highlighted=plain(scene.requestParts(frame.request)).filter(part=>part.key===frame.operation);
    assert.deepEqual(highlighted,[{text:step.text,key:step.key}]);
    if(step.key.startsWith('append')) {
      const id=Number(step.key.at(-1));
      assert.equal(id,frame.messages.at(-1));
      const cache=frame.caches.find(cache=>cache.id===id);
      assert.equal(cache.ready,false);
      assert.equal(cache.reused,false);
    } else if(step.key.startsWith('drop')) {
      const id=Number(step.key.at(-1));
      const before=scene.frame(step.start).caches.find(cache=>cache.id===id);
      const after=scene.frame(step.end+1e-6).caches.find(cache=>cache.id===id);
      assert.equal(before.active,true);
      assert.equal(after.active,false);
      assert.deepEqual(plain(scene.frame(step.start).messages),plain(scene.frame(step.end).messages));
    } else {
      assert.equal(scene.frame(step.start).caches.find(cache=>cache.id===2).repositioned,false);
      assert.equal(scene.frame(step.end+1e-6).caches.find(cache=>cache.id===2).repositioned,true);
    }
  }
  // Span boundaries must preserve the full JSON payload, including old drops.
  plain(scene.requests).forEach((request,index)=>{
    const parts=plain(scene.requestParts(index));
    assert.deepEqual(JSON.parse(parts.map(part=>part.text).join('')),request.body);
    const keys=parts.filter(part=>part.key).map(part=>part.key);
    assert.equal(new Set(keys).size,keys.length);
  });
  for(let t=0;t<scene.duration;t+=.05) {
    const state=scene.frame(t);
    const expected=steps.find(step=>step.request===state.request&&t>=step.start&&t<step.end);
    assert.equal(state.operation,expected?.key??null);
    if(state.request===2) assert.notEqual(state.operation,'drop0','carried drop history must not replay');
  }
});

test('requests 2 and 3 hold each intermediate result before the next operation',()=>{
  for(const [start,end,ids] of [[11.3,14,[0,1]],[22.1,24.8,[1,2]],[25.9,28.6,[2]]]) {
    assert.ok(Math.abs((end-start)/scene.playbackRate-1.5)<1e-6);
    for(let time=start+1e-6;time<end-.01;time+=.1) {
      const frame=plain(scene.frame(time));
      assert.equal(frame.operation,null,'the previous operation is finished; the next has not started');
      assert.equal(frame.requestOpacity,1,'keep the request readable during inspection');
      assert.deepEqual(frame.caches.filter(cache=>cache.active).map(cache=>cache.id),ids);
      const latest=frame.caches.at(-1);
      assert.equal(latest.ready,true);
      if(latest.id===2) assert.deepEqual(latest.keyPositions,[8,9,10,11]);
    }
  }
});
