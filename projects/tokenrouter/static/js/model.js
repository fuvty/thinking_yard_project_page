// Pure transformations shared by the figures and their data-integrity tests.
export const algorithms = ['R2R', 'CITER', 'R-Stitch', 'Co-LLM', 'ME'];
export const implementations = ['Official Code', 'Std. Serving', 'TokenRouter'];
export function selection(rows, workload, concurrency) {
  return rows.filter(row => row.workload === workload && row.concurrency === Number(concurrency));
}
export function comparison(rows, metric) {
  const ours = rows.find(row => row.implementation === 'TokenRouter')?.[metric];
  const available = rows.filter(row => row.implementation !== 'TokenRouter')
    .map(row => row[metric]).filter(value => Number.isFinite(value) && value > 0);
  if (!available.length || !Number.isFinite(ours) || ours <= 0) return null;
  return metric === 'latency' ? Math.min(...available) / ours : ours / Math.max(...available);
}
export function axisMaximum(value) {
  if (!(value > 0)) return 1;
  const step = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / step) * step;
}
export function arcLengthPath(points) {
  const lengths = [0];
  for (let i=1; i<points.length; i++) lengths.push(lengths[i-1] + Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));
  return {points, lengths, length:lengths.at(-1)};
}
export function pointAt(path, fraction) {
  const target = Math.max(0,Math.min(1,fraction)) * path.length;
  let low=0, high=path.lengths.length-1;
  while(high-low>1) { const mid=(low+high)>>1; if(path.lengths[mid]<target) low=mid; else high=mid; }
  const t=(target-path.lengths[low])/(path.lengths[high]-path.lengths[low] || 1);
  return path.points[low].map((v,i)=>v+(path.points[high][i]-v)*t);
}
// Position easing for the explanatory figures, whose steps settle at endpoints.
export function travelEase(t) {
  return t*t*t*(10+t*(-15+6*t));
}

// The hub's cubic-bezier(.42, 0, .12, 1), used here to change velocity.
// Its integral gives distance, so successive phases keep velocity continuous.
function sweep(progress) {
  if(progress<=0)return {value:0,integral:0};
  if(progress>=1)return {value:1,integral:.638};
  let low=0,high=1,t=progress;
  for(let i=0;i<26;i++) {
    const x=1.26*t-2.16*t*t+1.9*t*t*t;
    if(x<progress)low=t;else high=t;
    t=(low+high)/2;
  }
  return {value:t*t*(3-2*t),integral:1.26*t**3-3.87*t**4+5.148*t**5-1.9*t**6};
}

export function createRoadMotion(road,compact=false) {
  const {entrance,ringStart,ringEnd,exit}=road.gates,length=road.travel.length,ringLength=ringEnd-ringStart;
  // Increase only ring cruising speed; approach, junction braking and departure keep their existing speeds.
  const approach=compact?104:205,turn=compact?27:48,cruise=(compact?142:280)*1.35,departure=compact?125:240;
  const stops=[
    [0,approach],
    [Math.max(0,entrance-(compact?65:115)),approach],
    [entrance,turn],
    [ringStart+Math.min(ringLength*.24,compact?80:150),cruise],
    [ringEnd-Math.min(ringLength*.28,compact?95:170),cruise],
    [exit,turn],
    [Math.min(length,exit+(compact?90:150)),departure],
    [length,departure]
  ];
  const segments=[];let duration=0;
  for(let i=1;i<stops.length;i++) {
    const [from,fromSpeed]=stops[i-1],[to,toSpeed]=stops[i];
    if(to<=from)continue;
    const seconds=(to-from)/(fromSpeed+(toSpeed-fromSpeed)*.638);
    segments.push({from,to,fromSpeed,toSpeed,start:duration,end:duration+seconds,seconds});
    duration+=seconds;
  }
  return {segments,duration,length};
}

