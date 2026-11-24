# Architecture

A learning map is data first. Everything else reads it.

```
 curriculum source (e.g. ACARA)      your own sequence
          |                               |
   scripts/ importer  ------------>  data/maps/<id>.json   (strands > topics > skills, prereqs)
                                          |
                                   src/validate.mjs        (keys, links, no cycles)
                                          |
                                   src/loader.mjs          (load + allPrerequisites)
                                          |
                                   src/model.mjs           (index, selections, columns, search)
                                          |
                          your renderer / app / progress tracker
```

Across maps: `src/cross-links.mjs` proposes links between two maps as drafts. A person reviews each one.

## Layers

1. **Data.** One JSON file per subject or course. A skill is one thing a learner can do. `prereqs` is the learning order. Format: `docs/FORMAT.md`.
2. **Validation.** `src/validate.mjs`. Unique keys, existing parents, no dangling or cyclic prerequisites. Run `npm run validate`.
3. **Model.** `src/model.mjs`, pure functions with no rendering or storage:
   - `indexMap`: lookups, source order, dependents.
   - `selectYear` / `selectConcept`: the skills to show, plus faded "foundation" prerequisites from outside the selection, plus edges. A concept selection is the skill and everything it builds on.
   - `sequenceColumns`: column 0 is foundations; a skill sits one column after its latest selected prerequisite.
   - `entryPoints`, `availableSkills`: where to start, and what is ready next given what is done.
   - `topicSequence`, `searchSkills`, `skillYears` (a skill's own years win over its topic's).
4. **Cross-map links.** `src/cross-links.mjs`. Concepts are named `map-id:skill-key`. Types: `builds-on`, `uses`, `connects-to`, `leads-to`. A proposal is a draft with a placeholder reason. It only runs along course paths you supply (a senior course may build on K-10, not the reverse).
5. **Your product.** Rendering, progress storage and lesson content are not part of this project. Feed `selectYear`/`selectConcept` output to any drawing library, and feed your own "done" set to `availableSkills`.

## Other settings

Nothing in the model is specific to schools. A university degree, a country's curriculum or a professional qualification fits the same format: skills, topics, strands and prerequisites. Cross-map links (`tree:key` on each side) let learners see how knowledge connects across disciplines and why a skill matters for what comes next.

## Design rules

- The map holds no learner data and no lesson text. Progress lives in your system, keyed by skill key.
- Source order breaks every tie, so output is stable between runs.
- A loop in the prerequisites is rejected at validation. The model also guards against it.
- Links between maps are reviewed by a person before they count.

## Not included

The EdDots website's drawing code, its lesson store and its progress storage stay private. They depend on product services. The model above is what they are built on.
