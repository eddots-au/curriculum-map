// The learning-map model: indexing, selections (a year or a concept), sequence columns,
// entry points, what is ready to study next, topic grouping and search.
// Pure functions over a validated map (docs/FORMAT.md). No rendering, no network, no storage.

export function indexMap(data) {
  const skills = new Map(data.skills.map((s) => [s.key, s]));
  const dependents = new Map();
  for (const s of data.skills) {
    for (const pre of s.prereqs) {
      if (!skills.has(pre)) continue;
      if (dependents.has(pre)) dependents.get(pre).push(s.key); else dependents.set(pre, [s.key]);
    }
  }
  return {
    data,
    skills,
    topics: new Map(data.topics.map((t) => [t.key, t])),
    strandOrder: new Map(data.strands.map((s, i) => [s.key, i])),
    topicOrder: new Map(data.topics.map((t, i) => [t.key, i])),
    order: new Map(data.skills.map((s, i) => [s.key, i])), // source position: the tie-breaker everywhere
    dependents,
  };
}

// A skill's own `years` wins over its topic's years.
export function skillYears(index, key) {
  const s = index.skills.get(key);
  if (!s) return [];
  return s.years ?? index.topics.get(s.topic)?.years ?? [];
}

export function subjectYears(index) {
  const years = new Set();
  for (const s of index.data.skills) for (const y of skillYears(index, s.key)) years.add(y);
  return [...years].sort((a, b) => a - b);
}

const sourceSort = (index, keys) => [...keys].sort((a, b) => (index.order.get(a) ?? 0) - (index.order.get(b) ?? 0));

function withLinks(index, scope, chosen, focus) {
  const skills = sourceSort(index, chosen);
  const outside = new Set();
  const edges = [];
  for (const key of skills) {
    for (const pre of index.skills.get(key)?.prereqs ?? []) {
      if (!index.skills.has(pre)) continue;
      if (!chosen.has(pre)) outside.add(pre);
      edges.push([pre, key]);
    }
  }
  return { scope, skills, foundations: sourceSort(index, outside), edges, focus };
}

// A year: its skills plus their direct prerequisites from outside it (foundations).
export function selectYear(index, year) {
  const chosen = new Set(index.data.skills.filter((s) => skillYears(index, s.key).includes(year)).map((s) => s.key));
  return withLinks(index, { kind: 'year', year }, chosen, null);
}

// A concept: the skill and the whole chain of skills it builds on.
export function selectConcept(index, key) {
  const chosen = new Set();
  const stack = index.skills.has(key) ? [key] : [];
  while (stack.length) {
    const next = stack.pop();
    if (chosen.has(next)) continue;
    chosen.add(next);
    for (const pre of index.skills.get(next)?.prereqs ?? []) if (index.skills.has(pre) && !chosen.has(pre)) stack.push(pre);
  }
  return withLinks(index, { kind: 'concept', skill: key }, chosen, index.skills.has(key) ? key : null);
}

const innerPrereqs = (index, selected, key) => (index.skills.get(key)?.prereqs ?? []).filter((p) => selected.has(p));

// Foundations are column 0; a selected skill sits one column after its latest selected prerequisite.
export function sequenceColumns(index, selection) {
  const selected = new Set(selection.skills);
  const columns = new Map();
  for (const key of selection.foundations) columns.set(key, 0);
  const visit = (key, guard) => {
    if (columns.has(key)) return columns.get(key);
    if (guard.has(key)) return 1; // loops are rejected by the validator; never recurse forever
    guard.add(key);
    const column = 1 + Math.max(0, ...innerPrereqs(index, selected, key).map((p) => visit(p, guard)));
    guard.delete(key);
    columns.set(key, column);
    return column;
  };
  for (const key of selection.skills) visit(key, new Set());
  return columns;
}

// The first skills to study: selected skills with no selected prerequisite.
export function entryPoints(index, selection) {
  const selected = new Set(selection.skills);
  return selection.skills.filter((k) => innerPrereqs(index, selected, k).length === 0);
}

// Ready next: not yet done, every selected prerequisite done. Foundations count as known.
export function availableSkills(index, selection, done) {
  const selected = new Set(selection.skills);
  return selection.skills.filter((k) => !done.has(k) && innerPrereqs(index, selected, k).every((p) => done.has(p)));
}

// Topic groups in syllabus order; each topic's skills in sequence order.
export function topicSequence(index, selection, columns = sequenceColumns(index, selection)) {
  const groups = new Map();
  for (const key of selection.skills) {
    const topic = index.skills.get(key).topic;
    if (groups.has(topic)) groups.get(topic).push(key); else groups.set(topic, [key]);
  }
  const byPosition = (a, b) => (columns.get(a) - columns.get(b)) || ((index.order.get(a) ?? 0) - (index.order.get(b) ?? 0));
  return [...groups.entries()]
    .sort(([a], [b]) => (index.topicOrder.get(a) ?? 0) - (index.topicOrder.get(b) ?? 0))
    .map(([topic, skills]) => ({ topic: index.topics.get(topic), skills: skills.sort(byPosition) }));
}

// Words must all appear in the skill name; matches at a word start rank first.
export function searchSkills(index, query, limit = 8) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const scored = [];
  for (const s of index.data.skills) {
    const name = s.name.toLowerCase();
    if (!words.every((w) => name.includes(w))) continue;
    const first = name.indexOf(words[0]);
    scored.push([(first === 0 || name[first - 1] === ' ' ? 0 : 1) * 1000 + first, s]);
  }
  return scored.sort((a, b) => (a[0] - b[0]) || ((index.order.get(a[1].key) ?? 0) - (index.order.get(b[1].key) ?? 0)))
    .slice(0, limit).map(([, s]) => s);
}
