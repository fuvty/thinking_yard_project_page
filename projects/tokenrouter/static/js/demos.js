import {createPlayback} from './playback.js';
import {travelEase} from './model.js';
const $=id=>document.getElementById(id);

export function initGranularity() {
  const patterns=[[0,0,0,1,0,0,1,1,0,0,0,1],[0,1,0,0,0,1,0,0,1,0,0,0],[1,0,0,0,1,0,0,0,1,1,0,0]];
  const captions={session:'Keep one model for the entire conversation.',query:'Choose a model for each query; every token in that response uses it.',token:'Switch models within a response, at the granularity of a token or a span.'};
  let mode='token',tokens=[],rows=[],previous=-1;
  const controls=$('granularity-demo').querySelector('.tr-playback');
  function build() {
    $('routing-example').innerHTML=patterns.map((row,r)=>`<div class="tr-token-row"><span>Turn ${r+1}</span><div class="tr-tokens">${row.map((v,i)=>{
      const large=mode==='session'?false:mode==='query'?r===1:!!v;
      return `<span class="tr-token ${large?'is-large':''}" title="Turn ${r+1}, token ${i+1}: ${large?'large':'small'} model">${i+1}</span>`;
    }).join('')}</div></div>`).join('');
    tokens=[...$('routing-example').querySelectorAll('.tr-token')];
    rows=[...$('routing-example').querySelectorAll('.tr-token-row')];previous=-1;
    $('granularity-caption').textContent=captions[mode];
    $('routing-example').setAttribute('aria-label',`${mode}-level routing. ${captions[mode]}`);
  }
  function render(progress) {
    const total=mode==='token'?36:mode==='query'?3:1;
    const count=mode==='session'?1:Math.min(total,Math.floor(progress*total));
    if(count===previous)return;previous=count;
    tokens.forEach((token,index)=>{
      const unit=mode==='query'?Math.floor(index/12):index;
      token.classList.toggle('is-future',mode!=='session'&&unit>count);
      token.classList.toggle('is-active',mode==='token'&&index===count);
    });
    rows.forEach((row,index)=>row.classList.toggle('is-query-active',mode==='query'&&index===count));
    const current=tokens[mode==='query'?Math.min(2,count)*12:mode==='session'?0:Math.min(35,count)];
    const label=mode==='session'?'Entire session assigned':mode==='query'
      ?count===3?'3 queries assigned':`Turn ${count+1} · Entire response`
      :count===36?'36 tokens generated':`Turn ${Math.floor(count/12)+1} · Token ${count%12+1}`;
    $('routing-progress-label').textContent=label;
    $('routing-progress').setAttribute('aria-valuetext',`${label}, ${current.classList.contains('is-large')?'large':'small'} model`);
  }
  build();
  const playback=createPlayback($('granularity-demo'),{duration:12000,render,label:'routing illustration',range:$('routing-progress')});
  document.querySelectorAll('[data-granularity]').forEach(button=>button.addEventListener('click',()=>{
    mode=button.dataset.granularity;
    document.querySelectorAll('[data-granularity]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    build();
    controls.hidden=mode==='session';
    playback.setDuration(mode==='query'?4500:12000);
    if(mode==='session')playback.seek(1);else playback.restart();
  }));
}

const stages=[
  {start:0,label:'Decode',title:'Decode a local batch.',copy:'The small model advances requests A, B and C in one batch.'},
  {start:.16,label:'Route',title:'Route request A to a peer.',copy:'The routing policy selects the large model for A. Requests B and C stay on the small model.'},
  {start:.27,label:'Send',title:'Send tokens. Keep the cache.',copy:'A token suffix and routing state cross to the peer. A’s KV slot stays on the small model, marked pending.'},
  {start:.38,label:'Peer decoding',title:'Both models make progress.',copy:'The large model handles A while the small model keeps decoding B and C. There is no global decoding barrier.'},
  {start:.68,label:'Return',title:'Return the peer’s tokens.',copy:'The generated token suffix returns to A’s entry subserver. Neither model transfers its KV cache tensors.'},
  {start:.81,label:'Resume',title:'Resume from preserved state.',copy:'A appends the returned tokens and rejoins the local batch using its existing serving state and KV slot.'}
];

export function initHandoff() {
  let previous=-1,previousStep=-1;
  const packet=$('handoff-packet'),small=$('engine-small'),large=$('engine-large');
  function render(progress) {
    const phase=stages.findLastIndex(s=>progress>=s.start),stage=stages[phase];
    const pending=phase>=2&&phase<=4;
    if(phase!==previous) {
      previous=phase;
      $('handoff-title').textContent=stage.title;$('handoff-description').textContent=stage.copy;
      $('handoff-progress-label').textContent=stage.label;
      $('handoff-progress').setAttribute('aria-valuetext',`${stage.label}. ${stage.copy}`);
      document.querySelectorAll('[data-engine-phase]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.enginePhase)===phase)));
      $('small-batch').innerHTML=(pending?['B','C']:['A','B','C']).map(id=>`<b>${id}</b>`).join('');
      $('large-batch').innerHTML=phase===3?'<b>A</b>':'<span class="tr-idle">Idle</span>';
      $('small-cache-state').textContent=`Request A · ${pending?'pending, retained':'running'}`;
      small.classList.toggle('has-pending',pending);large.classList.toggle('is-decoding',phase===3);
      document.querySelector('[data-stage="small-runner"]').classList.toggle('is-running',phase!==1);
      document.querySelector('[data-stage="small-router"]').classList.toggle('is-running',phase===1);
      document.querySelector('[data-stage="large-runner"]').classList.toggle('is-running',phase===3);
      document.querySelector('[data-stage="large-router"]').classList.toggle('is-running',phase===4);
    }
    // Small-model steps continue throughout the asynchronous peer request.
    const smallStep=Math.floor(progress*18)+1;
    if(smallStep!==previousStep){previousStep=smallStep;$('small-step').textContent=`Step ${smallStep}`;}
    small.style.setProperty('--step-progress',`${(progress*18%1)*100}%`);
    large.style.setProperty('--step-progress',`${Math.max(0,Math.min(1,(progress-.38)/.30))*100}%`);
    $('large-step').textContent=phase===3?'Step 1':'—';
    packet.setAttribute('opacity',phase===2||phase===4?'1':'0');
    if(phase===2||phase===4) {
      const start=stage.start,end=stages[phase+1].start,t=travelEase((progress-start)/(end-start));
      packet.setAttribute('cx',String(phase===2?6+100*t:106-100*t));packet.setAttribute('cy',phase===2?'13':'35');
    }
  }
  const playback=createPlayback($('engine-demo'),{duration:16000,render,label:'request handoff',range:$('handoff-progress')});
  document.querySelectorAll('[data-engine-phase]').forEach(button=>button.addEventListener('click',()=>playback.seek(stages[Number(button.dataset.enginePhase)].start+.025)));
}
