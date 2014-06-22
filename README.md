blue-button-record.js
==================

Master Health Record and Data Reconciliation Engine Persistance Layer (MongoDB)

[![NPM](https://nodei.co/npm/blue-button-record.png)](https://nodei.co/npm/blue-button-record/)

[![Build Status](https://travis-ci.org/amida-tech/blue-button-record.svg)](https://travis-ci.org/amida-tech/blue-button-record)
[![Coverage Status](https://coveralls.io/repos/amida-tech/blue-button-record/badge.png)](https://coveralls.io/r/amida-tech/blue-button-record)

## Library interfaces/APIs

This library provides following functionality

- Persist blue-button data with additional metadata
- Persist merge histories
- Persist merge candidates with match information
- Persist blue-button data source content and type

This implementation of blue-button-record uses MongoDB.

### Usage example

Require [blue-button](https://github.com/amida-tech/blue-button) and blue-button-record 
``` javascript
var bb = require("blue-button");
var bbr = require("blue-button-record");
```
blue-button-record assumes MongoDB is already running.  Connect to the database
``` javascript
bbr.connectDatabase('localhost', function(err)) {
  if (err) throw err;
}
```
Read a ccd file and convert it to JSON
``` javascript
var fs = require('fs');
var filepath  = '/tmp/demo.xml';
var xmlString = fs.readFileSync(filepath, 'utf-8');
var result = bb.parseString(xmlString);
var ccdJSON = result.data;
```
Persist the file in the database as a source of patient data, various properties is the responsibility the caller
``` javascript
var fileInfo = {
  filename: 'demo.xml',
  type: 'text/xml'
};
var fileId = null;
bbr.saveRecord('patientKey', xmlString, fileInfo, 'ccda', function(err, result) {
  fileId = result._id;
});
```
Methods are provided to access patient data source records as a list or individually
``` javascript
bbr.getRecordList('patientKey', function(err, results) {
  console.log(results.length);
});

bbr.getRecord(fileId, function(err, filename, content) {
  console.log(filename);  
});

bbr.recordCount('patientKey', function(err, count) {
  console.log(count);
});

```

You can persist all the [blue-button](https://github.com/amida-tech/blue-button) sections as a whole
``` javascript
bbr.saveAllSections('patientKey', ccdJSON, fileId, function(err) {
  if (err) throw err;
});
```
or individually
``` javascript
bbr.saveSection('allergies', 'patientKey', ccdJSON.allergies, fileId, function(err) {
  if (err) throw err;
});
```
By default all sections supported by [blue-button](https://github.com/amida-tech/blue-button) are also supported by blue-button-record.  Currently these are demographics (ccda header), allergies, procedures, vitals, medications, results, encounters, immunizations and socialHistory. 

You can get the whole patient record back

``` javascript
bbr.getAllSections('patientKey',function(err) {
  if (err) throw err;
});
```
or get any section individually
``` javascript
var id = null;
bbr.getSection('allergies', 'patientKey', function(err, allergies) {
  if (err) throw err;
  id = allergies[0]._id;
});

```
In addition to [blue-button](https://github.com/amida-tech/blue-button) data, each entry also includes metadata and property '_id" which you can later use to access and update
``` javascript
var allergy = null;
bbr.getEntry('allergies', id, function(err, result) {
  allergy = result;
});

bbr.updateEntry('allergies', id, {severity: 'Severe'}, fileId, function(err) {
  if (err) throw(err);
};
```
You can clean up metadata and other non blue-button data 
``` javascript
var allergiesBBOnly = bbr.cleanSectionEntries(allergies);
```
which makes allergiesBBOnly comparable to ccdJSON.allergies.

Metadata property provides the source of the data as the "merge history"
``` javascript
var attribution = allergy.metadata.attribution;
console.log(attribution[0].merge_reason); // merge history starts with 'new'
console.log(attribution[0].record);    // fileId
```
Once you persists a new entry (saveSection) merge history will be initiated with merge_reason: 'new'.  Each update (updateEntry) also contributes to merge history
``` javascript
console.log(attribution[1].merge_reason); // 'update'
```
In addition to 'new' and 'update', another source can be persisted in merge history to have the duplicate of an existing entry
``` javascript
bbr.duplicateEntry('allergies', id, fileId, function(err) {
  if (err) throw err;
});

console.log(attribution[2].merge_reason); // 'duplicate'
```

Whole merge history for a patient is available
``` javascript
bbr.getMerges('allergies', 'patientKey', 'name severity', 'filename uploadDate', function(err, mergeList) {
  console.log(mergeList.length);
  var explMerge = mergeList[0];
});
```
where you can specify blue-button health data fields like allergy name or severity and record fields like filename or uploadDate
``` javascript
console.log(explMerge.merge_reason);
console.log(explMerge.entry.name);
console.log(explMerge.entry.severity);
console.log(explMerge.record.filename);
console.log(explMerge.record.uploadDate);
```
You can count merge history entries with various conditions
``` javascript
bbr.mergeCount('allergies', 'patientKey', {}, function(err, count) {
  console.log(count);
});

bbr.mergeCount('allergies', 'patientKey', {merge_reason: 'new'}, function(err, count) {
  console.log(count);
});

bbr.mergeCount('allergies', 'patientKey', {merge_reason: 'duplicate'}, function(err, count) {
  console.log(count);
});
```

blue-button-record also stores 'partial entries' which cannot immediately become part of the master health record since they are similar enough to existing entries but not identical to become duplicates.  In addition to blue-button health data, partial records also include a pointer to the existing entry and match information
``` javascript
var partialAllergy = {
  partial_entry: allergy,
  match_record: id,
  partial_match: {
    diff: {severity: 'new'},
    percent: 80,
    subelements: []
  }
};
```
By default match information is assumed to have three fields: diff, subelements, and percent.  diff and sublements can be of any object and percent must be a number.  This default is to accomodate match information available from [blue-button-match](https://github.com/amida-tech/blue-button-match).  

Partial entries are persisted as sections
``` javascript
bbr.savePartialSection('allergies', 'patientKey', partialAllergies, fileId, function(err) {
  if (err) throw err;
});
```
blue-button health data piece of partial entries are available similarly to master health record sections
``` javascript
var partialId = null;
bbr.getPartialSection('allergies', 'patientKey', function(err, partialAllergies) {
  if (err) throw err;
  partialId = partialAllergies[0]._id;
});
```
the same data together with selected fields from the existing matching entry and the match information is available as a list
``` javascript
bbr.getMatches('allergies', 'patientKey', 'name severity', function(err, matches) {
  if (err) throw err;
  var match = mathches[0];
  console.log(match.entry.name);           // existing
  console.log(match.entry.severity);
  console.log(match.match_entry.name);     // partial
  console.log(match.match_entry.severity);
  console.log(match.diff.severity);           // match information  
  console.log(match.percent);
  var matchId = match._id;
});
```
Individual match access is also available and will return the full blue-button data both for the existing entries and the partial entries
``` javascript
bbr.getMatch('allergies', matchId, function(err, match) {
  if (err) throw err;
  console.log(match.entry.name);           // existing
  console.log(match.entry.status);
  console.log(match.match_entry.name);     // partial
  console.log(match.match_entry.status);
  console.log(match.diff.severity);           // match information  
  console.log(match.percent);
});
```
Only count of matches can be accessed instead of full list
``` javascript
bbr.matchCount('allergies', 'patientKey', {}, function(err, count) {
  console.log(count);
});

bbr.matchCount('allergies', 'patientKey', {percent: 90}, function(err, count) {
  console.log(count);
});
```

Matches can be canceled either outright or after contributing some fields to the existing entry
``` javascript
bbr.cancelMatch('allergies', matchId, 'ignored', function(err, count) {
  console.log(count);
});

bbr.cancelMatch('allergies', matchId, 'merged', function(err, count) {
  console.log(count);
});

```
or they can be accepted and become part of the master health record.
``` javascript
bbr.acceptMatch('allergies', matchId, 'added', function(err, count) {
  console.log(count);
});
```

## API
<a name="connectDatabase" />
### connectDatabase(server, options, callback)

Connects to the database on `server`.  If called multiple times before [`disconnect`](#disconnect) is called, the subsequent calls are silently ignored.

__Arguments__

* `server` - The server that hosts the database.  Port number can also be included.
* `options` - Optional configuration options for the database.  The following properties are supported.  All of them are optional.
  * `dbName` - Name for the database.  Defaults to `dre`.
  * `schemas` - Schemas to use for patient data.  This is a JSON object with leaf values describe the type of the data to be stored.  It describes patient data in sections and the top properties are used as the section names throughout the other API methods.  Hierarchy of the JSON object describes the hierarchy of the patient data and one element arrays are used to describe array of patient data.  Defaults to `ccd` schema available from [blue-button](https://github.com/amida-tech/blue-button).  Arrays are not supported for top values and silently converted to their first elements.  Leaf node types can be `"string"`, `"datetime"`, `"number"`, `"boolean"`, and `"any"`.  All but `"any"` corresponds to Javascript types.  `"any"` can be used to accept any data.
  * `matchFields` - Schema to describe matching information between two versions of patient section data.  It is a JSON object similar to `schemas` in structure.  Defaults to `{percent: 'number', diff: 'any', subelements: 'any'}` to support [blue-button-match](https://github.com/amida-tech/blue-button-match).   
* `callback(err)` - A callback which is called when connection is established, or an error occurs.

__Examples__

```js
var options = {
  dbName: 'test',
  schemas = {
    allergies: {
      name: 'string',
      severity: 'string',
      value: {
        code: 'string', 
        display: 'string'
      }
    },
    procedures : {
      name: 'string',
      proc_type: 'string',
      proc_value: {
        code: 'string',
        display: 'string'
      }
  },
  matchFields: {
    percent: 'number',
    subelements: 'any'
  }
};
```

```js
var bbr = require('blue-button-record');
bbr.connectDatabase('localhost', options, function(err) {
  if (err) {
    console.log('connection has failed.');
  } else {
    console.log('connection established.');
  }
});
```
---------------------------------------

<a name="disconnect" />
### disconnect(callback)

Disconnects from the previously connected database using [`connectDatabase`](#connectDatabase).  If there is no existing connection the call is silently ignored.

__Arguments__
* `callback(err)` - A callback which is called when disconnection is succesfull, or an error occurs.

__Examples__

```js
bbr.disconnect(function(err) {
  if (err) {
    console.log('disconnection has failed.');
  } else {
    console.log('connection established.');
  }
});
```
---------------------------------------

### clearDatabase(callback)

Clears all data in the database.  Included to assist testing infrastructures.  If there is no existing connection the call is silently ignored.

__Arguments__
* `callback(err)` - A callback which is called when all data is removed, or an error occurs.

__Examples__

```js
bbr.clearDatabase(function(err) {
  if (err) {
    console.log('unable to clear the database.');
  } else {
    console.log('database has been cleared.');
  }
});
```
---------------------------------------

### saveRecord(ptKey, content, sourceInfo, contentType, callback)

Saves a source of patient data in the database.  Currently only text files are supported.

__Arguments__
* `ptKey` - Identification string for the patient.
* `content` - Content of the source.  `content` is a javascript string that is 'utf8' encoded before being saved to the database.
* `sourceInfo`- Additional information about the source.  Following properties are supported
  * `name`- Name of the source.
  * `type`- MIME type of the source.
* `contentType` - Content type of the source.   
* `callback(err, id)` - A callback which is called when all data is removed, or an error occurs.  `id` is the database assigned identifier for the saved record. 

__Examples__

```js
bbr.saveRecord('testPatient', 'example content', {type: 'text/xml', name: 'expl.xml'}, 'ccda', function(err, id) {
  var fileId = null;
  if (err) {
    console.log('cannot save.');
  } else {
    fileId = id;
  }
});
```
---------------------------------------

### getRecordList(ptKey, callback)

Gets all the sources of patient data in the database.

__Arguments__
* `ptKey` - Identification string for the patient.
* `callback(err, infos)` - A callback which is called `info` is returned, or an error occurs.  `infos` is an array with each element containing the following information:
  * file_id - Database assigned identifier for the file.
  * file_name - Name of the file.
  * file_size - Size of the file.
  * file_mime_type - MIME type of the file. 
  * file_upload_date - Upload instance of the file.
  * file_class - Content type of the file.

__Examples__

```js
bbr.getRecordList('testPatient', function(err, infos) {
  if (err) {
    console.log('error getting the list.');
  } else {
    var info = infos[0];
    console.log(info.file_name);       // 'expl.xml'
    console.log(info.file_mime_type);  // 'text/xml'
    console.log(info.file_class);      // 'ccda'
  }
});
```
---------------------------------------

### getRecord(sourceId, callback)

Gets name and content of the patient data source.

__Arguments__
* `sourceId - Database identification string of the source.
* `callback(err, filename, content)` - A callback which is called when source information is retrieved, or an error occurs. 

__Examples__

```js
bbr.getRecord(fileId, function(err, filename, content) {
  if (err) {
    console.log('error getting the file informations.');
  } else {
    var info = infos[0];
    console.log(filename);  // 'expl.xml'
    console.log(content);   // 'example content'
  }
});
```
---------------------------------------

### recordCount(ptKey, callback)

Gets the number of sources in the database for the patient.

__Arguments__
* `ptKey` - Identification string for the patient.
* `callback(err, count)` - A callback which is called when source `count` is retrieved, or an error occurs. 

__Examples__

```js
bbr.getCount('testPatient', function(err, count) {
  if (err) {
    console.log('error getting the count.');
  } else {
    console.log(count);  // 1
  }
});
```
---------------------------------------

### saveSection(secName, ptKey, inputSection, sourceId, callback)

Save section entries for the patient.

__Arguments__
* `secName` - Section name.
* `ptKey` - Identification string for the patient.
* `inputSection` - An array of entries with schema as specified in [`connectDatabase`](#connectDatabase).
* `sourceId` - Id for the source where the `inputSection` is located. 
* `callback(err, ids)` - A callback which is called when saving entries is succesfull, or an error occurs.  `ids` are database assigned identifier for each entry in the order in `inputSection`.

__Examples__

```js
var inputSection = [{
    name: 'allergy1',
    severity: 'severity1',
    value: {
      code: 'code1', 
      display: 'display1'
    } 
  }, {
    name: 'allergy2',
    severity: 'severity2',
    value: {
      code: 'code2', 
      display: 'display2'
  }
];
var aid1 = null;
var aid2 = null;
bbr.saveSection('allergies', testPatient', inputSection, fileId, function(err, ids) {
  if (err) {
    console.log('error saving the section.');
  } else {
    aid1 = ids[0];
    aid2 = ids[1];
  }
});
```
---------------------------------------

<a name="getSection" />
### getSection(secName, ptKey, callback)

Gets section entries for the patient.

__Arguments__
* `secName` - Section name.
* `ptKey` - Identification string for the patient.
* `callback(err, entries)` - A callback which is called when entries are retrieved, or an error occurs.  Each entry in `entries` array contains the data specified in section schema.  In addition the following properties exists:
  * `_id` - Database assigned identifier for the entry.
  * `metadata.attribution` - This is an array that keeps track of changes for the entry with the following properties
    * `merged` - The instant the change to the entry.
    * `merge_reason` - This is the reason of the change.  Can be 'new', 'duplicate', or 'update'.
    * `record._id` - Source identifier.
    * `record.filename` - Name of the source file.

__Examples__

```js
bbr.getSection('allergies', 'testPatient', function(err, entries) {
  if (err) {
    console.log('error retrieving the section.');
  } else {
    console.log(entries[0].name);                                 // 'allergy1'
    console.log(entries[0].metadata.attribution[0].merge_reason); // 'new'
    console.log(entries[0].metadata.attribution[0].record._id);   // fileId
  }
});
```
---------------------------------------

### saveAllSections(ptKey, ptRecord, sourceId, callback)

Save section entries for the patient.

__Arguments__
* `ptKey` - Identification string for the patient.
* `ptRecord` - Multiple sections keyed with section names and an array of entries with schema as specified in [`connectDatabase`](#connectDatabase).
* `sourceId` - Id for the source where the `ptRecord` is located. 
* `callback(err, ids)` - A callback which is called when saving sections is succesfull, or an error occurs.  `ids` are array of arrays of database assigned identifier for each section and entries in the section.  Section order is in section name alphabetical.

__Examples__

```js
var ptRecord = {
  allergies = [
    {
      name: 'allergy1',
      severity: 'severity1',
    }, {
      name: 'allergy2',
      severity: 'severity2',
    }
  ],
  procedures = [
    {
      name: 'procedure1',
      proc_type: 'proc_type1',
    }
  ]
};
bbr.saveAllSections('allergies', testPatient2', ptRecord, fileId, function(err, ids) {
  if (err) {
    console.log('error saving the patient data.');
  } else {
    console.log(ids[0][0]);  // Id for allergy named 'allergy1'.
    console.log(ids[0][1]);  // Id for allergy named 'allergy2'.
    console.log(ids[1][0]);  // Id for procedure named 'procedure1'.
  }
});
```
---------------------------------------

### getAllSections(ptKey, callback)

Save section entries for the patient.

__Arguments__
* `ptKey` - Identification string for the patient.
* `callback(err, ptRecord)` - A callback which is called when sections are retrieved, or an error occurs.  `ptRecord` contains all the sections and entries of the patient data with top properties are the section names.  For each section entries are identical to `getSection`](#getSection) in content.

__Examples__

```js
bbr.getAllSections('testPatient2', function(err, ptRecord) {
  if (err) {
    console.log('error retreiving patient data.');
  } else {
    console.log(ptRecord.allergies[0].name);  // 'allergy1'.
    console.log(ptRecord.allergies[1].name);  // 'allergy2'.
    console.log(ptRecord.procedures[0].name); // 'procedure1'
  }
});
```
---------------------------------------

### getEntry(secName, id, callback)

Gets an entry of from section `secName`.

__Arguments__
* `secName` - Section name.
* `id` - Database identifier for the entry.
* `callback(err, entry)` - A callback which is called when entry is retrieved, or an error occurs.  `entry` fields are identical to `getSection`](#getSection) in content.

__Examples__

```js
bbr.getEntry('allergies', aid1, function(err, entry) {
  if (err) {
    console.log('error retrieving entry.');
  } else {
    console.log(entry.name);    // 'allergy1'
    console.log(entry.severity; // 'severity1'
  }
});
```
---------------------------------------

### duplicateEntry(secName, id, sourceId, callback)

Registers `sourceId` to include the duplicate of the entry with `id`..

__Arguments__
* `secName` - Section name.
* `id` - Database identifier for the entry.
* `sourceId` - Id for the source where the `ptRecord` is located. 
* `callback(err)` - A callback which is called when duplication information is saved, or an error occurs.

__Examples__

```js
bbr.duplicateEntry('allergies', aid1, fileId, function(err) {
  if (err) {
    console.log('cannot register sourceId.');
  } else {
    console.log('registered source to include duplicate.');
  }
});
```
---------------------------------------

### updateEntry(secName, id, sourceId, updateObject, callback)

Updates entry with the fields in `updateObject`.

__Arguments__
* `secName` - Section name.
* `id` - Database identifier for the entry.
* `sourceId` - Id for the source where the `ptRecord` is located.
* `updateObject` - JSON object with keys and values to update.
* `callback(err)` - A callback which is called when duplication information is saved, or an error occurs.

__Examples__

```js
bbr.updateEntry('allergies', aid1, fileId, {severity: 'severityUpdate'}, function(err) {
  if (err) {
    console.log('error updating the entry.');
  } else {
    console.log('severity is updated.');
  }
});
```
---------------------------------------

### getMerges(secName, ptKey, entryFields, recordFields, callback)

Retrieves all the changes to patient's health data for a particular section.

__Arguments__
* `secName` - Section name.
* `ptKey` - Identification string for the patient.
* `entryFields` - Fields for the changed entry to be returned.
* `recordFields` - Fields for the source r=to be returned.
* `callback(err, result)` - A callback which is called when all merges are retrieved, or an error occurs.  `result` is an array with the following properties:
  * `merged` - Instance when the change information is merged.
  * `merge_reason` - Reason how the entry changed. 'new' for when the entry is first created, 'duplicate' for when a source is registered to include a duplicate, and 'update' when entry is updated through `updateEntry`.
  * `entry` - Contains all the fields specified by `entryFields`.
  * `record` - Contains all the fields specified by `recordFiels`.

__Examples__

```js
bbr.getMerges('allergies', 'testPatient', 'severity', 'filename', function(err, result) {
  if (err) {
    console.log('error retreiving merge history.');
  } else { // order might differ
    console.log(result[0].entry.severity);  // 'severity1'
    console.log(result[0].record.filename); // 'expl.xml'
    console.log(result[0].merge_reason);    // 'new'
    console.log(result[1].entry.severity);  // 'severity1'
    console.log(result[1].record.filename); // 'expl.xml'
    console.log(result[1].merge_reason);    // 'duplicate'
    console.log(result[2].entry.severity);  // 'severityUpdate'
    console.log(result[2].record.filename); // 'expl.xml'
    console.log(result[2].merge_reason);    // 'update'
    console.log(result[3].entry.severity);  // 'severity2'
    console.log(result[3].record.filename); // 'expl.xml'
    console.log(result[3].merge_reason);    // 'new'
  }
});
```
---------------------------------------

### mergeCount(secName, ptKey, conditions, callback)

Number of records in merge entry.

__Arguments__
* `secName` - Section name.
* `ptKey` - Identification string for the patient.
* `conditions` - Condition specification.
* `callback(err, count)` - A callback when `count` is retrieved, or an error occurs.  `

__Examples__

```js
bbr.mergeCount('allergies', 'testPatient', {}, function(err, count) {
  if (err) {
    console.log('error retreiving count.');
  } else { // order might differ
    console.log(count);  // 4
  }

bbr.mergeCount('allergies', 'testPatient', {merge_reason: 'new'}, function(err, count) {
  if (err) {
    console.log('error retreiving count.');
  } else { // order might differ
    console.log(count);  // 2
  }  
});
```
---------------------------------------

### savePartialSection(secName, ptKey, inputSection, sourceId, callback)

Saves partial entries for the patient.

__Arguments__
* `secName` - Section name.
* `ptKey` - Identification string for the patient.
* `inputSection` - An array of partial entries and match information.  Each element in the array has three top level properties:
  ** partial_entry - Section entry with the schema as specified in [`connectDatabase`](#connectDatabase).
  ** partial_match - Match information with the schema as specified in [`connectDatabase`](#connectDatabase).
  ** match_entry_id - Id of the existing section entry which partial_entry matches.
* `sourceId` - Id for the source where the `inputSection` is located. 
* `callback(err, ids)` - A callback which is called when saving partial entries is succesfull, or an error occurs.  `ids` are database assigned identifier for each entry portion in the order in `inputSection`.

__Examples__

```js
var inputSection = [
  {
    partial_entry : {
      name: 'allergy1',
      severity: 'severity3',
      value: {
        code: 'code1', 
        display: 'display1'
      }
    },
    partial_match: {
      percent: 80,
      subelements = ['severity']
    },
    match_entry_id: aid1
  },
  {
    partial_entry : {
      name: 'allergy2',
      severity: 'severity2',
      value: {
        code: 'code5', 
        display: 'display2'
      }
    },
    partial_match: {
      percent: 90,
      subelements = ['value.code']
    },
    match_entry_id: aid2
  }
];
var paid1 = null;
var paid2 = null;
bbr.saveSection('allergies', testPatient', inputSection, fileId, function(err, ids) {
  if (err) {
    console.log('error saving the section.');
  } else {
    paid1 = ids[0];
    paid2 = ids[1];
  }
});
```
---------------------------------------

### getPartialSection(secName, ptKey, callback)

Gets entry portion of section partial entries.

__Arguments__
* `secName` - Section name.
* `ptKey` - Identification string for the patient.
* `callback(err, entries)` - A callback which is called when entries are retrieved, or an error occurs.  Each entry in `entries` array contains the data as specified in [`getSection`](#getSection).

__Examples__

```js
bbr.getSection('allergies', testPatient', function(err, entries) {
  if (err) {
    console.log('error saving the section.');
  } else { // order of entries might be different
    console.log(entries[0].name);       // allergy1
    console.log(entries[0].severity);   //severity3
    console.log(entries[1].name);       // allergy2
    console.log(entries[1].value.code); // code5
  }
});
```
---------------------------------------

### getMatches(secName, ptKey, fields, callback)

Gets a list of all section partial entries..

__Arguments__
* `secName` - Section name.
* `ptKey` - Identification string for the patient.
* `fields1 - Fields of entries to be retrieved.
* `callback(err, partialeEntries)` - A callback which is called when entries are match information is retrieved, or an error occurs.  Each element in `partialeEntries` array contains `fields` for `partial_entry` and `match_entry' and match information.

__Examples__

```js
bbr.getMatches('allergies', testPatient', 'severity', function(err, partialEntries) {
  var matchId1 = null;
  var matchId2 = null;
  if (err) {
    console.log('error retreiving partial entries.');
  } else { // order of entries might be different
    console.log(partialEntries[0].partial_entry.severity); // severity3
    console.log(partialEntries[0].match_entry.severity);   // severity1
    console.log(partialEntries[0].percent);                // 80
    console.log(partialEntries[0].subelements);            // ['severity']
    matchId1 = partialEntries[0]._id;
    console.log(partialEntries[1].partial_entry.severity); // severity2
    console.log(partialEntries[1].match_entry.severity);   // severity2
    console.log(partialEntries[1].percent);                // 90
    console.log(partialEntries[1].subelements);            // ['value.code']
    matchId2 = partialEntries[2]._id;
  }
});
```
---------------------------------------

### getMatch(secName, id, callback)

Gets all the details of a partial entry.

__Arguments__
* `secName` - Section name.
* `id` - Id of the match.
* `callback(err, matchInfo)` - A callback which is called when entries are match information is retrieved, or an error occurs.  `entry` and `match_entry` contain patient health data for partial and matching existing data. 

__Examples__

```js
bbr.getMatch('allergies', matchId1, function(err, matchInfo) {
  if (err) {
    console.log('error retreiving matchInfo.');
  } else { // order of entries might be different
    console.log(matchInfo.entry.name);           // 'allergy1'
    console.log(matchInfo.entry.severity);       // 'severity3'
    console.log(matchInfo.match_entry.name);     // 'allergy1'
    console.log(matchInfo.match_entry.severity); // 'severity1'
    console.log(matchInfo.percent);              // 80
    console.log(matchInfo.subelements);          // ['severity']
  }
});
```
---------------------------------------

### matchCount(secName, ptKey, conditions, callback)

Gets all the details of a partial entry.

__Arguments__
* `secName` - Section name.
* `ptKey` - Identification string for the patient.
* `conditions` - Conditions for the count.
* `callback(err, count)` - A callback which is called when count is retrieved, or an error occurs.

__Examples__

```js
bbr.matchCount('allergies', 'testPatient', {}, function(err, count) {
  if (err) {
    console.log('error retreiving matchInfo.');
  } else {
    console.log(count); // 2
  }
});

bbr.matchCount('allergies', 'testPatient', {percent: 80}, function(err, count) {
  if (err) {
    console.log('error retreiving matchInfo.');
  } else {
    console.log(count); // 1
  }
});
```
---------------------------------------

### cancelMatch(secName, id, reason, callback)

Removes the partial entry from the list.

__Arguments__
* `secName` - Section name.
* `id` - Id of the match.
* `reason` - Reason for cancellation.
* `callback(err)` - A callback which is called when canceling is achieved, or an error occurs.

__Examples__

```js
bbr.cancelMatch('allergies', matchId1, 'ignore', function(err) {
  if (err) {
    console.log('error retreiving matchInfo.');
  } else {
    console.log('cancel is succeeded');
  }
});
```
---------------------------------------

### acceptMatch(secName, id, reason, callback)

Adds the partial entries to the patient record.

__Arguments__
* `secName` - Section name.
* `id` - Id of the match.
* `reason` - Reason for acceptance.
* `callback(err)` - A callback which is called when acceptance is achieved, or an error occurs.

__Examples__

```js
bbr.acceptedMatch('allergies', matchId1, 'added', function(err) {
  if (err) {
    console.log('error accepting.');
  } else {
    console.log('accept is succeeded');
  }
});
```
---------------------------------------

## Schemas

Underlying MongoDB collections can be classified into four categories

- Patient data and metadata
- Merge history
- Partial match
- Source file storage

### Source file storage

This is a single collection named 'storage.files'.  It contains file content and few additional file metadata fields.  This collection is used through MongoDB GridFS specification since the content can be larger than the MongoDB 16M size limit.  The schema is as follows (GridFS specific schema fields are not shown)

``` javascript
var schema = {
  filename: String,
  contentType: String,
  uploadDate: Date,
  metadata: {
    pat_key: String,
    fileClass: String
  }
};
```

'contentType' is the file MIME type such as 'application/xml'.  'pat_key' is used to identify the patient file belongs to.  If it exists 'fileClass' can only have the value of 'ccda' and indicates that file was read as a ccda document succesfully.  

### Patient data and metadata

Patient data collections closely follows [blue-button](https://github.com/amida-tech/blue-button) models that implement CCDA header or sections.  Collection 'demographics' store CCDA header data.  Currently there are eight collections for supported CCDA sections: 'medications', 'procedures', 'socialHistories', 'problems', 'allergies', 'results', 'vitals', and 'encounters'.  Each element in the collections is a single entry in a CCDA section.  Allergy schema is

``` javascript
var schema = {
  name: String,
  code: String,
  code_system_name: String,
  date: [{date: Date, precision: String}],
  identifiers: [{
     identifier:String,
     identifier_type: String
  }],
  severity: String,
  reaction: [{
     code: String, 
     name: String, 
     code_system_name: String, 
     severity: String
  }],
  
  pat_key: String,
  metadata: {
    attribution: [{type: ObjectId, ref: 'allergymerges'}]
  },
  reviewed: Boolean,
  archived: Boolean
};
```

All the fields before 'pat_key' directly comes from [blue-button](https://github.com/amida-tech/blue-button) models and is documented there.  Remaining fields are identical for all collections.  'pat_key' is the key for the patient whom this entry belongs.  'metadata.attribution' links patient data collections to merge history collections.  'reviewed=false' identifies all partial entries.  'archieved=true' identifies all partial entries that are ignored or merged and is not part of the health record.

Since schema for all other collections follows the same pattern they will not be explicitly shown here.

### Merge History

Collections for merge history hold information on where and how a patient data entry is added to the health record.  There is one merge history collection for each patient data collection: 'allergymerges', 'demographicmerges', 'encountermerges', 'socialmerges', 'vitalmerges', 'immunizationmerges', 'medicationmerges', 'proceduremerges', and 'resultmerges'.  The schema for each follows a general pattern and shown for 'allergymerges' below

``` javascript
var schema = {
  entry_type: String,
  pat_key: String,
  entry: {type: ObjectId, ref: allergies},
  record: {type: ObjectId, ref: 'storage.files'},
  merged: Date,
  merge_reason: String,
  archived: Boolean
};
```

'entry_type' is a convenience field and holds the type of the entry.  It can have the values: 'allergy', 'demographic', 'social', 'problem', 'procedure', 'medication', 'vital', 'immunization', or 'encounter'.  'pat_key' is the patient key.  'entry' and 'record' respectively link the merge history to patient data and source file.  'merged' is the time that the merge history record is created.  'merge_reason' can currently be 'new', 'update' or 'duplicate'.  'archived=true' identifies all the merge history entries that is linked to patient data collections that has the same flag and is an another convenience field.  

### Partial Match

Collections for partial match history describe partial matches and the action that the patient took.  There is one partial match history collection for each patient data collection: 'allergymatches', 'demographicmatches', 'encountermatches', 'socialmatches', 'vitalmatches', 'immunizationmatches', 'medicationmatches', 'procedurematches', and 'resultmatches'.  The schema for each follows a general pattern and shown for 'allergymatches' below

``` javascript
var schema = {
  entry_type: String,
  pat_key: String,
  entry: {type: ObjectId, ref: allergies},
  record: {type: ObjectId, ref: 'storage.files'},
  determination: String,
  percent: Number,
  diff: {},
  subelements: {}
};
```

All the fields until the percent has identical descriptions to corresponding merge history collection ('allergymerges' for 'allergymatches'). 'percent', 'diff' and 'subelements' describe the details of the partial match for which detailed information can be found in [blue-button-match](https://github.com/amida-tech/blue-button-match).  'determination' describes the action that user took such as 'merged', 'added' or 'ignored'.
