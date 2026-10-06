(() => {
const { valueAt, aggregateRuns, stepCoordinates, stepPath } = window.AKVMath;

// Three cache operations. These message-sized blocks are explanatory, not measured data.
const operationCopy = {
  append: '<strong>Append.</strong> Process new input against the current active cache and add its KV state.',
  drop: '<strong>Drop.</strong> Remove Tool A’s KV from future attention. Retained states and the logical history stay unchanged.',
  repos: '<strong>Repos.</strong> Close the positional gap by re-encoding retained keys. Continue at the next compact position without re-prefilling the history.'
};
document.querySelectorAll('[data-operation]').forEach(button => {
  button.addEventListener('click', () => {
    const operation = button.dataset.operation;
    document.querySelectorAll('[data-operation]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    document.querySelector('.akv-cache-scene').dataset.stage = operation;
    document.querySelectorAll('[data-position]').forEach(el => { el.textContent = `pos ${Number(el.dataset.position) - (operation === 'repos' ? 1 : 0)}`; });
    document.getElementById('operation-caption').innerHTML = operationCopy[operation];
  });
});

// Benchmark table values are from tex/4_experiment.tex, including its rounded averages.
const benchmarks = ['BrowseComp-Plus', 'GAIA-Text', 'SWE-Verified', 'xbench-DS', 'Average'];
const models = {
  gpt: { name: 'GPT-OSS-120B', rows: [
    [57.5,13.1,68.0,5.4,40.0,20.0,38.5,6.2,51.0,11.2],
    [52.7,12.6,65.1,6.8,36.8,15.8,38.5,5.4,48.3,10.2],
    [61.9,11.4,69.9,4.1,43.2,9.7,37.5,3.8,53.1,7.3]
  ]},
  minimax: { name: 'MiniMax-M2.7', rows: [
    [58.9,5.2,35.0,2.4,75.2,7.0,40.5,5.5,52.4,5.0],
    [62.3,5.3,36.9,2.7,72.0,9.4,40.0,5.2,52.8,5.7],
    [58.9,4.8,40.8,2.6,74.4,5.5,40.5,4.7,53.7,4.4]
  ]},
  miro: { name: 'MiroThinker-1.7-Mini', rows: [
    [60.0,25.2,68.0,9.2,7.8,33.6,40.5,13.5,44.1,20.4],
    [45.7,17.6,66.0,11.0,4.2,28.4,32.5,15.3,37.1,18.1],
    [63.5,15.3,68.9,9.5,7.4,26.3,43.5,8.1,45.8,14.8]
  ]}
};
let selectedModel = 'gpt', selectedMetric = 'score';
function renderBenchmarkChart() {
  const { name, rows } = models[selectedModel];
  const isCost = selectedMetric === 'cost';
  const labels = ['Standard', 'Text Engineering', 'AKV'];
  const colors = ['#b8bdc8', '#8caae0', '#8259bb'];
  const values = rows.flatMap(row => row.filter((_, i) => i % 2 === (isCost ? 1 : 0)));
  const maximum = isCost ? Math.ceil(Math.max(...values) / 5) * 5 : 100;
  const left = 45, right = 1044, top = 35, bottom = 300;
  const groupWidth = (right - left) / benchmarks.length;
  const barWidth = 32, gap = 10;
  const y = value => bottom - value / maximum * (bottom - top);
  const svg = document.getElementById('benchmark-chart');
  svg.querySelectorAll(':scope > :not(title):not(desc)').forEach(el => el.remove());
  let markup = `<rect x="${left+groupWidth*4+5}" y="12" width="${groupWidth-10}" height="340" rx="14" fill="#f6f3fb"/>`;
  for (let step = 0; step <= 5; step++) {
    const value = maximum * step / 5;
    markup += `<line x1="${left}" x2="${right}" y1="${y(value)}" y2="${y(value)}" stroke="#e7e7ed" ${step ? 'stroke-dasharray="4 5"' : ''}/><text x="${left-10}" y="${y(value)+4}" text-anchor="end" font-size="12" fill="#86868b">${Number(value.toFixed(1))}</text>`;
  }
  benchmarks.forEach((benchmark, i) => {
    const center = left + groupWidth * (i + 0.5);
    rows.forEach((row, j) => {
      const value = row[i*2 + (isCost ? 1 : 0)];
      const bx = center - (barWidth*3+gap*2)/2 + j*(barWidth+gap);
      markup += `<rect class="akv-benchmark-bar" x="${bx}" y="${y(value)}" width="${barWidth}" height="${bottom-y(value)}" rx="3" fill="${colors[j]}" style="--bar-delay:${i*55+j*35}ms"><title>${name} · ${benchmark} · ${labels[j]}: ${value.toFixed(1)}${isCost ? ' cents per task' : '%'}</title></rect><text x="${bx+barWidth/2}" y="${y(value)-9}" text-anchor="middle" font-size="12" font-weight="${j===2?600:400}" fill="${j===2?colors[j]:'#62626e'}">${value.toFixed(1)}</text>`;
    });
    markup += `<text x="${center}" y="${bottom+28}" text-anchor="middle" font-size="13" font-weight="${i===4?600:400}" fill="#51515a">${benchmark}</text>`;
  });
  svg.insertAdjacentHTML('beforeend', `<g>${markup}</g>`);
  document.getElementById('benchmark-chart-title').textContent = `${name}: ${isCost?'cost':'accuracy'} across agent benchmarks`;
  document.getElementById('benchmark-chart-desc').textContent = benchmarks.map((benchmark,i)=>`${benchmark}: ${rows.map((row,j)=>`${labels[j]} ${row[i*2+(isCost?1:0)].toFixed(1)}${isCost?' cents':'%'}`).join(', ')}`).join('. ');
  document.getElementById('benchmark-chart-label').textContent = isCost ? 'Cost (¢ / task) · lower is better' : 'Pass rate (%) · higher is better';
  document.getElementById('benchmark-caption').textContent = isCost ? 'API-equivalent inference cost per task. Lower bars indicate less spending.' : 'Pass rate across four benchmarks. Higher bars indicate better task performance.';
  document.querySelectorAll('[data-metric]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.metric===selectedMetric)));
}
function renderBenchmarks(key) {
  selectedModel = key;
  const { rows } = models[key];
  document.querySelectorAll('[data-model]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.model === key)));
  renderBenchmarkChart();
  document.getElementById('benchmark-average').innerHTML = `<span>Average score <strong>${rows[0][8].toFixed(1)} → ${rows[2][8].toFixed(1)}%</strong></span><span>Average cost <strong>${rows[0][9].toFixed(1)} → ${rows[2][9].toFixed(1)}¢</strong></span><span>Standard → AKV</span>`;

}
document.querySelectorAll('[data-model]').forEach(button => button.addEventListener('click', () => renderBenchmarks(button.dataset.model)));
document.querySelectorAll('[data-metric]').forEach(button => button.addEventListener('click', () => { selectedMetric=button.dataset.metric; renderBenchmarkChart(); }));
renderBenchmarks('gpt');

// Real event replay. A moving clip reveals the measured step curves; no synthetic samples.
const data = window.AKV_REPLAY;
const chart = document.getElementById('replay-chart');
const timeOutput = document.getElementById('replay-time');
const toggle = document.getElementById('replay-toggle');
const readout = document.getElementById('replay-readout');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const narrow = matchMedia('(max-width: 600px)');
const maxTime = Math.ceil(Math.max(...data.series.flatMap(s=>s.runs.map(r=>r.points.at(-1)[0]))));
const duration = 12000, hold = 3500;
let elapsed = 0, time = 0, paused = false, visible = false, frame = null, previousFrame = null;
let curves = [], x, y, chartTop, chartBottom, chartLeft, chartRight;
const ns = 'http://www.w3.org/2000/svg';
function element(tag, attrs = {}, text) {
  const el = document.createElementNS(ns, tag);
  Object.entries(attrs).forEach(([key,value])=>el.setAttribute(key,String(value)));
  if (text !== undefined) el.textContent = text;
  return el;
}
function buildChart() {
  const width = narrow.matches ? 560 : 900, height = narrow.matches ? 410 : 420;
  chartLeft = narrow.matches ? 52 : 58; chartRight = width - 58;
  chartTop = 34; chartBottom = height - 58;
  x = value => chartLeft + value / maxTime * (chartRight-chartLeft);
  y = value => chartBottom - value / 60 * (chartBottom-chartTop);
  chart.setAttribute('viewBox',`0 0 ${width} ${height}`);
  chart.querySelectorAll(':scope > :not(title):not(desc)').forEach(el=>el.remove());
  const defs = element('defs'), clip = element('clipPath',{id:'replay-clip'});
  clip.append(element('rect',{id:'replay-clip-rect',x:chartLeft-2,y:chartTop-12,width:chartRight-chartLeft+8,height:chartBottom-chartTop+20}));
  defs.append(clip); chart.append(defs);
  const fontSize = narrow.matches ? 20 : 13;
  chart.append(element('text',{x:chartLeft,y:17,fill:'#77777f','font-size':fontSize},'Cumulative pass rate (%)'));
  for(let value=0;value<=50;value+=10){
    chart.append(element('line',{x1:chartLeft,x2:chartRight,y1:y(value),y2:y(value),stroke:'#e8e8ee','stroke-width':1}));
    chart.append(element('text',{x:chartLeft-12,y:y(value)+5,'text-anchor':'end',fill:'#77777f','font-size':fontSize},String(value)));
  }
  for(let value=0;value<=maxTime;value+=narrow.matches?10:5){
    chart.append(element('text',{x:x(value),y:chartBottom+26,'text-anchor':'middle',fill:'#77777f','font-size':fontSize},String(value)));
  }
  chart.append(element('text',{x:(chartLeft+chartRight)/2,y:height-5,'text-anchor':'middle',fill:'#77777f','font-size':fontSize},'GPU hours'));
  chart.append(element('line',{x1:chartLeft,x2:chartRight,y1:chartBottom,y2:chartBottom,stroke:'#bebec8'}));
  curves = data.series.map(s=>({ ...s, points:aggregateRuns(s.runs) }));
  const plots = element('g',{'clip-path':'url(#replay-clip)'});
  curves.forEach(s=>{
    const upper = stepCoordinates(s.points,x,y,3), lower = stepCoordinates(s.points,x,y,2).reverse();
    plots.append(element('path',{d:[...upper,...lower].map(([a,b],i)=>`${i?'L':'M'}${a.toFixed(3)},${b.toFixed(3)}`).join(' ')+' Z',fill:s.color,opacity:.12}));
  });
  curves.forEach(s=>plots.append(element('path',{d:stepPath(s.points,x,y),fill:'none',stroke:s.color,'stroke-width':3.2,'stroke-dasharray':s.dash,'stroke-linecap':'round','stroke-linejoin':'round'})));
  chart.append(plots);
  chart.append(element('line',{id:'replay-cursor',y1:chartTop,y2:chartBottom,stroke:'#bcb5c8','stroke-dasharray':'3 5','stroke-width':1}));
  curves.forEach((s,i)=>{
    chart.append(element('circle',{id:`replay-dot-${i}`,r:5,fill:s.color,stroke:'#fff','stroke-width':2}));
    chart.append(element('text',{id:`replay-value-${i}`,fill:s.color,'font-size':fontSize,'font-weight':600}));
  });
  readout.innerHTML = curves.map((s,i)=>`<div><strong id="replay-stat-${i}"></strong>${s.label}</div>`).join('');
  renderTime(time);
}
function renderTime(next) {
  time = Math.max(0,Math.min(maxTime,next));
  timeOutput.textContent = `${time.toFixed(1)} GPU h`;
  document.getElementById('replay-status').textContent = time >= maxTime ? 'All tasks completed' : 'Experiment in progress';
  chart.querySelector('#replay-clip-rect').setAttribute('width',x(time)-chartLeft+3);
  const cursor = chart.querySelector('#replay-cursor');
  cursor.setAttribute('x1',x(time)); cursor.setAttribute('x2',x(time));
  curves.forEach((s,i)=>{
    const value = valueAt(s.points,time), end = Math.min(time,s.points.at(-1)[0]);
    const dot = chart.querySelector(`#replay-dot-${i}`), label = chart.querySelector(`#replay-value-${i}`);
    dot.setAttribute('cx',x(end)); dot.setAttribute('cy',y(value));
    label.setAttribute('x',x(end)+9); label.setAttribute('y',y(value)+5);
    label.textContent = !narrow.matches && time >= s.points.at(-1)[0] ? `${value.toFixed(1)}%` : '';
    document.getElementById(`replay-stat-${i}`).textContent = `${value.toFixed(1)}%`;
  });
}
function stop() { cancelAnimationFrame(frame); frame = null; previousFrame = null; }
function updateControls() {
  toggle.disabled = reducedMotion.matches;
  toggle.textContent = reducedMotion.matches ? 'Static' : paused ? 'Resume' : 'Pause';
  toggle.setAttribute('aria-label',reducedMotion.matches ? 'Animation disabled for reduced motion' : `${paused?'Resume':'Pause'} animation`);
  toggle.setAttribute('aria-pressed',String(paused));
}
function tick(now) {
  frame = null;
  if(paused || !visible || document.hidden || reducedMotion.matches){previousFrame=null;return;}
  if(previousFrame !== null) elapsed = (elapsed + Math.min(now-previousFrame,100)) % (duration+hold);
  previousFrame = now;
  renderTime(Math.min(elapsed/duration,1)*maxTime);
  frame = requestAnimationFrame(tick);
}
function play() {
  if(frame===null && !paused && visible && !document.hidden && !reducedMotion.matches){previousFrame=null;frame=requestAnimationFrame(tick);}
}
toggle.addEventListener('click',()=>{paused=!paused;updateControls();if(paused)stop();else play();});
narrow.addEventListener('change',buildChart);
reducedMotion.addEventListener('change',()=>{stop();updateControls();renderTime(reducedMotion.matches?maxTime:Math.min(elapsed/duration,1)*maxTime);play();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else play();});
time=reducedMotion.matches?maxTime:0;
buildChart();updateControls();
new IntersectionObserver(entries=>{
  for(const entry of entries){
    visible=entry.isIntersecting;
    if(visible)play();else stop();
  }
},{threshold:.12}).observe(document.getElementById('replay-figure'));

})();
