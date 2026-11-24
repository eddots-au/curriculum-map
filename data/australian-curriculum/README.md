# Australian Curriculum source index

This directory contains an official Version 9 curriculum metadata snapshot. It does not establish that any lessons cover those outcomes, that assessments measure them, or that a state or territory syllabus is equivalent.

The [ACARA machine-readable curriculum page](https://www.australiancurriculum.edu.au/machine-readable-australian-curriculum) links to the [Scootle Version 9 source index](https://www.scootle.edu.au/ec/p/mrac_details). The eight learning-area JSON-LD links were verified on 8 September 2026. `sources.json` records those exact URLs; `v9/manifest.json` records retrieval times and SHA-256 digests. The archived JSON-LD files are compressed without changes to their content. Their hyperlinks are identifiers only; the importer does not download linked photographs, videos, logos or teacher resources.

The extracted taxonomies preserve official outcome codes, subjects, year bands, strands, sequences and pathways. Descriptions have presentational HTML removed. Year bands come from the explicit curriculum hierarchy. A nominal starting year is retained separately because it does not describe every year in a band. The source uses some unusual Languages code forms; these are preserved and flagged for editorial review.

No automatic interstate crosswalk, prerequisite relationship or curriculum coverage claim is generated. `v9/coverage.json` explicitly reports zero verified lesson mappings and keeps publication readiness false. Senior secondary, adult, life-skill and sport-specific programmes require their own sources and validated learning content; the F–10 source index does not establish that coverage.

## Commands

```sh
node scripts/curriculum-import.mjs --fetch
node scripts/curriculum-import.mjs --validate
npm test
```

`--fetch` reads only the approved public JSON-LD sources, validates every area and then updates generated files. It does not change lessons, create mappings or publish content. `--validate` works offline once `--fetch` has archived the sources (the archive is not committed here): it checks archived source digests, repeats the extraction, compares taxonomy digests and verifies the honest coverage declaration. Retrieval is manual; there is no background sync. Review source updates before deploying the index or using its outcomes to align lessons.

## Attribution and use

© Australian Curriculum, Assessment and Reporting Authority (ACARA) 2010 to present, unless otherwise indicated.

The source curriculum metadata was accessed through the Australian Curriculum website's official machine-readable download index on 8 September 2026. The archived source is unchanged. The extracted index has been modified as described above. Curriculum material is used under the [Creative Commons Attribution 4.0 International licence](https://creativecommons.org/licenses/by/4.0/), subject to [ACARA's copyright and terms of use](https://www.australiancurriculum.edu.au/copyright-and-terms-of-use).

This project is not endorsed by, sponsored by or affiliated with ACARA. Users should assess the version and any claimed alignment against official content descriptions and achievement standards. Importing an elaboration or code alone would not establish alignment. When this index is later displayed in an application or exported to a device, show its source, modification notice, version and retrieval date, explain the update process and retain the attribution. Excluded teacher resources and separately licensed literacy learning progressions are outside this import.

