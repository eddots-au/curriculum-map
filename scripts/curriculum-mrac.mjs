/** Official MRAC JSON-LD parsing. No inferred curriculum or lesson crosswalks. */
import { createHash } from 'node:crypto';

const ASN = 'http://purl.org/ASN/schema/core/';
const DC = 'http://purl.org/dc/terms/';
const GEM = 'http://purl.org/gem/qualifiers/';
const ESA = 'https://www.esa.edu.au/';
const values = (node, key) => (node?.[key] ?? []).map((item) => item['@value']).filter((value) => typeof value === 'string');
const refs = (node, key) => (node?.[key] ?? []).map((item) => item['@id']).filter((value) => typeof value === 'string');
const label = (node) => values(node, ASN + 'statementLabel')[0] ?? '';
const unique = (array) => [...new Set(array)].sort();
export const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const serialise = (value) => JSON.stringify(value, null, 2) + '\n';

function plain(value) {
  return value.replace(/<[^>]*>/g, '').replace(/&(amp|lt|gt|quot|apos|nbsp);/g,
    (_, entity) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' })[entity])
    .replace(/\s+/g, ' ').trim();
}

export function parseMRAC(raw, area, releasePath = 'MRAC/2024/04') {
  const payload = JSON.parse(raw.toString('utf8'));
  const prefix = `http://vocabulary.curriculum.edu.au/${releasePath}/LA/${area.key}/`;
  if (!Array.isArray(payload) || payload.length !== 1 || payload[0]['@id'] !== prefix + 'thesaurus'
      || !Array.isArray(payload[0]['@graph'])) throw new Error(`${area.key}: unexpected source graph/release`);
  const nodes = payload[0]['@graph'];
  const index = new Map();
  for (const node of nodes) {
    if (typeof node['@id'] !== 'string' || index.has(node['@id'])) throw new Error(`${area.key}: missing or duplicate graph identity`);
    index.set(node['@id'], node);
  }
  const ancestors = (start) => {
    const result = new Map();
    const visit = (node, chain) => {
      if (chain.has(node['@id']) || chain.size > 30) throw new Error(`${area.key}: cyclic curriculum hierarchy`);
      const path = new Set([...chain, node['@id']]);
      for (const parentId of refs(node, GEM + 'isChildOf')) {
        const parent = index.get(parentId);
        if (!parent) throw new Error(`${area.key}: unresolved hierarchy parent`);
        if (!result.has(parentId)) { result.set(parentId, parent); visit(parent, path); }
        else if (path.has(parentId)) throw new Error(`${area.key}: cyclic curriculum hierarchy`);
      }
    };
    visit(start, new Set());
    return [...result.values()];
  };
  const outcomes = [];
  const seen = new Set();
  for (const node of nodes) {
    if (label(node) !== 'Content Description' || !node['@id'].startsWith(prefix)) continue;
    const codes = values(node, ASN + 'statementNotation');
    const code = codes[0];
    // The official Languages export uses both AC9… and ACL9… forms. Preserve
    // these verbatim; importing metadata never certifies editorial correctness.
    if (codes.length !== 1 || !/^AC(?:9|L9)[A-Z0-9]+$/.test(code ?? '')) throw new Error(`${area.key}: outcome is not Version 9`);
    if (seen.has(code)) throw new Error(`${area.key}: duplicate outcome code ${code}`);
    seen.add(code);
    const parents = ancestors(node);
    const titled = (kind) => unique(parents.filter((parent) => label(parent) === kind).flatMap((parent) => values(parent, DC + 'title').map(plain)));
    const yearBands = titled('Level');
    const subjects = titled('Subject');
    const strands = titled('Strand');
    const subStrands = titled('Sub-Strand');
    if (!yearBands.length || !subjects.length || !strands.length
        || !parents.some((parent) => label(parent) === 'Learning Area' && values(parent, ASN + 'statementNotation').includes(area.sourceNotation ?? area.key))) {
      throw new Error(`${area.key}: incomplete outcome hierarchy ${code}`);
    }
    const notes = [];
    if (code.startsWith('ACL9')) notes.push('Source uses ACL9 notation; retained verbatim pending editorial verification.');
    if (area.key === 'LAN' && !/^(AC9L|ACL9)/.test(code)) notes.push('Source language outcome has a non-standard subject prefix; retained verbatim pending editorial verification.');
    outcomes.push({ code, sourceUri: node['@id'], description: plain(values(node, DC + 'description')[0] ?? ''),
      subjects, yearBands, nominalYearLevels: unique(values(node, ESA + 'nominalYearLevel')),
      schoolLevelUris: unique(refs(node, DC + 'educationLevel')), strands, subStrands,
      sequences: titled('Sequence'), pathways: titled('Pathway'), sourceNotes: notes });
  }
  if (!outcomes.length) throw new Error(`${area.key}: no Version 9 content descriptions`);
  outcomes.sort((left, right) => left.code.localeCompare(right.code, 'en-AU'));
  return { schemaVersion: 1, curriculum: 'Australian Curriculum', curriculumVersion: '9.0', releasePath,
    learningArea: { key: area.key, name: area.name },
    versionEvidence: { graph: payload[0]['@id'], notationFamilies: unique(outcomes.map((outcome) => outcome.code.startsWith('ACL9') ? 'ACL9' : 'AC9')) },
    scope: 'Official content-description metadata. This is not a lesson, assessment, prerequisite map or verified jurisdiction crosswalk.',
    outcomes };
}

export function coverageFor(taxonomies, retrievedAt) {
  return { schemaVersion: 1, curriculumVersion: '9.0', retrievedAt, publishReady: false,
    status: 'source-index-only',
    reason: 'Curriculum metadata has been imported. Lesson alignment, assessments and state or territory crosswalks have not been verified.',
    nationalOutcomeCount: taxonomies.reduce((count, taxonomy) => count + taxonomy.outcomes.length, 0),
    verifiedMappedOutcomeCount: 0, verifiedLessonCount: 0, verifiedCrosswalkCount: 0,
    existingNSWContent: 'Retained under its existing NSW source labels. No national or interstate equivalence is inferred.',
    areas: taxonomies.map((taxonomy) => ({ ...taxonomy.learningArea, outcomeCount: taxonomy.outcomes.length,
      subjects: unique(taxonomy.outcomes.flatMap((outcome) => outcome.subjects)),
      yearBands: unique(taxonomy.outcomes.flatMap((outcome) => outcome.yearBands)),
      sourceNotesCount: taxonomy.outcomes.filter((outcome) => outcome.sourceNotes.length).length,
      verifiedMappedOutcomeCount: 0, publishReady: false })) };
}

