"""Rebuild web data and the equal-width road mark from supplied research sources.
Usage: python3 prepare_assets.py /path/to/latex
No third-party dependencies. Source measurements are copied without rounding.
"""
from pathlib import Path
import ast, csv, json, math, shutil, sys, re
import heapq, itertools
from collections import defaultdict, deque
from dataclasses import dataclass, asdict

page = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1]).resolve()
data_dir = page / 'static/data'
for name in ['TokenRouter.csv', 'tradeoff.csv', 'delayedBatching.md']:
    shutil.copyfile(source / 'R2RSysFigures/data' / name, data_dir / name)

def number(value):
    return None if value in ['', '-'] else float(value.replace(',', ''))

results = []
with (data_dir / 'TokenRouter.csv').open(newline='') as f:
    rows = csv.reader(f); next(rows); key = ['', '', '']
    for row in rows:
        key = [row[i] or key[i] for i in range(3)]
        if key[1] == 'agentic_single': continue  # Same scope as the paper figure script.
        results.append(dict(concurrency=int(key[0]), workload=key[1], algorithm=key[2], implementation=row[3], latency=number(row[4]), throughput=number(row[5])))
tradeoff = []
with (data_dir / 'tradeoff.csv').open(newline='') as f:
    rows = csv.reader(f); next(rows); implementation = ''
    for row in rows:
        implementation = row[0] or implementation
        tradeoff.append(dict(implementation=implementation, concurrency=int(row[1]), speed=float(row[2]), throughput=float(row[3])))

# Reuse the provided scheduling algorithms, without importing plotting dependencies.
script = source / 'R2RSysFigures/src/schedule_timeline.py'
names = {'Task','batch_duration','simulate_model_sync','simulate_step_sync','simulate_threshold_async'}
tree = ast.parse(script.read_text())
selected = ast.Module(body=[node for node in tree.body if isinstance(node, (ast.FunctionDef, ast.ClassDef)) and node.name in names], type_ignores=[])
SLM, LLM = 'SLM', 'LLM'
exec(compile(selected, str(script), 'exec'))
workload = [[SLM]*5, [SLM,LLM,SLM,LLM,SLM], [SLM,SLM,LLM,SLM,LLM]]
schedules = {}
for key, result in [('step',simulate_step_sync(workload)), ('model',simulate_model_sync(workload)), ('eager',simulate_threshold_async(workload)), ('delayed',simulate_threshold_async(workload,llm_threshold=2))]:
    history, completion, *barriers = result
    schedules[key] = dict(history=[dict(start=h['start'],end=h['end'],model=h['model'],tasks=[asdict(t) for t in h['tasks']]) for h in history], completion=completion, barriers=barriers[0] if barriers else [])

# Read measured threshold rows and the current ablation configuration directly.
measured = (data_dir / 'delayedBatching.md').read_text().split('Practical throughput', 1)[1]
batching = {}
for line in measured.splitlines():
    if re.match(r'\|\s*bs=\d+', line):
        cells = [cell.strip().replace('**', '') for cell in line.strip('|').split('|')]
        batching[cells[0].split('=')[1]] = [float(value) for value in cells[1:] if value and value != 'NA']
ablation_tree = ast.parse((source / 'R2RSysFigures/src/plot_tokenrouter_ablation.py').read_text())
config = next(node.value for node in ablation_tree.body if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'THROUGHPUT' for t in node.targets))
assert isinstance(config, ast.Dict)
assert all(isinstance(value, ast.Call) and isinstance(value.func, ast.Name) and value.func.id == 'Decimal' and isinstance(value.args[0], ast.Constant) for value in config.values)
ablation_values = {key.value:float(value.args[0].value) for key,value in zip(config.keys,config.values)}
stages = [('Base implementation','base'), ('+ Extend CUDA graphs','cuda_graph'), ('+ Async execution','async_execution'), ('+ Delayed batching','delayed_batching')]
measurements = dict(results=results, tradeoff=tradeoff, schedules=schedules,
    batching=batching, ablation=[[label,ablation_values[key]] for label,key in stages],
    ablationOfficial=ablation_values['official'])
(data_dir / 'measurements.json').write_text(json.dumps(measurements,indent=2)+'\n')
# Preserve the sampled five-road geometry; the logo is the user-supplied PNG.
ROAD_COUNT = 5
GUIDE_RIPPLE = .025
def guide(theta):
    r=.5*(1+GUIDE_RIPPLE*math.cos(ROAD_COUNT*(theta-math.radians(8))))
    dr=-ROAD_COUNT*.5*GUIDE_RIPPLE*math.sin(ROAD_COUNT*(theta-math.radians(8)))
    x,y=r*math.cos(theta),r*math.sin(theta)
    dx,dy=dr*math.cos(theta)-r*math.sin(theta),dr*math.sin(theta)+r*math.cos(theta)
    norm=math.hypot(dx,dy)
    return (x,y),(dx/norm,dy/norm)
theta=math.radians(126)
p3,tangent=guide(theta); p0=(0,1.2); p1=(0,.77); p2=tuple(p3[i]-.25*tangent[i] for i in range(2))
points=[]
for n in range(901):
    t=n/900;points.append(tuple((1-t)**3*p0[i]+3*(1-t)**2*t*p1[i]+3*(1-t)*t*t*p2[i]+t**3*p3[i] for i in range(2)))
def arm(degrees):return points[:-1]+[guide(theta+math.radians(degrees)*i/900)[0] for i in range(901)]
shutil.copyfile(source / 'logo.png',page.parents[1] / 'shared/assets/tokenrouter.png')
# Sampled paths share the source geometry with the animated hero.
(data_dir / 'roads.json').write_text(json.dumps(dict(count=ROAD_COUNT,points=[list(p) for p in arm(180)[::8]]),separators=(',',':')))
print(f'Prepared {len(results)} measurements, {len(tradeoff)} trade-off points, 4 schedules and the road mark.')
