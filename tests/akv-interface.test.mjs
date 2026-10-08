import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const scope=vm.createContext({});
vm.runInContext(readFileSync(new URL('../projects/akv/static/js/serving-interface.js',import.meta.url),'utf8'),scope);
const scene=scope.AKVInterfaceScene;
const plain=value=>JSON.parse(JSON.stringify(value));

test('animation follows the operate-after history encoded by the displayed JSON',()=>{
  const html=readFileSync(new URL('../projects/akv/content.html',import.meta.url),'utf8');
  const section=html.split('id="stateless-interface"')[1].split('</details>')[0];
  const request=JSON.parse(section.match(/<code>([\s\S]*?)<\/code>/)[1].replace(/<[^>]+>/g,''));
  const expected=[];
  request.messages.forEach((_,index)=>{
    expected.push(`append${index}`);
    for(const target of request.cache.drop[index]??[]) expected.push(`drop${target}`);
    if(request.cache.reposition.includes(index)) expected.push('repos');
  });
  assert.deepEqual(plain(scene.steps).map(step=>step.key),expected);
});

test('full messages survive drops and only retained KV is repositioned',()=>{
  const active=time=>plain(scene.frame(time)).caches.filter(cache=>cache.active).map(cache=>cache.id);
  assert.deepEqual(active(1.9),[0]);
  assert.deepEqual(active(5.0),[0,1]);
  assert.deepEqual(active(6.6),[1]);
  assert.deepEqual(active(9.5),[1,2]);
  assert.deepEqual(active(11.8),[2]);
  const end=plain(scene.frame(16));
  assert.deepEqual(end.caches.filter(cache=>cache.repositioned).map(cache=>cache.id),[2]);
  for(let t=0;t<=scene.duration;t+=.2) {
    assert.deepEqual(plain(scene.frame(t).messages),[0,1,2]);
    assert.doesNotMatch(scene.draw(t),/NaN|Infinity|undefined/);
  }
});
