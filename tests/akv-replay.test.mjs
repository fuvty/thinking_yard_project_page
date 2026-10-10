import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const sandbox = {window:{}};
vm.runInNewContext(await readFile(new URL('../projects/akv/static/js/replay-data.js',import.meta.url),'utf8'),sandbox);
const data = sandbox.window.AKV_REPLAY;
vm.runInNewContext(await readFile(new URL('../projects/akv/static/js/replay-math.js',import.meta.url),'utf8'),sandbox);
const { valueAt, aggregateRuns, stepCoordinates } = sandbox.window.AKVMath;
const plain = value => JSON.parse(JSON.stringify(value));

test('replay uses observed completions with no future interpolation',()=>{
  const points = [[0,0,0],[2,1,1],[4,1,2],[6,2,3]];
  assert.equal(valueAt(points,1.999),0);
  assert.equal(valueAt(points,2),1);
  assert.equal(valueAt(points,5),1);
  assert.equal(valueAt(points,100),2);
  assert.equal(valueAt(points,4,2),2);
  assert.deepEqual(plain(stepCoordinates(points,x=>x,y=>y)),[[0,0],[2,0],[2,1],[4,1],[4,1],[6,1],[6,2]]);
});

test('mean includes every run and keeps finished runs at their final value',()=>{
  const runs = [{points:[[0,0],[1,3]]},{points:[[0,0],[2,6]]},{points:[[0,0],[3,9]]}];
  assert.deepEqual(plain(aggregateRuns(runs)),[[0,0,0,0],[1,1,0,3],[2,3,0,6],[3,6,3,9]]);
});

test('Figure 9(a) data retains nine complete runs, units and known final scores',()=>{
  const finals = [[40,41,41],[35,28,34],[41,52,48]];
  const means = [122/3,97/3,47];
  assert.equal(data.gpuCount,8);
  assert.equal(data.expectedCases,100);
  assert.equal(data.series.length,3);
  data.series.forEach((series,i)=>{
    assert.equal(series.runs.length,3);
    series.runs.forEach((run,j)=>{
      assert.equal(run.points.length,102);
      assert.equal(run.points.at(-1)[1],finals[i][j]);
      assert.equal(run.points.at(-1)[2],100);
      run.points.forEach((point,k)=>{
        assert(point[1]<=point[2]&&point[2]<=100);
        if(k) assert(point[0]>=run.points[k-1][0]);
      });
    });
    assert(Math.abs(aggregateRuns(series.runs).at(-1)[1]-means[i])<1e-10);
  });
  // Standard run 1 ends at the supplied adjusted seconds × 8 GPUs / 3600.
  assert(Math.abs(data.series[0].runs[0].points.at(-1)[0]-9705.226718222279*8/3600)<1e-10);
});

test('public plotting CSV omits internal filesystem and execution metadata',async()=>{
  const csv = await readFile(new URL('../projects/akv/static/data/figure-9a.csv',import.meta.url),'utf8');
  assert(!csv.includes('/mnt/'));
  assert(!csv.includes('execution_id'));
  assert.equal(csv.trim().split('\n').length,919);
});
