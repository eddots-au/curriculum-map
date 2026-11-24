// Propose links between two different maps from shared method names. Drafts only; it never publishes.
// A link joins `tree:key` ids. The later concept is `from`, the earlier is `to`.
// Same subject family: builds-on. Different families: uses. Same first year across families: connects-to.
// Every proposal is marked draft: a person must rewrite the reason and review it.
import { indexMap, skillYears } from './model.mjs';

// Each method the vocabulary knows. `in` limits it to subject families; `stop` removes look-alikes.
export const VOCABULARY = [
  { term: 'changing the subject of a formula', in: ['mathematics', 'science'], match: /\b(chang(e|es|ing) the subject|rearrang(e|es|ing))\b/i },
  { term: 'index laws', in: ['mathematics', 'science'], match: /\b(index laws?|indices|index form)\b/i },
  { term: 'logarithms', in: ['mathematics', 'science'], match: /\blogarithm/i },
  { term: 'simultaneous equations', in: ['mathematics', 'science'], match: /\bsimultaneous\b/i },
  { term: 'scientific notation', in: ['mathematics', 'science'], match: /\bscientific notation\b/i },
  { term: 'significant figures', in: ['mathematics', 'science'], match: /\bsignificant figures\b/i },
  { term: 'gradient', in: ['mathematics', 'science'], match: /\b(gradient|slope)\b/i },
  { term: 'close reading', in: ['english', 'science'], match: /\b(close reading|rereads?|annotates?)\b/i },
  { term: 'a thesis', in: ['english', 'science'], match: /\bthesis\b/i },
  { term: 'evidence', in: ['english', 'science'], match: /\bevidence\b/i },
];

export const familyOf = (id) => (id.startsWith('mathematics') ? 'mathematics' : id.startsWith('english') ? 'english' : 'science');
const firstYear = (years) => (years.length ? Math.min(...years) : Infinity);

// `maps` are validated map objects. `onPath(laterId, earlierId)` says whether a later map may build on an earlier one.
// `existing` is a set of "tree:key tree:key" pairs already linked (either direction is skipped).
export function proposeLinks(maps, onPath, existing = new Set()) {
  const concepts = [];
  for (const map of maps) {
    const index = indexMap(map);
    for (const s of map.skills) {
      const years = skillYears(index, s.key);
      if (years.length) concepts.push({ id: `${map.id}:${s.key}`, tree: map.id, name: s.name, years });
    }
  }
  const linked = new Set(existing);
  const out = [];
  for (const entry of VOCABULARY) {
    const hits = concepts.filter((c) => entry.in.includes(familyOf(c.tree)) && entry.match.test(c.name) && !(entry.stop && entry.stop.test(c.name)));
    for (const later of hits) {
      for (const map of maps) {
        if (map.id === later.tree || !onPath(later.tree, map.id)) continue;
        const earlier = hits.filter((c) => c.tree === map.id && firstYear(c.years) <= firstYear(later.years));
        if (!earlier.length) continue;
        const nearest = Math.max(...earlier.map((c) => firstYear(c.years)));
        const pick = earlier.find((c) => firstYear(c.years) === nearest);
        const sameFamily = familyOf(later.tree) === familyOf(pick.tree);
        const type = sameFamily ? 'builds-on' : nearest === firstYear(later.years) ? 'connects-to' : 'uses';
        const key = `${later.id} ${pick.id}`;
        if (linked.has(key)) continue;
        linked.add(key); linked.add(`${pick.id} ${later.id}`);
        out.push({ from: later.id, to: pick.id, type, why: `Both concepts use ${entry.term}.`, review: { state: 'draft' } });
      }
    }
  }
  return out;
}
