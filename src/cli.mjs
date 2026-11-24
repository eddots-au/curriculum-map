#!/usr/bin/env node
// Usage: node src/cli.mjs <file-or-directory>   Validates every learning map found.
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { loadMap } from './loader.mjs';

const target = process.argv[2];
if (!target) { console.error('Usage: node src/cli.mjs <map.json | directory>'); process.exit(2); }
const files = (await stat(target)).isDirectory()
  ? (await readdir(target)).filter((f) => f.endsWith('.json') && f !== 'index.json').map((f) => join(target, f))
  : [target];
let failed = 0;
for (const file of files) {
  try { const m = await loadMap(file); console.log(`ok   ${m.id}: ${m.skills.length} skills, ${m.topics.length} topics`); }
  catch (e) { failed++; console.error(`FAIL ${file}\n${e.message}`); }
}
process.exit(failed ? 1 : 0);
