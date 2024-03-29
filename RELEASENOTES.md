# blue-button-record Release Notes

## v1.7.0 - July 14, 2022

- Refactor code to comply with version 6 of the Mongoose object modeler.
- MongoDB Node.js driver removed as direct dependency (db interaction now through Mongoose).
- Split README.md into separate docs

## v1.5.0 - June 15, 2015

- Patient entered medication API
- FHIR implementation support
- Additional history items

## v1.3.0 - Fenruary 11, 2014

- Added extra data models for new functionality of DRE UI (account history)

## v1.2.0 - December 12, 2014

- Blocking/Filtering for Patient Identification and Matching
- Calculation of blockers on database level (in demographics section)

## v1.1.0 - September 2, 2014

- Removed schema inheritance from blue button library.
- Introduced blue button meta library.
- Adapted to latest schema changes.

## v1.0.1 - July 21, 2014

Incremental patch, includes archived field for identifying archived stored files.

- If archived date present now returns in storage query.

## v1.0.0 - July 17, 2014

Implement first release notes and bump version to consistency with dependent package.

- Patient ID query security improvements.
- Route extensions for file storage flagging.
- Removal of parital route.