export function roadMotionAt(motion,time) {
  if(time<=0)return {distance:0,speed:motion.segments[0].fromSpeed};
  if(time>=motion.duration)return {distance:motion.length,speed:motion.segments.at(-1).toSpeed};
  const segment=motion.segments.find(s=>time<=s.end),t=(time-segment.start)/segment.seconds;
  const {value,integral}=sweep(t),change=segment.toSpeed-segment.fromSpeed;
  return {distance:segment.from+segment.seconds*(segment.fromSpeed*t+change*integral),speed:segment.fromSpeed+change*value};
}

// Each port starts as one broad road. It splits into an entrance and exit
// only at the ring, where both branches meet the guide tangentially.
export function roadNetwork(width,height) {
  const compact=width<600,cx=width*.5,cy=height*.53,circulation=-1;
  const rx=width*(compact?.49:.43),ry=height*.38,roadWidth=compact?22:28;
  const laneWidth=compact?12:16,lane=compact?9:12,lead=compact?30:48,mergeRun=compact?36:64;
  function guide(a) {
    const c=Math.cos(a),s=Math.sin(a),k=compact?.045:0,C=Math.cos(3*a),S=Math.sin(3*a);
    const x=(1+k)*c-k*C,y=(1+k)*s+k*S;
    const dx=-(1+k)*s+3*k*S,dy=(1+k)*c+3*k*C;
    const ddx=-(1+k)*c+9*k*C,ddy=-(1+k)*s-9*k*S;
    return {p:[cx+rx*x,cy+ry*y],v:[rx*dx,ry*dy],a:[rx*ddx,ry*ddy]};
  }
  const loop=Array.from({length:721},(_,i)=>guide(i/720*Math.PI*2).p);
  const norm=v=>{const length=Math.hypot(...v);return v.map(x=>x/length);};
  function bezier(control,t) {
    const u=1-t,weights=[u**5,5*t*u**4,10*t*t*u**3,10*t**3*u*u,5*t**4*u,t**5];
    return [0,1].map(k=>control.reduce((sum,p,i)=>sum+p[k]*weights[i],0));
  }
  function derivative(control,t) {
    const u=1-t,weights=[u**4,4*t*u**3,6*t*t*u*u,4*t**3*u,t**4];
    return [0,1].map(k=>weights.reduce((sum,w,i)=>sum+5*(control[i+1][k]-control[i][k])*w,0));
  }
  function controls(p0,v0,a0,p1,v1,a1) {
    return [p0,p0.map((p,k)=>p+v0[k]/5),p0.map((p,k)=>p+2*v0[k]/5+a0[k]/20),p1.map((p,k)=>p-2*v1[k]/5+a1[k]/20),p1.map((p,k)=>p-v1[k]/5),p1];
  }
  // Mirror the side ports across the page center. The lower pair meets the left
  // and right edges, rather than converging beneath the hero's central buttons.
  const layout=[
    {angle:-90,mouth:[cx,0],inward:[0,1]},
    {angle:-35,mouth:[width,height*.24],inward:[-1,0]},
    {angle:0,mouth:[width,cy],inward:[-1,0]},
    {angle:45,mouth:[width,height*.87],inward:[-1,0]},
    {angle:90,mouth:[cx,height],inward:[0,-1]},
    {angle:135,mouth:[0,height*.87],inward:[1,0]},
    {angle:180,mouth:[0,cy],inward:[1,0]},
    {angle:215,mouth:[0,height*.24],inward:[1,0]}
  ];
  const ports=layout.map(({angle:degrees,mouth,inward})=>{
    const angle=degrees*Math.PI/180,junction=guide(angle),tangent=norm(junction.v);
    const outward=[tangent[1],-tangent[0]],outside=mouth.map((p,k)=>p-inward[k]*180);
    const length=Math.hypot(outside[0]-junction.p[0],outside[1]-junction.p[1]);
    const stemControl=controls(outside,inward.map(v=>v*length),[0,0],junction.p,outward.map(v=>-v*length*.65),[0,0]);
    const surface=Array.from({length:241},(_,i)=>bezier(stemControl,i/240));
    const stem=arcLengthPath(surface);
    const cutIndex=stem.lengths.findIndex(l=>l>=stem.length-lead);
    const cut=Math.min(239,cutIndex)/240,turnAngle=mergeRun/Math.hypot(...junction.v);
    function branch(direction) {
      const side=-direction;
      const at=t=>{
        const p=bezier(stemControl,t),v=norm(derivative(stemControl,t));
        return [p[0]-v[1]*lane*side,p[1]+v[0]*lane*side];
      };
      const join=angle+direction*turnAngle,end=guide(join),start=at(cut),epsilon=.0001;
      const before=at(cut-epsilon),after=at(cut+epsilon);
      const velocity=start.map((_,k)=>(after[k]-before[k])/(2*epsilon));
      const acceleration=start.map((p,k)=>(after[k]-2*p+before[k])/(epsilon*epsilon));
      const speed=Math.hypot(lead,mergeRun-lane)*1.2,entryRate=speed/Math.hypot(...velocity),exitRate=speed/Math.hypot(...end.v);
      const control=controls(start,velocity.map(v=>v*entryRate),acceleration.map(a=>a*entryRate*entryRate),end.p,end.v.map(v=>v*exitRate*direction),end.a.map(a=>a*exitRate*exitRate));
      const prefix=Array.from({length:241},(_,i)=>at(cut*i/240));
      const bend=Array.from({length:81},(_,i)=>bezier(control,i/80));
      return {join,direction,control,forkIndex:prefix.length-1,points:[...prefix,...bend.slice(1)]};
    }
    const trunk=Array.from({length:241},(_,i)=>bezier(stemControl,cut*i/240));
    return {angle,mouth,surface,trunk,incoming:branch(circulation),outgoing:branch(-circulation)};
  });
  const roads=ports.flatMap((port,origin)=>ports.flatMap((exit,destination)=>{
    if(origin===destination)return [];
    let end=exit.outgoing.join;
    while((end-port.incoming.join)*circulation<0)end+=circulation*Math.PI*2;
    const continuation=Array.from({length:401},(_,i)=>guide(port.incoming.join+i/400*(end-port.incoming.join)).p);
    const departure=[...exit.outgoing.points].reverse();
    const ringStart=port.incoming.points.length-1,ringEnd=ringStart+continuation.length-1;
    const travel=arcLengthPath([...port.incoming.points,...continuation.slice(1),...departure.slice(1)]);
    const approachEnd=travel.lengths[port.incoming.forkIndex];
    const departureStart=travel.lengths[ringEnd+exit.outgoing.points.length-1-exit.outgoing.forkIndex];
    const gates={
      entrance:approachEnd+(travel.lengths[ringStart]-approachEnd)*.28,
      ringStart:travel.lengths[ringStart],ringEnd:travel.lengths[ringEnd],
      exit:travel.lengths[ringEnd]+(departureStart-travel.lengths[ringEnd])*.65
    };
    return [{entry:port.incoming.points[0],exit:departure.at(-1),origin,destination,ringStart,ringEnd,travel,gates}];
  }));
  return {roads,ports,loop,center:[cx,cy],guide,circulation,roadWidth,laneWidth,trunkWidth:lane*2+laneWidth};
}

// The illustration derives all runtime states from the source schedule.
export function scheduleFrame(schedule,time) {
  const tasks=schedule.history.flatMap(batch=>batch.tasks.map(task=>({...task,start:batch.start,end:batch.end})));
  const ready=(task)=>task.tok===0?0:tasks.find(t=>t.req===task.req&&t.tok===task.tok-1).end;
  const active=tasks.filter(t=>t.start<=time&&t.end>time);
  const waiting=tasks.filter(t=>ready(t)<=time&&t.start>time);
  const completed=tasks.filter(t=>t.end<=time);
  return {active,waiting,completed,finished:schedule.completion.filter(t=>t<=time).length};
}
