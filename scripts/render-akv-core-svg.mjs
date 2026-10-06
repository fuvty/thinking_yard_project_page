import { writeFile } from 'node:fs/promises';
import '../projects/akv/static/js/core-scene.js';

for (const kind of ['context', 'cache']) {
  await writeFile(new URL(`../projects/akv/static/figures/${kind}-engineering.svg`, import.meta.url), globalThis.AKVCoreScene.svg(kind, 11) + '\n');
}
