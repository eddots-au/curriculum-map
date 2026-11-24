// Loads any curriculum that follows docs/FORMAT.md, from a file path or a plain object.
import { readFile } from 'node:fs/promises';
import { validateMap } from './validate.mjs';

export async function loadMap(source) {
  const map = typeof source === 'string' ? JSON.parse(await readFile(source, 'utf8')) : source;
  const problems = validateMap(map);
  if (problems.length) throw new Error(`Invalid learning map ${map?.id ?? ''}:\n- ${problems.join('\n- ')}`);
  return map;
}

// Everything a learner must know first, directly and indirectly.
export function allPrerequisites(map, key) {
  const by = new Map(map.skills.map((s) => [s.key, s]));
  const seen = new Set();
  const walk = (k) => { for (const p of by.get(k)?.prereqs || []) if (!seen.has(p)) { seen.add(p); walk(p); } };
  walk(key);
  return [...seen];
}
