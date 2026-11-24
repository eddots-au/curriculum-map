// Validates one learning map: structure, unique keys, dangling and cyclic prerequisites.
const need = (cond, msg, problems) => { if (!cond) problems.push(msg); };

export function validateMap(map) {
  const problems = [];
  need(map && typeof map === 'object', 'map must be an object', problems);
  if (problems.length) return problems;
  for (const f of ['id', 'name', 'strands', 'topics', 'skills']) need(f in map, `missing field: ${f}`, problems);
  if (problems.length) return problems;

  const strands = new Set(), topics = new Set(), skills = new Map();
  for (const s of map.strands) {
    need(typeof s.key === 'string' && s.key, 'strand without key', problems);
    need(!strands.has(s.key), `duplicate strand: ${s.key}`, problems);
    strands.add(s.key);
  }
  for (const t of map.topics) {
    need(!topics.has(t.key), `duplicate topic: ${t.key}`, problems);
    need(strands.has(t.strand), `topic ${t.key} names unknown strand ${t.strand}`, problems);
    topics.add(t.key);
  }
  for (const s of map.skills) {
    need(!skills.has(s.key), `duplicate skill: ${s.key}`, problems);
    need(topics.has(s.topic), `skill ${s.key} names unknown topic ${s.topic}`, problems);
    need(Array.isArray(s.prereqs), `skill ${s.key} has no prereqs array`, problems);
    skills.set(s.key, s);
  }
  for (const s of map.skills) {
    for (const p of s.prereqs || []) {
      need(skills.has(p), `dangling prerequisite: ${s.key} needs ${p}`, problems);
      need(p !== s.key, `skill ${s.key} is its own prerequisite`, problems);
    }
  }
  const cycle = findCycle(skills);
  if (cycle) problems.push(`prerequisite cycle: ${cycle.join(' -> ')}`);
  return problems;
}

export function findCycle(skills) {
  const state = new Map(); // 1 = visiting, 2 = done
  const stack = [];
  const visit = (key) => {
    if (state.get(key) === 2) return null;
    if (state.get(key) === 1) return [...stack.slice(stack.indexOf(key)), key];
    state.set(key, 1); stack.push(key);
    for (const p of skills.get(key)?.prereqs || []) {
      if (!skills.has(p)) continue;
      const found = visit(p);
      if (found) return found;
    }
    stack.pop(); state.set(key, 2);
    return null;
  };
  for (const key of skills.keys()) { const found = visit(key); if (found) return found; }
  return null;
}

// A valid learning order: every skill after its prerequisites. Returns null if a cycle exists.
export function learningOrder(map) {
  const skills = new Map(map.skills.map((s) => [s.key, s]));
  if (findCycle(skills)) return null;
  const done = new Set(), order = [];
  const add = (key) => {
    if (done.has(key)) return;
    done.add(key);
    for (const p of skills.get(key)?.prereqs || []) add(p);
    order.push(key);
  };
  for (const key of skills.keys()) add(key);
  return order;
}
