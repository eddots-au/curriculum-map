/** Small synthetic graph tests; no network, learner data or curriculum lessons. */
import assert from 'node:assert/strict';
import { parseMRAC, coverageFor, serialise } from '../scripts/curriculum-mrac.mjs';

const A = 'http://purl.org/ASN/schema/core/';
const D = 'http://purl.org/dc/terms/';
const G = 'http://purl.org/gem/qualifiers/';
const prefix = 'http://vocabulary.curriculum.edu.au/MRAC/2024/04/LA/MAT/';
const area = { key: 'MAT', name: 'Mathematics' };
const literal = (value) => [{ '@language': 'en-au', '@value': value }];
const node = (id, kind, title, code, parent) => ({ '@id': prefix + id,
  [A + 'statementLabel']: literal(kind), [A + 'statementNotation']: literal(code),
  [D + 'title']: literal(title), ...(parent ? { [G + 'isChildOf']: [{ '@id': prefix + parent }] } : {}) });
const fixture = () => [{ '@id': prefix + 'thesaurus', '@graph': [
  node('area', 'Learning Area', 'Mathematics', 'MAT'),
  node('subject', 'Subject', 'Mathematics', 'MATMAT', 'area'),
  node('year', 'Level', 'Years 1 and 2', 'MATY12', 'subject'),
  node('strand', 'Strand', 'Number', 'MATNUM12', 'year'),
  { ...node('outcome', 'Content Description', 'Fixture only', 'AC9M2N01', 'strand'),
    [D + 'description']: literal('<p>Fixture <strong>text</strong> &amp; symbols.</p>'),
    ['https://www.esa.edu.au/nominalYearLevel']: literal('Year 1'),
    [D + 'educationLevel']: [{ '@id': 'http://vocabulary.curriculum.edu.au/schoolLevel/1' }] },
] }];
const parse = (data) => parseMRAC(Buffer.from(serialise(data)), area);
let count = 0;
function check(name, fn) { fn(); count++; console.log(`PASS ${name}`); }
check('Source hierarchy preserves year band independently of nominal starting year', () => {
  const item = parse(fixture()).outcomes[0];
  assert.deepEqual(item.yearBands, ['Years 1 and 2']); assert.deepEqual(item.nominalYearLevels, ['Year 1']);
  assert.deepEqual(item.strands, ['Number']); assert.deepEqual(item.subjects, ['Mathematics']);
});
check('Selected description is plain text and source identity is retained', () => {
  const item = parse(fixture()).outcomes[0];
  assert.equal(item.description, 'Fixture text & symbols.'); assert.equal(item.sourceUri, prefix + 'outcome');
});
check('A Version 8 code cannot silently become Version 9', () => {
  const data = fixture(); data[0]['@graph'][4][A + 'statementNotation'] = literal('ACMNA001');
  assert.throws(() => parse(data), /not Version 9/);
});
check('A different release or area graph is rejected', () => {
  const data = fixture(); data[0]['@id'] = prefix.replace('/2024/04/', '/2022/01/') + 'thesaurus';
  assert.throws(() => parse(data), /unexpected source graph/);
});
check('The source learning-area notation is explicit and is not guessed from its URL', () => {
  const data = fixture(); data[0]['@graph'][0][A + 'statementNotation'] = literal('SOURCE');
  assert.throws(() => parse(data), /incomplete outcome hierarchy/);
  assert.equal(parseMRAC(Buffer.from(serialise(data)), { ...area, sourceNotation: 'SOURCE' }).outcomes.length, 1);
});
check('Official Languages notation is preserved and flagged without a fabricated correction', () => {
  const data = JSON.parse(serialise(fixture()).replaceAll('/MAT/', '/LAN/'));
  data[0]['@graph'][0][A + 'statementNotation'] = literal('LAN');
  data[0]['@graph'][4][A + 'statementNotation'] = literal('ACL9LCG8E01');
  const taxonomy = parseMRAC(Buffer.from(serialise(data)), { key: 'LAN', name: 'Languages' });
  assert.equal(taxonomy.outcomes[0].code, 'ACL9LCG8E01');
  assert.equal(taxonomy.outcomes[0].sourceNotes.length, 1);
});
check('Duplicate codes are rejected even with different graph identities', () => {
  const data = fixture(); data[0]['@graph'].push({ ...data[0]['@graph'][4], '@id': prefix + 'duplicate' });
  assert.throws(() => parse(data), /duplicate outcome code/);
});
check('Missing hierarchy cannot be filled by guessing a code prefix', () => {
  const data = fixture(); data[0]['@graph'][4][G + 'isChildOf'] = [{ '@id': prefix + 'missing' }];
  assert.throws(() => parse(data), /unresolved hierarchy/);
});
check('Cyclic hierarchy is rejected', () => {
  const data = fixture(); data[0]['@graph'][0][G + 'isChildOf'] = [{ '@id': prefix + 'outcome' }];
  assert.throws(() => parse(data), /cyclic curriculum hierarchy/);
});
check('An empty or HTML response cannot produce a successful source index', () => {
  assert.throws(() => parse([]), /unexpected source graph/);
  assert.throws(() => parseMRAC(Buffer.from('<html>unavailable</html>'), area));
});
check('Importing official outcomes never claims lesson or interstate coverage', () => {
  const coverage = coverageFor([parse(fixture())], '2026-09-08T00:00:00.000Z');
  assert.equal(coverage.nationalOutcomeCount, 1); assert.equal(coverage.publishReady, false);
  assert.equal(coverage.verifiedMappedOutcomeCount, 0); assert.equal(coverage.verifiedCrosswalkCount, 0);
});
console.log(`Curriculum parser: ${count} checks passed.`);

