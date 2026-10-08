import test from 'node:test';
import assert from 'node:assert/strict';
import {cp, mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

test('development rebuilds reload shared renderers and retain them after content edits', {timeout:10000}, async()=>{
  const fixture = await mkdtemp(join(tmpdir(), 'project-dev-'));
  let child, output = '';
  const waitFor = async predicate => {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      if (await predicate()) return;
      await new Promise(done => setTimeout(done, 25));
    }
    assert.fail(`Development rebuild timed out: ${output}`);
  };
  try {
    for (const dir of ['scripts', 'projects', 'shared', 'config', 'hub/assets', 'node_modules/next/dist/bin']) {
      await mkdir(join(fixture, dir), {recursive:true});
    }
    await writeFile(join(fixture, 'package.json'), '{"type":"module"}');
    await cp(new URL('../scripts/dev.mjs', import.meta.url), join(fixture, 'scripts/dev.mjs'));
    await writeFile(join(fixture, 'shared/render.mjs'), 'export const render = () => "legacy";');
    await writeFile(join(fixture, 'scripts/generate.mjs'), `
      import {mkdir, writeFile} from 'node:fs/promises';
      import {render} from '../shared/render.mjs';
      export const root = process.cwd();
      export async function generate() {
        await mkdir('public', {recursive:true});
        await writeFile('public/result.txt', render());
        console.log('Generated fixture: ' + render());
      }
    `);
    await writeFile(join(fixture, 'node_modules/next/dist/bin/next'), 'console.log("next-ready"); setInterval(() => {}, 1000);');
    child = spawn(process.execPath, ['scripts/dev.mjs'], {cwd:fixture, stdio:['ignore', 'pipe', 'pipe']});
    child.stdout.on('data', chunk => {output += chunk;});
    child.stderr.on('data', chunk => {output += chunk;});
    await waitFor(() => output.includes('next-ready'));
    assert.equal(await readFile(join(fixture, 'public/result.txt'), 'utf8'), 'legacy');
    await writeFile(join(fixture, 'shared/render.mjs'), 'export const render = () => "visible-disabled";');
    await waitFor(() => output.includes('Generated fixture: visible-disabled'));
    const generations = () => (output.match(/Generated fixture:/g) || []).length;
    const previous = generations();
    await writeFile(join(fixture, 'projects/content.html'), '<p>Edited content</p>');
    await waitFor(() => generations() > previous);
    assert.equal(await readFile(join(fixture, 'public/result.txt'), 'utf8'), 'visible-disabled');
  } finally {
    if (child && child.exitCode === null) {
      const stopped = new Promise(done => child.once('exit', done));
      child.kill('SIGTERM');
      await stopped;
    }
    await rm(fixture, {recursive:true, force:true});
  }
});
