# Learning map format (schema 1)

One JSON file per subject or course.

```json
{
  "schema": 1,
  "id": "mathematics-k10",
  "name": "Mathematics K-10",
  "treeVersion": 5,
  "note": "Where the sequence comes from.",
  "stageYears": { "Stage 1": [1, 2] },
  "strands":  [{ "key": "number-algebra", "name": "Number and algebra" }],
  "topics":   [{ "key": "early-number", "name": "Early number sense", "strand": "number-algebra", "stage": "Early Stage 1", "years": [0] }],
  "skills":   [{ "key": "na-count-20", "name": "Counts forwards and backwards to 20", "topic": "early-number", "prereqs": [] }]
}
```

Rules checked by `node src/cli.mjs`:

- Keys are unique within their list. Use short lowercase ids.
- Every topic names an existing strand. Every skill names an existing topic.
- `prereqs` lists skill keys from the same map that a learner needs first.
- No skill is its own prerequisite, no prerequisite is missing, and prerequisites do not loop.

Guidance for new curricula:

- Write a skill as one thing a learner can do ("Adds numbers within 20"), small enough to teach and check on its own.
- Put your own sequence in `prereqs`. Do not copy another country's wording. Cite your curriculum's code or link in `note`.
- `stage` and `years` are free labels, use your system's own.
- Links between different maps live in separate files (see `proposals/cross-links.proposed.json`): `tree:key` on each side, with a type (`builds-on`, `uses`, `connects-to`, `leads-to`) and a short reason.
