import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {algorithms, implementations, selection, comparison, arcLengthPath, pointAt, travelEase, roadNetwork, createRoadMotion, roadMotionAt, scheduleFrame} from '../projects/tokenrouter/static/js/model.js';
const base=new URL('../projects/tokenrouter/static/data/',import.meta.url);
const data=JSON.parse(await readFile(new URL('measurements.json',base),'utf8'));
function csv(text) {
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++) {
  const c=text[i];
  if(c==='"') { if(quoted&&text[i+1]==='"'){cell+='"';i++;} else quoted=!quoted; }
  else if(c===','&&!quoted){row.push(cell);cell='';}
  else if(c==='\n'&&!quoted){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell='';}
  else cell+=c;
 }
 if(cell||row.length){row.push(cell);rows.push(row);}
 return rows;
}
const numeric=value=>value==='-'||value===''?null:Number(value.replaceAll(',',''));
test('TokenRouter figures preserve every in-scope CSV value and unavailable measurement',async()=>{
 const rows=csv(await readFile(new URL('TokenRouter.csv',base),'utf8')).slice(1);
 let concurrency,workload,algorithm;const expected=[];
 for(const row of rows){
  concurrency=row[0]||concurrency;workload=row[1]||workload;algorithm=row[2]||algorithm;
  if(workload==='agentic_single')continue;
  expected.push({concurrency:Number(concurrency),workload,algorithm,implementation:row[3],latency:numeric(row[4]),throughput:numeric(row[5])});
 }
 assert.deepEqual(data.results,expected);
 for(const workload of ['low-effort reasoning','high-effort reasoning','agentic'])for(const n of [1,4]){
  const selected=selection(data.results,workload,n);assert.equal(selected.length,15);
  for(const algorithm of algorithms)for(const implementation of implementations)assert.equal(selected.filter(r=>r.algorithm===algorithm&&r.implementation===implementation).length,1);
 }
 const citer=selection(data.results,'high-effort reasoning',4).filter(r=>r.algorithm==='CITER');
 assert.equal(comparison(citer,'throughput'),288.67/4.49);
 assert.equal(comparison([{implementation:'TokenRouter',latency:2},{implementation:'Official Code',latency:5},{implementation:'Std. Serving',latency:10}],'latency'),2.5);
 assert.equal(comparison([{implementation:'TokenRouter',latency:2},{implementation:'Official Code',latency:null}],'latency'),null);
});
test('Concurrency curves retain measurements in concurrency order, including nonmonotonic speed',async()=>{
 const rows=csv(await readFile(new URL('tradeoff.csv',base),'utf8')).slice(1);let implementation;
 const expected=rows.map(row=>{implementation=row[0]||implementation;return {implementation,concurrency:Number(row[1]),speed:Number(row[2]),throughput:Number(row[3])};});
 assert.deepEqual(data.tradeoff,expected);
 for(const name of ['TokenRouter','R2R official'])assert.deepEqual(data.tradeoff.filter(r=>r.implementation===name).map(r=>r.concurrency),Array.from({length:16},(_,i)=>i+1));
});
test('Each scheduling illustration completes the same tokens in causal order without model overlap',()=>{
 const workload=[['SLM','SLM','SLM','SLM','SLM'],['SLM','LLM','SLM','LLM','SLM'],['SLM','SLM','LLM','SLM','LLM']];
 for(const [name,schedule] of Object.entries(data.schedules)){
  for(let req=0;req<3;req++){
   const tasks=schedule.history.flatMap(batch=>batch.tasks.filter(t=>t.req===req).map(t=>({...t,start:batch.start,end:batch.end}))).sort((a,b)=>a.tok-b.tok);
   assert.deepEqual(tasks.map(t=>t.model),workload[req],name);
   assert.deepEqual(tasks.map(t=>t.tok),[0,1,2,3,4],name);
   tasks.forEach((t,i)=>{assert(t.start>=(tasks[i-1]?.end||0),name);assert.equal(t.end-t.start,t.model==='SLM'?1:3.5);});
   assert.equal(schedule.completion[req],tasks.at(-1).end);
  }
  for(const model of ['SLM','LLM']){
   const batches=schedule.history.filter(b=>b.model===model).sort((a,b)=>a.start-b.start);
   batches.forEach((b,i)=>assert(b.start>=(batches[i-1]?.end||0),name));
  }
 }
});
test('Road travel uses distance along the path and smoothly stops at both endpoints',()=>{
 const path=arcLengthPath([[0,0],[3,0],[3,4]]);
 assert.deepEqual(pointAt(path,0),[0,0]);assert.deepEqual(pointAt(path,1),[3,4]);
 assert.deepEqual(pointAt(path,.5),[3,.5]);
 let last=-1;for(let i=0;i<=100;i++){const v=travelEase(i/100);assert(v>=last);last=v;}
 assert.equal(travelEase(0),0);assert.equal(travelEase(1),1);
 assert(travelEase(.001)/.001<.0001);assert((1-travelEase(.999))/.001<.0001);
});
test('Every hero token enters and exits through distinct visible ports, with smooth joins',()=>{
 const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
 const alignment=(a,b)=>(a[0]*b[0]+a[1]*b[1])/Math.hypot(...a)/Math.hypot(...b);
 for(const [w,h] of [[320,780],[390,844],[768,1024],[1440,900],[1920,1080]]) {
  const network=roadNetwork(w,h),inside=([x,y])=>x>=0&&x<=w&&y>=0&&y<=h;
  assert.equal(network.ports.length,8);
  const edgeEntries=network.ports.map(port=>port.surface.find(inside));
  edgeEntries.forEach((p,i)=>edgeEntries.slice(i+1).forEach(q=>assert(distance(p,q)>60,'Eight separated entrances remain visible')));
  assert.equal(network.roads.length,56);
  for(let i=0;i<8;i++) {
   assert.equal(network.roads.filter(r=>r.origin===i).length,7,'Every port can enter and reach all seven others');
   assert.equal(network.roads.filter(r=>r.destination===i).length,7,'Every port can exit from all seven others');
  }
  for(const [left,right] of [[7,1],[6,2],[5,3]])for(const [from,to] of [['incoming','outgoing'],['outgoing','incoming']]) {
   network.ports[left][from].points.forEach((p,i)=>{
    const q=network.ports[right][to].points[i];
    assert(distance([w-p[0],p[1]],q)<1e-6,'Visible entry and exit lanes are mirrored about the page center');
   });
  }
  assert(edgeEntries[5][0]<w*.02&&edgeEntries[3][0]>w*.98,'Lower roads enter from the left and right edges');
  network.ports.forEach(port=>{
   assert.equal(port.incoming.direction,-1);assert.equal(port.outgoing.direction,1);
   assert(distance(port.incoming.points[0],port.outgoing.points[0])>network.laneWidth,'Opposing traffic has room inside the common road');
   for(const branch of [port.incoming,port.outgoing]) {
    const c=branch.control,guide=network.guide(branch.join);
    const v=c[5].map((p,k)=>5*(p-c[4][k]));
    const a=c[5].map((p,k)=>20*(p-2*c[4][k]+c[3][k]));
    const rate=Math.hypot(...v)/Math.hypot(...guide.v);
    assert(distance(c[5],guide.p)<1e-8);
    assert(alignment(v,guide.v.map(x=>branch.direction*x))>.999999,'Tangent matches at the merge');
    assert(distance(a,guide.a.map(x=>x*rate*rate))<1e-8,'Curvature matches at the merge');
    for(let i=1;i<branch.points.length-1;i++) {
     const [p,q,r]=branch.points.slice(i-1,i+2),u=q.map((v,k)=>v-p[k]),v=r.map((x,k)=>x-q[k]);
     const turn=Math.abs(Math.atan2(u[0]*v[1]-u[1]*v[0],u[0]*v[0]+u[1]*v[1]));
     const radius=(Math.hypot(...u)+Math.hypot(...v))/2/turn;
     assert(radius>network.laneWidth,'Entry and exit bends stay broad enough for a smooth turn');
    }
   }
  });
  network.roads.forEach(road=>{
   assert(!inside(pointAt(road.travel,0)));assert(!inside(pointAt(road.travel,1)));
   assert(!inside(pointAt(road.travel,1-64/road.travel.length)),'Even the longest 64px trail is out of view before recycling');
   assert.notEqual(road.origin,road.destination);
   assert(distance(road.entry,road.exit)>60,'Different ports stay separated');
   assert.deepEqual(pointAt(road.travel,1),road.exit);
   const {points}=road.travel;
   // Check the actual sampled positions, not just the declared route direction.
   // In canvas coordinates a negative cross product is counterclockwise.
   for(let i=road.ringStart+1;i<=road.ringEnd;i++) {
    const a=points[i-1].map((v,k)=>v-network.center[k]);
    const b=points[i].map((v,k)=>v-network.center[k]);
    assert(a[0]*b[1]-a[1]*b[0]<0,'Every step around the guide must circulate counterclockwise');
   }
   let crossings=0,wasInside=false;
   for(const p of points){const now=inside(p);if(now!==wasInside)crossings++;wasInside=now;}
   assert.equal(crossings,2,'Exactly one entrance and one exit, without vanishing at an intermediate boundary');
   for(let i=1;i<points.length;i++)assert(distance(points[i],points[i-1])<Math.max(w,h)*.025,'No discontinuity between path segments');
  });
 }
});
test('Requests brake at both junctions and accelerate between them with continuous velocity',()=>{
 for(const [w,h] of [[390,844],[1440,900]])for(const road of roadNetwork(w,h).roads) {
  const motion=createRoadMotion(road,w<600),at=t=>roadMotionAt(motion,t);
  const entrance=motion.segments.find(s=>s.to===road.gates.entrance);
  const exit=motion.segments.find(s=>s.to===road.gates.exit);
  const entrySpeed=at(entrance.end).speed,exitSpeed=at(exit.end).speed;
  assert.equal(at(0).speed,w<600?104:205,'Preserve approach speed');
  assert.equal(entrySpeed,w<600?27:48,'Preserve entry braking speed');
  assert.equal(exitSpeed,w<600?27:48,'Preserve exit braking speed');
  assert.equal(at(motion.duration).speed,w<600?125:240,'Preserve departure speed');
  const cruise=motion.segments.find(s=>s.fromSpeed===s.toSpeed&&s.from>road.gates.ringStart&&s.to<road.gates.ringEnd);
  assert(cruise,'Each route has a cruising phase entirely on the ring');
  assert.equal(at((cruise.start+cruise.end)/2).speed,(w<600?142:280)*1.35);
  assert(at(0).speed>entrySpeed*3,'Approach is visibly faster than entering the junction');
  assert(at(entrance.end-.3).speed>entrySpeed);
  assert(at(entrance.end+.3).speed>entrySpeed,'Accelerate into the ring');
  assert(at((entrance.end+exit.start)/2).speed>entrySpeed*4,'The ring has a pronounced forward sweep');
  assert(at(exit.end-.3).speed>exitSpeed);
  assert(at(exit.end+.3).speed>exitSpeed,'Accelerate again when leaving the ring');
  assert(at(motion.duration).speed>exitSpeed*3);
  for(const phase of motion.segments.slice(0,-1)) {
   assert(Math.abs(at(phase.end-.0001).speed-at(phase.end+.0001).speed)<.01,'No speed jump between phases');
   assert(Math.abs(at(phase.end).distance-phase.to)<1e-6,'Each slowdown is aligned to its road location');
  }
  let previous=-1;
  for(let i=0;i<=200;i++) {
   const time=motion.duration*i/200,state=at(time);
   assert(state.distance>previous);assert(state.speed>0);previous=state.distance;
   if(i>0&&i<200) {
    const measured=(at(time+.001).distance-at(time-.001).distance)/.002;
    assert(Math.abs(measured-state.speed)<.05,'Distance follows the integrated velocity rather than restarting an easing curve');
   }
  }
  assert.equal(at(motion.duration).distance,road.travel.length);
 }
});
test('Scheduling playback shows the measured-example wait and coalesced batch faithfully',()=>{
 const large=frame=>frame.active.filter(t=>t.model==='LLM').map(t=>t.req).sort();
 assert.deepEqual(large(scheduleFrame(data.schedules.eager,1.5)),[1]);
 const delayed=scheduleFrame(data.schedules.delayed,1.5);
 assert.deepEqual(large(delayed),[]);
 assert.deepEqual(delayed.waiting.filter(t=>t.model==='LLM').map(t=>t.req),[1]);
 assert.deepEqual(large(scheduleFrame(data.schedules.delayed,2.5)),[1,2]);
 assert.deepEqual(large(scheduleFrame(data.schedules.eager,2.5)),[1]);
 assert(scheduleFrame(data.schedules.eager,2.5).waiting.some(t=>t.req===2&&t.model==='LLM'));
 for(const schedule of Object.values(data.schedules)) {
  const final=scheduleFrame(schedule,Math.max(...schedule.completion));
  assert.equal(final.finished,3);assert.equal(final.completed.length,15);
  assert.equal(final.active.length,0);assert.equal(final.waiting.length,0);
 }
});
