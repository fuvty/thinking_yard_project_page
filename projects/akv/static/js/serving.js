(() => {
  // Table 2 of main.pdf. Each row: request mean/P95, TTFT mean/P95,
  // TPOT mean/P95, input throughput, output throughput. Seconds, ms/token, tokens/s.
  const concurrency = [8, 10, 12, 14, 16];
  const series = [
    {name:'Standard', color:'#697384', dash:'6 5', rows:[
      [12.16,43.57,3.18,8.42,26.57,31.38,25200,217],
      [12.82,45.03,3.93,9.76,26.47,30.83,30108,254],
      [12.39,43.16,2.97,9.99,28.00,32.78,33832,313],
      [30.16,108.86,21.36,88.29,24.50,29.85,12767,146],
      [36.50,229.90,27.71,223.57,24.83,29.25,10866,138]
    ]},
    {name:'Text Engineering', color:'#4488dc', dash:'2 5', rows:[
      [12.84,43.57,4.94,22.99,23.23,25.68,17313,228],
      [15.17,50.27,7.35,34.07,22.57,25.09,18533,246],
      [16.83,52.82,8.86,37.98,23.24,25.95,19945,264],
      [19.59,60.67,11.19,47.36,24.50,27.23,19992,267],
      [23.00,69.96,14.48,52.71,24.44,27.56,19595,267]
    ]},
    {name:'AKV', color:'#9160e7', dash:'', rows:[
      [7.79,25.93,1.87,5.99,23.50,29.42,39227,245],
      [8.13,27.11,2.22,7.36,23.20,29.86,46002,295],
      [8.47,27.18,2.60,8.17,23.06,29.23,48923,339],
      [9.09,28.49,2.92,8.62,24.50,31.56,51837,369],
      [10.32,30.63,4.16,13.02,24.84,32.41,50817,369]
    ]}
  ];
  function chart(id, column, maximum, step, unit) {
    const svg = document.getElementById(id);
    const x = i => 48 + i * 88, y = v => 235 - v / maximum * 205;
    let markup = '';
    for (let v=0; v<=maximum; v+=step) {
      markup += `<line x1="48" x2="400" y1="${y(v)}" y2="${y(v)}" stroke="#e8e8ee"/><text x="38" y="${y(v)+5}" text-anchor="end" fill="#77777f" font-size="15">${v}</text>`;
    }
    concurrency.forEach((c,i) => { markup += `<text x="${x(i)}" y="259" text-anchor="middle" fill="#77777f" font-size="15">${c}</text>`; });
    markup += '<text x="224" y="284" text-anchor="middle" fill="#77777f" font-size="15">Concurrency</text>';
    series.forEach(s => {
      markup += `<polyline points="${s.rows.map((r,i)=>`${x(i)},${y(r[column])}`).join(' ')}" fill="none" stroke="${s.color}" stroke-width="3" stroke-dasharray="${s.dash}" stroke-linecap="round"/>`;
      s.rows.forEach((r,i)=> { markup += `<circle cx="${x(i)}" cy="${y(r[column])}" r="4" fill="${s.color}" stroke="#fff" stroke-width="1.5"><title>${s.name}, C=${concurrency[i]}: ${r[column]} ${unit}</title></circle>`; });
      const end = s.rows.at(-1)[column];
      markup += `<text x="410" y="${y(end)+5}" fill="${s.color}" font-size="14" font-weight="600">${column===7?end:end.toFixed(1)}</text>`;
    });
    svg.insertAdjacentHTML('beforeend', `<g>${markup}</g>`);
    document.getElementById(`${id}-desc`).textContent = concurrency.map((c,i)=>`Concurrency ${c}: ${series.map(s=>`${s.name} ${s.rows[i][column]} ${unit}`).join(', ')}`).join('. ');
  }
  chart('serving-throughput', 7, 400, 100, 'tokens/s');
  chart('serving-latency', 1, 250, 50, 'seconds');
  document.getElementById('serving-table').innerHTML = '<caption>Table 2 · GPT-OSS-120B · Top-80 SWE-bench workload replay</caption><thead><tr><th scope="col" rowspan="2">C</th><th scope="col" rowspan="2">Method</th><th scope="colgroup" colspan="2">Request latency (s)</th><th scope="colgroup" colspan="2">TTFT (s)</th><th scope="colgroup" colspan="2">TPOT (ms/token)</th><th scope="colgroup" colspan="2">Throughput (tokens/s)</th></tr><tr><th scope="col">Mean</th><th scope="col">P95</th><th scope="col">Mean</th><th scope="col">P95</th><th scope="col">Mean</th><th scope="col">P95</th><th scope="col">Input</th><th scope="col">Output</th></tr></thead><tbody>' + concurrency.map((c,i)=>series.map((s,j)=>`<tr${j===2?' class="akv-ours"':''}><th scope="row">${c}</th><th scope="row">${s.name}</th>${s.rows[i].map((v,k)=>{
    const best = k<6 ? Math.min(...series.map(m=>m.rows[i][k])) : Math.max(...series.map(m=>m.rows[i][k]));
    const text = k<6 ? v.toFixed(2) : v.toLocaleString('en-US');
    return `<td>${v===best?`<strong>${text}</strong>`:text}</td>`;
  }).join('')}</tr>`).join('')).join('') + '</tbody>';
})();
