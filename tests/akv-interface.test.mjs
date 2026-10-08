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
  assert.deepEqual(at(10).messages,[0]);
  assert.deepEqual(at(28).messages,[0,1]);
  assert.deepEqual(at(50).messages,[0,1,2]);
  assert.deepEqual(active(10),[0]);
  assert.deepEqual(active(20.5),[0,1]);
  assert.deepEqual(active(28),[1]);
  assert.deepEqual(active(38.5),[1,2]);
  assert.deepEqual(active(42),[2]);
  assert.equal(at(42).caches.find(cache=>cache.id===2).repositioned,false);
  assert.equal(at(50).caches.find(cache=>cache.id===2).repositioned,true);
});

test('compatible KV persists across requests; repos changes K positions without moving or changing message identity and V',()=>{
  const cacheAt=(time,id)=>plain(scene.frame(time)).caches.find(cache=>cache.id===id);
  for(const [before,after,id] of [[10,20.5,0],[28,38.5,1]]) {
    const earlier=cacheAt(before,id),reused=cacheAt(after,id);
    assert.equal(earlier.computedAt,reused.computedAt);
    assert.equal(earlier.valueState,reused.valueState);
    assert.equal(reused.reused,true);
  }
  const beforeRepos=cacheAt(42,2),afterRepos=cacheAt(50,2);
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
