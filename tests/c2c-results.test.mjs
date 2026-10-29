import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const head = await readFile(new URL('../projects/c2c/head.html',import.meta.url),'utf8');
const script = head.slice(head.indexOf('    function updateSummary(data)'),head.lastIndexOf('</script>'));
const csv = (await readFile(new URL('../projects/c2c/static/data/performance_general.csv',import.meta.url),'utf8')).trim().split('\n').map(line=>line.split(','));
const rows = csv.slice(1).map(values=>Object.fromEntries(csv[0].map((key,i)=>[key,values[i]])));
function summary(data,unit='pp') {
  const elements = Object.fromEntries(['summaryImprovement','summaryVsT2T','summarySpeedup'].map(id=>[id,{}]));
  const context = {data,c2cText:()=>unit,document:{getElementById:id=>elements[id]}};
  vm.runInNewContext(`${script}\nupdateSummary(data);`,context);
  return Object.values(elements).map(e=>e.textContent);
}
test('C2C summary matches v2 §4.2 accuracy differences and mean-latency ratios',()=>{
  const expected = {
    'Qwen2.5-0.5B':['+11.0 pp','+5.4 pp','3.46×'],
    'Llama3.2-1B':['+9.6 pp','+4.1 pp','1.51×'],
    'Qwen3-4B-Base':['+11.9 pp','+3.1 pp','14.41×'],
  };
  for(const [sharer,result] of Object.entries(expected)) assert.deepEqual(summary(rows.filter(r=>r.Sharer===sharer)),result);
  assert.deepEqual(summary(rows),['+10.8 pp','+4.2 pp','6.26×']);
  assert.equal(summary(rows,'个百分点')[0],'+10.8 个百分点');
});
test('C2C missing measurements do not dilute unrelated averages or create zero-speed claims',()=>{
  assert.deepEqual(summary([]),['—','—','—']);
  assert.deepEqual(summary([
    {C2C_Acc:'60',Receiver_Acc:'50',T2T_Acc:'N/A',T2T_Time:'2',C2C_Time:'1'},
    {C2C_Acc:'40',Receiver_Acc:'N/A',T2T_Acc:'45',T2T_Time:'3',C2C_Time:'0'},
  ]),['+10.0 pp','-5.0 pp','2.00×']);
});
