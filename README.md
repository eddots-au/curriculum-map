# curriculum-map

An open model for learning maps. A learning map breaks a curriculum into small skills, groups them into topics and strands, and records which skills a learner needs first. This repo holds the model, a validator and loader, and the maps EdDots built for Australian schools, so other countries and education systems can adopt the model with their own curriculum.

## Beyond school curricula

The method is not tied to schools. Any body of knowledge that can be broken into small skills with "you need this first" links can be mapped this way: a university degree, a unit or program, a professional qualification, another country's curriculum. Maps can also link to each other, so a learner can see how ideas connect across disciplines (for example, how a mathematics skill is used in physics), why they are learning something, and where it leads. EdDots has only built and tested school maps so far. Use in other settings is the intended direction, not something this release proves, and we would like to hear from people who try it.

Status: v0.1.0, early. EdDots is proving the model for Australian contexts first (NSW syllabus sequences, mapped to Australian Curriculum v9 outcome codes). The format may change as other contexts try it. Contributions and critique are welcome.

## What is here

- `data/maps/`: seven learning maps (Mathematics K-10, English K-10, Mathematics Advanced, Standard, Extension 1 and 2 for Years 11-12, English Advanced). About 950 skills with prerequisite links. See `data/maps/index.json`.
- `docs/FORMAT.md`: the map format and how to add your own curriculum.
- `src/`: `validateMap` (structure, duplicate keys, dangling prerequisites, cycles), `learningOrder`, `loadMap`, `allPrerequisites`, and a command line check.
- `data/australian-curriculum/` and `scripts/`: an importer that reads the official Australian Curriculum v9 machine-readable metadata (ACARA, CC BY 4.0).
- `proposals/cross-links.proposed.json`: suggested links between concepts in different maps. These are proposals that nobody has reviewed yet. Reviewing them is a good first contribution.
- `examples/minimal-curriculum.json`: a tiny invented example of the format.

## Use it

```sh
npm test                       # runs the validator tests and the ACARA parser checks
node src/cli.mjs data/maps     # validates every shipped map
node src/cli.mjs your-map.json # validates yours
```

```js
import { loadMap, allPrerequisites } from './src/loader.mjs';
import { learningOrder } from './src/validate.mjs';
const map = await loadMap('data/maps/mathematics-k10.json');
console.log(learningOrder(map).slice(0, 5));
console.log(allPrerequisites(map, 'na-equiv-fractions'));
```

## Adapting it to another country

Write one JSON file per subject following `docs/FORMAT.md`, run the validator, and open a pull request. You do not need the Australian data. If your curriculum is published as machine-readable data, add an importer under `scripts/`, as `curriculum-import.mjs` does for Australia.

## What this is not

The maps record sequence: what comes before what. They do not claim that any lesson, assessment or product covers an outcome, and they are not an official crosswalk between jurisdictions.

## Licences

- Code: Apache License 2.0 (`LICENSE`).
- EdDots-authored data (`data/maps/`, `proposals/`): CC BY 4.0, see `DATA-LICENSE.md`.
- Australian Curriculum metadata is (c) ACARA, used under CC BY 4.0. See `NOTICE` and `data/australian-curriculum/README.md`. This project is not endorsed by ACARA.


## Architecture and code

See `docs/ARCHITECTURE.md`. `src/model.mjs` selects a year or concept, orders skills into columns, finds entry points and what is ready next. `src/cross-links.mjs` proposes links between maps.
