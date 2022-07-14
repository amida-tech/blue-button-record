Blue Button Record
======================

Master Health Record and Data Reconciliation Engine Persistance Layer (MongoDB)

[![NPM](https://nodei.co/npm/@amida-tech/blue-button-record.png)](https://nodei.co/npm/@amida-tech/blue-button-record/)

## Overview

blue-button-record is a module to persist patient health data.  It is primarily designed to support [blue-button](https://github.com/amida-tech/blue-button) data model however there is no specific schema dependence and other models can also be [used](./API.md#connectdatabaseserver-options-callback).  This module provides the following functionality:

- Persist the Master Health Record (blue-button data) per patient:  The Master Health Record contains all historical data about a patient's health.  It is organized in sections such as Allergies and Medications, and the blue-button-record API is based on this sectional organization.  Each section is further organized into a set of entries even when there is only one entry, as in the Demographics section.
- Persist all sources of Master Health Record:  Currently text and xml files are supported.  Source content as well as various metadata such as name and upload time are stored.  Each entry in the Master Health Record is linked to a source.    
- Persist Merge History:  Since blue-button data is historical, entries in Master Health Record are expected to appear in multiple sources.  Merge History keeps track of all the sources from which entries are created or updated. It is also possible to register sources for new entries that are duplicates of elements in the Master Health Record (duplicates). 
- Persist Match List:  This module also stores a second set of entries seperate from Master Health Record called Match List.  Match List is designed to store entries that are similar to existing entries in Master Health Record but cannot be identified as duplicate or seperate and thus require further review.  Both the Match List entries, Master Health Record entries that the Match List entries match, and match details are stored.  Match List entries are eventually either added to Master Health Record or removed; blue-button-record API provides methods for both.

This implementation of blue-button-record uses [MongoDB](https://www.mongodb.com).

## Further Reading

* [Usage Examples](./USAGE.md)
* [API Documentation](./API.md)
* [Model Schemas](./SCHEMA.md)

## Contributing

Contributors are welcome. See [issues](https://github.com/amida-tech/blue-button-record/issues).

## Release Notes

See release notes [here](./RELEASENOTES.md).

## License

Licensed under [Apache 2.0](./LICENSE)