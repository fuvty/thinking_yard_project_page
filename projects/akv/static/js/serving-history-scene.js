// Schematic, synchronized histories. A drop changes active KV, not logical
// messages or the tree's historical path. It does not imply physical eviction.
globalThis.AKVHistoryScene = (() => {
  const duration = 28;
  const stages = [
    { start:0, end:7.6, still:6.9, label:'C, then drop A' },
    { start:7.6, end:15, still:14.3, label:'Drop A, then C' },
    { start:15, end:20.5, still:19.7, label:'Start from B' },
    { start:20.5, end:28, still:23, label:'Compare states' }
  ];
  const colors = { A:['#fff0dc','#d7a65e'], B:['#e5eedc','#91ac72'], C:['#e3edfa','#81a4ce'] };
  const ink = '#34313b', muted = '#8a8393', accent = '#8570b6';
  // IDs denote identical computed states, not just identical token labels.
  const histories = [
    { title:'C, then drop A', start:0, drop:5.2, tokens:[
      { token:'A', at:.9, state:'a', attends:[] }, { token:'B', at:2.3, state:'b-with-a', attends:['A'] }, { token:'C', at:3.7, state:'c-with-ab', attends:['A','B'] }
    ] },
    { title:'Drop A, then C', start:7.6, drop:10.9, tokens:[
      { token:'A', at:8.2, state:'a', attends:[], reused:true }, { token:'B', at:9.5, state:'b-with-a', attends:[], reused:true }, { token:'C', at:12.3, state:'c-with-b-a', attends:['B'] }
    ] },
    { title:'Start from B', start:15, drop:null, tokens:[
      { token:'B', at:15.7, state:'b-alone', attends:[] }, { token:'C', at:17.2, state:'c-with-b', attends:['B'] }
    ] }
  ];
  const nodes = [
    { id:'root', label:'Root', x:208, y:28, at:-2 },
    { id:'a', parent:'root', label:'A', x:138, y:124, at:.9 },
    { id:'b-with-a', parent:'a', label:'B', x:138, y:220, at:2.3 },
    { id:'c-with-ab', parent:'b-with-a', label:'C', x:66, y:316, at:3.7 },
    { id:'drop-after-c', parent:'c-with-ab', label:'ΔA', x:66, y:412, at:5.2, path:1 },
    { id:'drop-before-c', parent:'b-with-a', label:'ΔA', x:216, y:316, at:10.9 },
    { id:'c-with-b-a', parent:'drop-before-c', label:'C', x:216, y:412, at:12.3, path:2 },
    { id:'b-alone', parent:'root', label:'B', x:343, y:124, at:15.7 },
    { id:'c-with-b', parent:'b-alone', label:'C', x:343, y:220, at:17.2, path:3 }
  ];
  const clamp = n => Math.max(0,Math.min(1,n));
  const ease = n => { const t=clamp(n); return t*t*(3-2*t); };
  const progress = (time,start,length=.65) => ease((time-start)/length);
  const f = n => Number(n.toFixed(3));
  const rect = (x,y,w,h,fill,stroke='none',radius=7,extra='') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${stroke}" ${extra}/>`;
  const text = (x,y,value,size=14,fill=ink,extra='') => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" ${extra}>${value}</text>`;
  const tokenX = { A:134, B:230, C:326 };
  const computing = (time,token) => time>=token.at+.05 && time<token.at+1.35;
  const attending = (time,token) => !token.reused && time>=token.at+.35 && time<token.at+1.02;
  const readyAt = token => token.at+(token.reused?.4:1.3);
  const nodeAppearsAt = node => node.at+(node.label==='ΔA'?.4:1.05);
  function frame(time) {
    const t=Math.max(0,Math.min(duration,time));
    return {
      time:t, stage:stages.findLastIndex(stage => t>=stage.start),
      rows:histories.map(history => ({
        ...history,
        messages:history.tokens.filter(token => t>=token.at).map(token => token.token),
        attention:history.tokens.filter(token => attending(t,token)).flatMap(token => token.attends.map(target => ({ from:token.token,to:target }))),
        caches:history.tokens.filter(token => t>=token.at+.15).map(token => ({
          ...token, ready:t>=readyAt(token),
          active:t>=readyAt(token) && (token.token!=='A' || history.drop===null || t<history.drop+.8)
        }))
      })),
      nodes:nodes.filter(node => t>=nodeAppearsAt(node))
    };
  }
  // These insets schematically show historical information, not literal
  // partitions of KV tensors. Tree nodes intentionally do not use these insets.
  function insets(state,x,y) {
    const a='#e4ad55', b='#91ac72';
    if(state==='b-with-a') return rect(x,y+6,22,14,a,'none',3);
    if(state==='c-with-ab') return rect(x,y,22,7,a,'none',2)+rect(x,y+10,22,17,b,'none',3)+rect(x+4,y+19,14,5,a,'none',1.5);
    if(state==='c-with-b-a') return rect(x,y+6,22,21,b,'none',3)+rect(x+4,y+19,14,5,a,'none',1.5);
    if(state==='c-with-b') return rect(x,y+6,22,21,b,'none',3);
    return '';
  }
  function tile(token,state,x,y,{ opacity=1,dropped=0,fillProgress=1,infoProgress=1 }={}) {
    const [fill,stroke]=colors[token];
    const w=70, h=39, information=insets(state,x+39,y+6);
    let svg=`<g data-state="${state}" data-fill="${f(fillProgress)}" opacity="${f(opacity)}">`;
    svg+=rect(x,y,w,h,'#fff');
    svg+=`<g opacity="${f(1-dropped)}">`;
    svg+=rect(x,y,w,h,fill,'none',7,`opacity="${f(fillProgress)}"`);
    if(fillProgress<1) svg+=rect(x,y,w,h,'none',accent,7,`stroke-dasharray="4 4" stroke-width="1.2" opacity="${f(1-fillProgress)}"`);
    if(fillProgress>0) svg+=rect(x,y,w,h,'none',stroke,7,`opacity="${f(fillProgress)}"`);
    svg+=text(x+(information?17:w/2),y+25,token,17,fillProgress>.5?ink:'#8a8393','font-weight="600" text-anchor="middle"');
    if(information&&infoProgress>0) svg+=`<g data-inherited="${state}" opacity="${f(infoProgress)}">${information}</g>`;
    svg+='</g>';
    if(dropped>0) svg+=`<g opacity="${f(dropped*.6)}">${rect(x,y,w,h,'none','#bbb5c4',7,'stroke-dasharray="3 4"')}${text(x+w/2,y+h/2+4,'—',13,'#a6a0af','text-anchor="middle"')}</g>`;
    return svg+'</g>';
  }
  function trajectories(time) {
    const data=frame(time), parts=[];
    histories.forEach((history,index) => {
      const y=index*150, active=data.stage===index;
      parts.push(`<g data-history="${index+1}">`);
      if(active) parts.push(rect(4,y+2,432,144,'#f8f6fb','none',12));
      if(index<2) parts.push(`<line x1="18" y1="${y+148}" x2="422" y2="${y+148}" stroke="#eeeaf3"/>`);
      const started=progress(time,history.start,.45);
      parts.push(`<g opacity="${f(.35+.65*started)}">`);
      parts.push(`<circle cx="26" cy="${y+22}" r="10" fill="${active?'#8672b4':'#eee9f4'}"/>`);
      parts.push(text(26,y+26,index+1,11,active?'white':'#86789d','text-anchor="middle" font-weight="600"'));
      parts.push(text(44,y+27,history.title,14,active?'#655282':'#716a7a','font-weight="550"'));
      parts.push(text(18,y+63,'Messages',12,muted),text(18,y+127,'Active KV',12,muted));
      parts.push('</g>');
      for(const token of history.tokens) {
        const x=tokenX[token.token];
        const appear=progress(time,token.at,.4);
        if(!appear) continue;
        const [fill,stroke]=colors[token.token];
        parts.push(`<g data-message="${token.token}" opacity="${f(appear)}" transform="translate(0 ${f((1-appear)*5)})">${rect(x,y+43,70,27,fill,stroke)}${text(x+35,y+62,token.token,15,ink,'text-anchor="middle" font-weight="550"')}</g>`);
        const cacheAppear=progress(time,token.at+.15,.25);
        const fillProgress=token.reused?1:progress(time,token.at+.9,.4);
        const infoProgress=token.reused?1:progress(time,token.at+1.04,.26);
        const dropped=token.token==='A' && history.drop!==null?progress(time,history.drop,.8):0;
        parts.push(tile(token.token,token.state,x,y+103,{opacity:cacheAppear,dropped,fillProgress,infoProgress}));
      }
      for(const token of history.tokens) {
        if(!computing(time,token)) continue;
        const opacity=progress(time,token.at+.05,.18)*(1-progress(time,token.at+1.12,.23));
        const sx=tokenX[token.token]+35;
        parts.push(`<g data-computing="${token.token}" opacity="${f(opacity)}">`);
        parts.push(text(420,y+27,token.reused?'Reuse':`Compute ${token.token}`,11,accent,'text-anchor="end" font-weight="500"'));
        if(attending(time,token)) for(const target of token.attends) {
          const tx=tokenX[target]+35;
          const arch=y+(token.attends.length>1&&target==='B'?82:73);
          const arrowOpacity=progress(time,token.at+.35,.13)*(1-progress(time,token.at+.89,.13));
          // Pending KV is a visual proxy for the message being computed.
          // Curved arrows link its empty slot to the earlier KV visible to it;
          // KV entries themselves are not queries. Arrow weights are schematic.
          parts.push(`<g data-attention="${token.token}-${target}" data-source="pending-kv" opacity="${f(arrowOpacity)}"><path d="M ${sx} ${y+101} C ${sx} ${arch}, ${tx} ${arch}, ${tx} ${y+101}" fill="none" stroke="${accent}" stroke-width="1.8" stroke-linecap="round"/><circle cx="${sx}" cy="${y+102}" r="2" fill="${accent}"/><path d="M ${tx-3} ${y+96} L ${tx} ${y+101} L ${tx+3} ${y+96}" fill="none" stroke="${accent}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>${rect(tokenX[target]-2,y+101,74,43,'none',accent,9,'stroke-width="1.2" opacity=".65"')}</g>`);
        }
        parts.push('</g>');
      }
      parts.push('</g>');
    });
    return parts.join('');
  }
  function curve(parent,node) {
    const x1=parent.x, y1=parent.y+(parent.id==='root'?15:22), x2=node.x, y2=node.y-22;
    const mid=(y1+y2)/2;
    return { d:`M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`,
      point:p=>({ x:(1-p)**3*x1+3*(1-p)**2*p*x1+3*(1-p)*p*p*x2+p**3*x2,
        y:(1-p)**3*y1+3*(1-p)**2*p*mid+3*(1-p)*p*p*mid+p**3*y2 }) };
  }
  function tree(time) {
    const parts=[];
    for(const node of nodes) {
      if(!node.parent) continue;
      const parent=nodes.find(item=>item.id===node.parent), line=curve(parent,node);
      const edgeStart=node.at+(node.label==='ΔA'?0:.65);
      const edgeDuration=node.label==='ΔA'?.85:.65;
      const grown=progress(time,edgeStart,edgeDuration);
      if(grown===0) continue;
      parts.push(`<path data-edge="${node.parent}/${node.id}" d="${line.d}" fill="none" stroke="#d7cedf" stroke-width="1.7" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${f(1-grown)}"/>`);
      // A later request traverses existing A and B instead of duplicating them.
      const reuseAt=node.id==='a'?8.2:node.id==='b-with-a'?9.5:null;
      const replaying=reuseAt!==null&&time>=reuseAt;
      const start=replaying?reuseAt:edgeStart, length=replaying?.85:edgeDuration;
      const p=progress(time,start,length);
      if(time>=start&&time<start+length+.4) {
        const fade=1-progress(time,start+length,.4), point=line.point(p);
        parts.push(`<path d="${line.d}" fill="none" stroke="${accent}" stroke-width="2.2" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${f(1-p)}" opacity="${f(fade)}"/>`);
        parts.push(`<circle cx="${f(point.x)}" cy="${f(point.y)}" r="5.5" fill="#e9e0f4" opacity="${f(fade)}"/><circle cx="${f(point.x)}" cy="${f(point.y)}" r="2.5" fill="${accent}" opacity="${f(fade)}"/>`);
      }
    }
    for(const node of nodes) {
      const appear=node.id==='root'?1:progress(time,nodeAppearsAt(node),node.label==='ΔA'?.45:.25);
      if(!appear) continue;
      const reuseAt=node.id==='a'?8.2:node.id==='b-with-a'?9.5:null;
      const highlight=reuseAt===null?0:progress(time,reuseAt+.4,.25)*(1-progress(time,reuseAt+1,.45));
      parts.push(`<g data-node="${node.id}" opacity="${f(appear)}" transform="translate(0 ${f((1-appear)*4)})">`);
      if(node.id==='root') {
        parts.push(rect(node.x-29,node.y-15,58,30,'#f5f2f8','#dcd5e5',15),text(node.x,node.y+5,'Root',13,'#756783','text-anchor="middle" font-weight="550"'));
      } else if(node.label==='ΔA') {
        parts.push(`<circle data-drop-marker cx="${node.x}" cy="${node.y}" r="22" fill="#fff" stroke="#bd9255" stroke-width="1.4" stroke-dasharray="4 4"/>`,text(node.x,node.y+5,'ΔA',14,'#97713e','text-anchor="middle" font-weight="550"'));
      } else {
        const [fill,stroke]=colors[node.label];
        parts.push(rect(node.x-29,node.y-22,58,44,fill,stroke),text(node.x,node.y+6,node.label,17,ink,'font-weight="600" text-anchor="middle"'));
        if(highlight>0) parts.push(rect(node.x-32,node.y-25,64,50,'none',accent,10,`opacity="${f(highlight)}" stroke-width="1.5"`));
      }
      if(node.path) {
        parts.push(`<circle cx="${node.x+39}" cy="${node.y+15}" r="9" fill="#eee9f4"/>`,text(node.x+39,node.y+19,node.path,10,'#86789d','text-anchor="middle" font-weight="600"'));
      }
      parts.push('</g>');
    }
    return parts.join('');
  }
  return { duration,stages,frame,trajectories,tree };
})();
