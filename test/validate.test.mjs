import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { validateMap, learningOrder } from '../src/validate.mjs';
import { allPrerequisites } from '../src/loader.mjs';

const example = JSON.parse(await readFile(new URL('../examples/minimal-curriculum.json', import.meta.url), 'utf8'));
const clone = () => structuredClone(example);

test('the example map is valid and orders skills after their prerequisites', () => {
  assert.deepEqual(validateMap(example), []);
  const order = learningOrder(example);
  assert.ok(order.indexOf('count-to-20') < order.indexOf('add-within-10'));
  assert.ok(order.indexOf('add-within-10') < order.indexOf('add-within-20'));
});
test('a dangling prerequisite is reported', () => {
  const m = clone(); m.skills[1].prereqs = ['nope'];
  assert.match(validateMap(m).join('\n'), /dangling prerequisite/);
});
test('a prerequisite cycle is reported and has no order', () => {
  const m = clone(); m.skills[0].prereqs = ['add-within-20'];
  assert.match(validateMap(m).join('\n'), /cycle/);
  assert.equal(learningOrder(m), null);
});
test('duplicate keys and unknown topics are reported', () => {
  const m = clone(); m.skills.push({ ...m.skills[0] }); m.skills[2].topic = 'ghost';
  const text = validateMap(m).join('\n');
  assert.match(text, /duplicate skill/); assert.match(text, /unknown topic/);
});
test('allPrerequisites includes indirect prerequisites', () => {
  assert.deepEqual(allPrerequisites(example, 'add-within-20').sort(), ['add-within-10', 'count-to-20']);
});
test('every shipped map in data/maps is valid', async () => {
  const dir = new URL('../data/maps/', import.meta.url);
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json') && f !== 'index.json');
  assert.ok(files.length >= 7);
  for (const f of files) {
    const m = JSON.parse(await readFile(new URL(f, dir), 'utf8'));
    assert.deepEqual(validateMap(m), [], f);
  }
});
