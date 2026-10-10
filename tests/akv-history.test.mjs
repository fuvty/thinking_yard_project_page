import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({});
vm.runInContext(readFileSync(new URL('../projects/akv/static/js/serving-history-scene.js',import.meta.url),'utf8'),context);
const scene=context.AKVHistoryScene;
const plain=value=>JSON.parse(JSON.stringify(value));

test('three retained B/C histories share only computation-compatible states',()=>{
  const {rows,nodes}=plain(scene.frame(23));
  const active=rows.map(row=>row.caches.filter(cache=>cache.active));
  assert.deepEqual(active.map(caches=>caches.map(cache=>cache.token)),[['B','C'],['B','C'],['B','C']]);
  assert.equal(active[0][0].state,active[1][0].state);
  assert.notEqual(active[0][0].state,active[2][0].state);
  assert.equal(new Set(active.map(caches=>caches[1].state)).size,3);
  for(const caches of active) for(const cache of caches) assert.equal(nodes.filter(node=>node.id===cache.state).length,1);
});

test('drop timing changes the path without deleting messages or historical nodes',()=>{
  const first=plain(scene.frame(6.9));
  assert.deepEqual(first.rows[0].messages,['A','B','C']);
  assert.equal(first.rows[0].caches.find(cache=>cache.token==='A').active,false);
  assert.ok(first.nodes.some(node=>node.id==='a'));
  assert.equal(first.nodes.find(node=>node.id==='drop-after-c').parent,'c-with-ab');
  const second=plain(scene.frame(12));
  assert.deepEqual(second.rows[1].messages,['A','B']);
  assert.equal(second.rows[1].caches.find(cache=>cache.token==='A').active,false);
  assert.ok(second.nodes.some(node=>node.id==='drop-before-c'));
  assert.ok(!second.nodes.some(node=>node.id==='c-with-b-a'));
  const final=plain(scene.frame(23));
  assert.equal(final.nodes.find(node=>node.id==='drop-before-c').parent,'b-with-a');
  assert.equal(final.nodes.find(node=>node.id==='c-with-b-a').parent,'drop-before-c');
  assert.equal(final.nodes.find(node=>node.id==='b-alone').parent,'root');
});

test('tree starts at root and remains connected throughout growth',()=>{
  assert.deepEqual(plain(scene.frame(0).nodes).map(node=>node.id),['root']);
  for(let t=0;t<=28;t+=.2) {
    const {nodes}=plain(scene.frame(t));
    for(const node of nodes) if(node.parent) assert.ok(nodes.some(parent=>parent.id===node.parent));
    assert.doesNotMatch(scene.tree(t)+scene.trajectories(t),/NaN|Infinity|undefined/);
  }
});

test('attention arrows show only KV visible during the original computation',()=>{
  assert.deepEqual(plain(scene.frame(2.9).rows[0].attention),[{from:'B',to:'A'}]);
  assert.deepEqual(plain(scene.frame(4.3).rows[0].attention),[{from:'C',to:'A'},{from:'C',to:'B'}]);
  assert.deepEqual(plain(scene.frame(12.9).rows[1].attention),[{from:'C',to:'B'}]);
  assert.deepEqual(plain(scene.frame(17.8).rows[2].attention),[{from:'C',to:'B'}]);
  // Matching an existing prefix reuses its states; it does not recompute B.
  assert.deepEqual(plain(scene.frame(10).rows[1].attention),[]);
  for(let t=0;t<=28;t+=.1) for(const row of plain(scene.frame(t).rows)) {
    for(const arrow of row.attention) {
      assert.ok(row.caches.some(cache=>cache.token===arrow.to&&cache.active));
      assert.notEqual(arrow.from,arrow.to);
    }
  }
});
