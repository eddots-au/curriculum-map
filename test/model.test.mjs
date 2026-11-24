import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { indexMap, selectYear, selectConcept, sequenceColumns, entryPoints, availableSkills, topicSequence, searchSkills, subjectYears } from '../src/model.mjs';
import { proposeLinks } from '../src/cross-links.mjs';

const load = async (n) => JSON.parse(await readFile(new URL(`../data/maps/${n}.json`, import.meta.url), 'utf8'));
const maths = indexMap(await load('mathematics-k10'));

test('a concept selection holds its whole prerequisite chain, with the concept as focus', () => {
  const target = maths.data.skills.find((s) => s.prereqs.length);
  const sel = selectConcept(maths, target.key);
  assert.equal(sel.focus, target.key);
  for (const pre of target.prereqs) assert.ok(sel.skills.includes(pre));
});
test('columns put every skill after its selected prerequisites; entry points have none', () => {
  const sel = selectYear(maths, subjectYears(maths)[2]);
  const cols = sequenceColumns(maths, sel);
  for (const [pre, k] of sel.edges) if (cols.has(pre) && sel.skills.includes(pre)) assert.ok(cols.get(pre) < cols.get(k));
  assert.ok(entryPoints(maths, sel).length > 0);
  assert.ok(topicSequence(maths, sel).length > 0);
});
test('availability opens as prerequisites are done', () => {
  const sel = selectYear(maths, subjectYears(maths)[1]);
  const first = availableSkills(maths, sel, new Set());
  assert.deepEqual(first, entryPoints(maths, sel));
  const next = availableSkills(maths, sel, new Set(first));
  assert.ok(next.every((k) => !first.includes(k)));
});
test('search ranks word-start matches first', () => {
  const hits = searchSkills(maths, 'fractions');
  assert.ok(hits.length > 0 && hits.length <= 8);
});
test('cross-link proposals are drafts between different maps', async () => {
  const maps = [await load('mathematics-k10'), await load('mathematics-hsc')];
  const links = proposeLinks(maps, (a, b) => a === 'mathematics-hsc' && b === 'mathematics-k10');
  for (const l of links) { assert.equal(l.review.state, 'draft'); assert.notEqual(l.from.split(':')[0], l.to.split(':')[0]); }
});
