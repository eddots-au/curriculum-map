/** Fetch approved curriculum metadata or validate the archived source projection. */
import { readFile, writeFile, mkdir, rename, rm } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { parseMRAC, coverageFor, hash, serialise } from './curriculum-mrac.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const directory = join(root, 'data/australian-curriculum');
const sources = JSON.parse(await readFile(join(directory, 'sources.json'), 'utf8'));
const destination = join(directory, 'v9');
const limit = 64 * 1024 * 1024;

async function download(area) {
  const expected = `https://vocabulary.curriculum.edu.au/${sources.releasePath}/LA/${area.key}/export/${sources.releasePath}/LA/${area.key}.jsonld`;
  if (area.url !== expected) throw new Error('The source URL is outside the verified curriculum index.');
  const response = await fetch(area.url, { signal: AbortSignal.timeout(30000), headers: { Accept: 'application/ld+json' } });
  if (!response.ok || response.url !== area.url || !response.headers.get('content-type')?.includes('json')) {
    throw new Error(`${area.key}: source download was not a JSON-LD response (${response.status})`);
  }
  const chunks = []; let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > limit) throw new Error(`${area.key}: source exceeds size limit`);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function validate() {
  const manifest = JSON.parse(await readFile(join(destination, 'manifest.json'), 'utf8'));
  assert.equal(manifest.curriculumVersion, '9.0');
  assert.equal(manifest.releasePath, sources.releasePath);
  assert.equal(manifest.sources.length, sources.areas.length);
  const taxonomies = [];
  for (const area of sources.areas) {
    const source = manifest.sources.find((entry) => entry.area === area.key);
    assert.ok(source, `Missing ${area.key} source`);
    assert.equal(source.url, area.url);
    const raw = gunzipSync(await readFile(join(destination, 'sources', `${area.key}.jsonld.gz`)), { maxOutputLength: limit });
    assert.equal(hash(raw), source.sha256, `${area.key} source digest`);
    const taxonomy = parseMRAC(raw, area, sources.releasePath);
    const stored = await readFile(join(destination, `${area.key}.json`));
    assert.equal(hash(stored), source.taxonomySha256, `${area.key} taxonomy digest`);
    assert.deepEqual(JSON.parse(stored), taxonomy, `${area.key} projection must match source`);
    taxonomies.push(taxonomy);
  }
  const coverage = JSON.parse(await readFile(join(destination, 'coverage.json'), 'utf8'));
  assert.deepEqual(coverage, coverageFor(taxonomies, manifest.retrievedAt));
  console.log(`Curriculum source validation passed: ${coverage.nationalOutcomeCount} outcomes in ${taxonomies.length} areas; lesson alignment remains unverified.`);
}

async function runImport() {
  const retrievedAt = new Date().toISOString();
  const results = [];
  // Bounded source-only downloads. All files validate before existing data changes.
  for (let offset = 0; offset < sources.areas.length; offset += 2) {
    const pair = await Promise.all(sources.areas.slice(offset, offset + 2).map(async (area) => {
      const raw = await download(area);
      const taxonomy = parseMRAC(raw, area, sources.releasePath);
      console.log(`${area.key}: verified ${taxonomy.outcomes.length} outcome codes`);
      return { area, raw, taxonomy };
    }));
    results.push(...pair);
  }
  const stage = join(directory, `.v9-import-${process.pid}`);
  await mkdir(join(stage, 'sources'), { recursive: true });
  try {
    const manifest = { schemaVersion: 1, curriculumVersion: '9.0', releasePath: sources.releasePath,
      retrievedAt, indexVerifiedAt: sources.indexVerifiedAt, officialIndex: sources.officialIndex,
      copyrightTerms: sources.copyrightTerms, licence: sources.licence,
      transformation: 'Archived JSON-LD is unchanged. Taxonomies select content descriptions, traverse explicit source hierarchy and remove presentational HTML from text. No code, lesson alignment or crosswalk is inferred.',
      sources: [] };
    for (const { area, raw, taxonomy } of results) {
      const output = serialise(taxonomy);
      await writeFile(join(stage, 'sources', `${area.key}.jsonld.gz`), gzipSync(raw, { level: 9 }));
      await writeFile(join(stage, `${area.key}.json`), output);
      manifest.sources.push({ area: area.key, url: area.url, retrievedAt, bytes: raw.length, sha256: hash(raw),
        taxonomySha256: hash(output), outcomeCount: taxonomy.outcomes.length });
    }
    await writeFile(join(stage, 'manifest.json'), serialise(manifest));
    await writeFile(join(stage, 'coverage.json'), serialise(coverageFor(results.map((result) => result.taxonomy), retrievedAt)));
    await mkdir(destination, { recursive: true });
    await mkdir(join(destination, 'sources'), { recursive: true });
    // Each generated file is replaced atomically; a rerun repairs an interrupted
    // promotion, and offline validation catches any mixed source/projection set.
    for (const { area } of results) {
      await rename(join(stage, 'sources', `${area.key}.jsonld.gz`), join(destination, 'sources', `${area.key}.jsonld.gz`));
      await rename(join(stage, `${area.key}.json`), join(destination, `${area.key}.json`));
    }
    for (const file of ['manifest.json', 'coverage.json']) await rename(join(stage, file), join(destination, file));
  } finally { await rm(stage, { recursive: true, force: true }); }
  await validate();
}

try {
  if (process.argv.length === 3 && process.argv[2] === '--fetch') await runImport();
  else if (process.argv.length === 3 && process.argv[2] === '--validate') await validate();
  else throw new Error('Usage: node scripts/curriculum-import.mjs --fetch | --validate');
} catch (error) { console.error(error.message); process.exitCode = 1; }

