blue-button-record.js
======================

Master Health Record and Data Reconciliation Engine Persistance Layer (MongoDB)

[![NPM](https://nodei.co/npm/blue-button-record.png)](https://nodei.co/npm/blue-button-record/)

[![Build Status](https://travis-ci.org/amida-tech/blue-button-record.svg)](https://travis-ci.org/amida-tech/blue-button-record)
[![Coverage Status](https://coveralls.io/repos/amida-tech/blue-button-record/badge.png)](https://coveralls.io/r/amida-tech/blue-button-record)

blue-button-record is a module to persist patient health data.  It is primarily designed to support [blue-button](https://github.com/amida-tech/blue-button) data model however other models can also be [specified](#connectDatabase).  This module provides the following functionality:

- Persist Master Health Record (blue-button data) per patient:  Master Health Record contains all historical data about patients' health.  Master Health Record is organized in sections such as allergies and medications and blue-button-record API is built based on this sectional organization.  Each section is further organized as a set of entries even when there is only one entry as in demographics.
- Persist all sources of Master Health Record:  Currently only text files are supported.  Source content as well as various metadata such as name and upload time are stored.  Each entry in Master Health Record is linked to a source.    
- Persist Merge History:  Since blue-button data is historical, entries in Master Health Record is expected to appear in multiple sources.  Merge History keeps track of all the sources from which entries are created or updated. In addition it is also possible to register sources where the entries appear as it is in the Master Health Record (duplicates). 
- Persist Partial Health Record:  This module also stores a second health record seperate from Master Health Record called Partial Health Record.  Partial Health Record is designed to store entries that are similar to existing entries in Master Health Record but cannot be identified as duplicate or seperate and thus require further review.  Both the partial entries, Master Health Record entries that the partial entries match, and match details are stored.  Partial Health Record entries are eventually either added to Master Health Record or removed; blue-button-record API provides methods for both.

This implementation of blue-button-record uses MongoDB.

## Usage

Require [blue-button](https://github.com/amida-tech/blue-button) and blue-button-record 
``` javascript
var bb = require("blue-button");
var bbr = require("blue-button-record");
```
blue-button-record assumes MongoDB is already running.  Connect to the database
``` javascript
bbr.connectDatabase('localhost', function(err) {
  if (err) throw err;
}
```
Read a ccd file and convert it to JSON.  An example file exists in this repository
``` javascript
var fs = require('fs');
var path = require('path');
var filepath  = 'test/artifacts/standard/CCD_demo1.xml';
var xmlString = fs.readFileSync(filepath, 'utf-8');
var result = bb.parseString(xmlString);
var ccdJSON = result.data;
```
Persist the file as a source of patient data. Various properties is the responsibility the caller
``` javascript
var fileInfo = {
    name: 'CCD_demo1.xml',
    type: 'text/xml'
};
var fileId;
bbr.saveRecord('patientKey', xmlString, fileInfo, 'ccda', function(err, id) {
    fileId = id;
});
```
For simplicity we will only use this `fileId` in usage documentation as if it has several types of data.  Methods are provided to access patient data source records as a list or individually
``` javascript
bbr.getRecordList('patientKey', function(err, results) {
    console.log(results.length);
});

bbr.getRecord('patientKey', fileId, function(err, filename, content) {
    console.log(filename);
});

bbr.recordCount('patientKey', function(err, count) {
    console.log(count);
});
```

You can persist all the [blue-button](https://github.com/amida-tech/blue-button) sections together
``` javascript
bbr.saveAllSections('patientKey', ccdJSON, fileId, function(err) {
    if (err) {throw err;}
});
```
or individually
``` javascript
bbr.saveSection('allergies', 'patientKey', ccdJSON.allergies, fileId, function(err) {
    if (err) {throw err;}
});
```
Note that persisting blue-button-data always requires a source (`fileId` above).  By default all sections supported by [blue-button](https://github.com/amida-tech/blue-button) are also supported by blue-button-record.

You can get all sections of the Master Health Record
``` javascript
bbr.getAllSections('patientKey',function(err, result) {
    console.log(result.allergies[0].allergen.name);
    console.log(result.procedures[0].procedure.name);
});
```
or get any section individually
``` javascript
var id;
var allergies;
bbr.getSection('allergies', 'patientKey', function(err, result) {
    console.log(result[0].allergen.name);
    id = result[0]._id;
    allergies = result;
});

```
In addition to [blue-button](https://github.com/amida-tech/blue-button) data, each entry also includes metadata and property `_id` which you can later use to update or access
``` javascript
bbr.updateEntry('allergies', id, fileId, {severity: 'Severe'}, function(err) {
    if (err) {throw err;}
});

var allergy;
bbr.getEntry('allergies', id, function(err, result) {
    console.log(result.severity);
    allergy = result;
});
```
You can clean up metadata and other non blue-button data 
``` javascript
var allergiesBBOnly = bbr.cleanSection(allergies);
console.log(allergiesBBOnly[0]._id);
console.log(allergiesBBOnly[0].allergen.name);
```
which makes allergiesBBOnly comparable to ccdJSON.allergies.

If you find an existing entry of Master Health Record in a new source, you can register the source as such
``` javascript
bbr.duplicateEntry('allergies', id, fileId, function(err) {
  if (err) throw err;
});
```

Metadata property for each entry provides both the source of the data and the Merge History
``` javascript
  bbr.getEntry('allergies', id, function(err, entry) {
      var attribution = entry.metadata.attribution;
      console.log(attribution[0].merge_reason);     // 'new'
      console.log(attribution[0].record.filename);
      console.log(attribution[1].merge_reason);     // 'update'
      console.log(attribution[1].record.filename);
      console.log(attribution[2].merge_reason);     // 'duplicate'
      console.log(attribution[2].record.filename);
  });        
```
Whole Merge History for a section is available
``` javascript
bbr.getMerges('allergies', 'patientKey', 'allergen severity', 'filename uploadDate', function(err, mergeList) {
    var explMerge = mergeList[0];
    console.log(explMerge.merge_reason);
    console.log(explMerge.entry.allergen.name);
    console.log(explMerge.entry.severity);
    console.log(explMerge.record.filename);
    console.log(explMerge.record.uploadDate);
});        
```
You can count Merge History entries with various conditions
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

blue-button-record also stores Partial Health Record; entries which cannot immediately become part of the Master Health Record since they are similar enough to existing entries but not identical to become duplicates.  In addition to blue-button health data, blue-button-record requires a pointer to an existing Master Health Record entry and match information to persist partial entries
``` javascript
var partialAllergy = {
    partial_entry: ccdJSON.allergies[0],
    partial_match: {
        diff: {severity: 'new'},
        percent: 80,
        subelements: []
    },
    match_entry_id: id
};
```
By default match information is assumed to have three fields: diff, subelements, and percent.  diff and sublements can be of any object and percent must be a number.  This default is to accomodate match information available from [blue-button-match](https://github.com/amida-tech/blue-button-match).  

Partial entries are persisted as sections
``` javascript
// for simplicity use the same here, these would be different in reality
var partialAllergies = [partialAllergy, partialAllergy];
bbr.savePartialSection('allergies', 'patientKey', partialAllergies, fileId, function(err) {
    if (err) {throw err;}       
});
```
blue-button health data piece of partial entries are available similar to `getSection`.
``` javascript
bbr.getPartialSection('allergies', 'patientKey', function(err, result) {
  console.log(result[0].allergen.name);
});
```
the same data together with selected fields from the Master Health Record entry and the match information is available as a list
``` javascript
bbr.getMatches('allergies', 'patientKey', 'allergen severity', function(err, result) {
    console.log(result[0].entry.allergen.name);
    console.log(result[0].entry.severity);
    console.log(result[0].match_entry.allergen.name);   
    console.log(result[0].match_entry.severity);
    console.log(result[0].diff.severity);        
    console.log(result[0].percent);
    var matchId0 = result[0]._id;
    var matchId1 = result[1]._id;
});
```
Individual match access is also available and will return the full blue-button data both for the Master Health Record enty and the Partial Health Record entry
``` javascript
bbr.getMatch('allergies', matchId0, function(err, result) {
    console.log(result.entry.allergen.name);
    console.log(result.entry.status);
    console.log(result.match_entry.allergen.name);   
    console.log(result.match_entry.status);
    console.log(result.diff.severity);        
    console.log(result.percent);
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

Matches can be canceled with application specific reasons such as 'ignored' or 'merged'
``` javascript
bbr.cancelMatch('allergies', matchId, 'ignored', function(err, count) {
  console.log(count);
});

bbr.cancelMatch('allergies', matchId, 'merged', function(err, count) {
  console.log(count);
});

```
or they can be accepted and become part of the Master Health Record.
``` javascript
bbr.acceptMatch('allergies', matchId1, 'added', function(err) {
    if (err) {throw err;}
});   
```

When the session ends, you disconnect from the database
``` javascript
bbr.disconnect(function(err) {
    if (err) {throw err;}
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
  * `schemas` - Schemas to use for Master Health Record entries.  This is a JSON object with leaf values describe the type of the data to be stored.  It describes patient data in sections and the root properties are used as the section names of Master Health Record throughout the other API methods.  Hierarchy of the JSON object describes the hierarchy of the patient data and one element arrays are used to describe array of patient data.  Defaults to `ccd` schema available from [blue-button](https://github.com/amida-tech/blue-button).  Arrays are not supported for top values (entry schema descriptions) and silently converted to their first elements.  Leaf node types can be `"string"`, `"datetime"`, `"number"`, `"boolean"`, and `"any"`.  All but `"any"` corresponds to Javascript types.  `"any"` can be used to accept any data.
  * `matchFields` - Schema to describe match information between Partial and Master Health Record entries.  It is a JSON object similar to `schemas` in structure.  Defaults to `{percent: 'number', diff: 'any', subelements: 'any'}` to support [blue-button-match](https://github.com/amida-tech/blue-button-match).   
* `callback(err)` - A callback which is called when connection is established, or an error occurs.

__Examples__

```js
var bbr = require('blue-button-record');
var assert = require('assert');
var options = {
    dbName: 'test',
    schemas: {
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
        }
    },
    matchFields: {
        percent: 'number',
        subelements: 'any'
    }
};

bbr.connectDatabase('localhost', options, function(err) {
    assert.ifError(err);
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
  assert.ifError(err);
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
    assert.ifError(err);
});
```
---------------------------------------

### saveRecord(ptKey, content, sourceInfo, contentType, callback)

Saves a source of patient data.  Currently only text files are supported.

__Arguments__
* `ptKey` - Identification string for the patient.
* `content` - Content of the source.  `content` is a javascript string that is 'utf8' encoded before being saved to the database.
* `sourceInfo`- Additional information about the source.  Following properties are supported
  * `name`- Name of the source.
  * `type`- MIME type of the source.
* `contentType` - Content type of the source.   
* `callback(err, id)` - A callback which is called when source is saved, or an error occurs.  `id` is the database assigned identifier for the saved source. 

__Examples__

```js
var fileId1;
bbr.saveRecord('testPatient1', '<content value=1 />', {type: 'text/xml', name: 'expl1.xml'}, 'ccda', function(err, id) {
    assert.ifError(err);
    fileId1 = id;
});
```

```js
var fileId2;
bbr.saveRecord('testPatient1', '<content value=2 />', {type: 'application/xml', name: 'expl2.xml'}, 'c32', function(err, id) {
    assert.ifError(err);
    fileId2 = id;
});
```

```js
var fileId3;
bbr.saveRecord('testPatient1', 'content 3', {type: 'text/plain', name: 'expl3.xml'}, 'ccda', function(err, id) {
    assert.ifError(err);
    fileId3 = id;
});
```

```js
var fileId4;
bbr.saveRecord('testPatient2', '<content value=4 />', {type: 'text/xml', name: 'expl4.xml'}, 'ccda', function(err, id) {
    assert.ifError(err);
    fileId4 = id;
});
```

---------------------------------------

### getRecordList(ptKey, callback)

Gets all the sources of Master Health Record in the database.

__Arguments__
* `ptKey` - Identification string for the patient.
* `callback(err, sources)` - A callback which is called when `sources` is retrieved, or an error occurs.  `sources` is an array with each element containing the following information:
  * file_id - Database assigned identifier for the source.
  * file_name - Name of the source.
  * file_size - Size of the source.
  * file_mime_type - MIME type of the source. 
  * file_upload_date - Upload instance of the source.
  * file_class - Content type of the source.

__Examples__

```js
bbr.getRecordList('testPatient1', function(err, sources) {
    assert.ifError(err);
    assert.equal(sources.length, 3);
    var names = sources.map(function(source) {return source.file_name;});
    var index = names.indexOf('expl1.xml');
    assert.equal(sources[index].file_mime_type, 'text/xml');
    assert.equal(sources[index].file_class, 'ccda');
});
```
---------------------------------------

### getRecord(ptKey, sourceId, callback)

Gets name and content of the Master Health Record source.

__Arguments__
* `ptKey` - Identification string for the patient.
* `sourceId` - Database identification string of the source.
* `callback(err, name, content)` - A callback which is called when name and content are retrieved, or an error occurs. 

__Examples__

```js
bbr.getRecord('testPatient1', fileId1, function(err, name, content) {
    assert.ifError(err);
    assert.equal(name, 'expl1.xml');
    assert.equal(content, '<content value=1 />');
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
bbr.recordCount('testPatient1', function(err, count) {
    assert.ifError(err);
    assert.equal(count, 3);
});
```
---------------------------------------

### saveSection(secName, ptKey, inputSection, sourceId, callback)

Saves section entries in Master Health Record.

__Arguments__
* `secName` - Section name.
* `ptKey` - Identification string for the patient.
* `inputSection` - An array of entries with schema as specified in [`connectDatabase`](#connectDatabase).
* `sourceId` - Id for the source where the `inputSection` is located. 
* `callback(err, ids)` - A callback which is called when saving entries is succesfull, or an error occurs.  `ids` are database assigned identifier for each entry in `inputSection` order.

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
}];

var aid1;
var aid2;
bbr.saveSection('allergies', 'testPatient1', inputSection, fileId1, function(err, ids) {
    assert.ifError(err);        
    aid1 = ids[0];
    aid2 = ids[1];
});
```
---------------------------------------

<a name="getSection" />
### getSection(secName, ptKey, callback)

Gets section entries in Master Health Record

__Arguments__
* `secName` - Section name.
* `ptKey` - Identification string for the patient.
* `callback(err, entries)` - A callback which is called when entries are retrieved, or an error occurs.  Each entry in `entries` array contains the data specified in section schema.  In addition the following properties exists:
  * `_id` - Database assigned identifier for the entry.
  * `metadata.attribution` - This is an array that keeps track of Merge History.
    * `merged` - The instant of the change to the entry.
    * `merge_reason` - This is the reason of the change.  Can be 'new', 'duplicate', or 'update'.
    * `record._id` - Source identifier.
    * `record.filename` - Name of the source file.

__Examples__

```js
bbr.getSection('allergies', 'testPatient1', function(err, entries) {
    assert.ifError(err);  
    var i = [entries[0].name, entries[1].name].indexOf('allergy1');            
    assert.equal(entries[i].value.code, 'code1');
    var attr = entries[i].metadata.attribution[0];
    assert.equal(attr.merge_reason, 'new');
    assert.equal(attr.record.filename, 'expl1.xml');
});
```
---------------------------------------

### saveAllSections(ptKey, ptRecord, sourceId, callback)

Saves multiple sections in Master Health Record.

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
bbr.saveAllSections('allergies', 'testPatient2', ptRecord, fileId, function(err, ids) {
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

Gets the whole Master Patient Record.

__Arguments__
* `ptKey` - Identification string for the patient.
* `callback(err, ptRecord)` - A callback which is called when Master Health Record is retrieved, or an error occurs.  For each section entries are identical to [`getSection`](#getSection) in content.

__Examples__

```js
bbr.getAllSections('testPatient2', function(err, ptRecord) {
    assert.ifError(err);
    var names = ptRecord.allergies.map(function(a) {return a.name;});
    var i = names.indexOf('allergy1');
    assert.equal(ptRecord.allergies[i].severity, 'severity1');
    assert.equal(ptRecord.procedures[0].name, 'procedure1');
    assert.equal(ptRecord.procedures[0].proc_type, 'proc_type1');
    var attr = ptRecord.procedures[0].metadata.attribution[0];
    assert.equal(attr.merge_reason, 'new');
    assert.equal(attr.record.filename, 'expl4.xml');
});
```
---------------------------------------

### cleanSection(input)

Removes all non blue-button data (currently _id and metadata) from each entry.

__Arguments__
* `input` - Section entries.

__Examples__

```js
bbr.getSection('procedures', 'testPatient2', function(err, entries) {
    assert.ifError(err);
    var expectedCleanEntries = [{name: 'procedure1', proc_type: 'proc_type1',}];
    assert.notDeepEqual(entries, expectedCleanEntries);
    var cleanEntries = bbr.cleanSection(entries);
    assert.deepEqual(cleanEntries, expectedCleanEntries);
});
```
---------------------------------------

### getEntry(secName, id, callback)

Gets an entry of a section `secName` from Master Health Record.

__Arguments__
* `secName` - Section name.
* `id` - Database identifier for the entry.
* `callback(err, entry)` - A callback which is called when entry is retrieved, or an error occurs.  `entry` fields are identical to [`getSection`](#getSection) in content.

__Examples__

```js
bbr.getEntry('allergies', aid2, function(err, entry) {
    assert.ifError(err);
    assert.equal(entry.name, 'allergy2');
    assert.equal(entry.value.display, 'display2');
    var attr = entry.metadata.attribution[0];
    assert.equal(attr.merge_reason, 'new');
    assert.equal(attr.record.filename, 'expl1.xml');
});
```
---------------------------------------

### duplicateEntry(secName, id, sourceId, callback)

Registers source `sourceId` to include the duplicate of an existing entry `id`.

__Arguments__
* `secName` - Section name.
* `id` - Database identifier for the entry.
* `sourceId` - Id for the source. 
* `callback(err)` - A callback which is called when duplication information is saved, or an error occurs.

__Examples__

```js
bbr.duplicateEntry('allergies', aid1, fileId2, function(err) {
    assert.ifError(err);
    bbr.getEntry('allergies', aid1, function(err, entry) {
        assert.ifError(err);
        var attr = entry.metadata.attribution;
        assert.equal(attr.length, 2);
        assert.equal(attr[0].merge_reason, 'new');
        assert.equal(attr[0].record.filename, 'expl1.xml');
        assert.equal(attr[1].merge_reason, 'duplicate');
        assert.equal(attr[1].record.filename, 'expl2.xml');
    });
});
```
---------------------------------------

### updateEntry(secName, id, sourceId, updateObject, callback)

Updates entry with the fields in `updateObject`.

__Arguments__
* `secName` - Section name.
* `id` - Database identifier for the entry.
* `sourceId` - Id for the source.
* `updateObject` - JSON object with keys and values to update.
* `callback(err)` - A callback which is called when update is successful, or an error occurs.

__Examples__

```js
bbr.updateEntry('allergies', aid1, fileId3, {severity: 'updatedSev'}, function(err) {
    assert.ifError(err);
    bbr.getEntry('allergies', aid1, function(err, entry) {
        assert.ifError(err);
        assert.equal(entry.severity, 'updatedSev');
        var attr = entry.metadata.attribution;
        assert.equal(attr.length, 3);
        assert.equal(attr[0].merge_reason, 'new');
        assert.equal(attr[0].record.filename, 'expl1.xml');
        assert.equal(attr[1].merge_reason, 'duplicate');
        assert.equal(attr[1].record.filename, 'expl2.xml');
        assert.equal(attr[2].merge_reason, 'update');
        assert.equal(attr[2].record.filename, 'expl3.xml');
    });
});
```
---------------------------------------

### getMerges(secName, ptKey, entryFields, recordFields, callback)

Retrieves Merge History for a particular patient and section.

__Arguments__
* `ptKey` - Identification string for the patient.
* `entryFields` - Fields for entries to be returned.
* `recordFields` - Fields for sources to be returned.
* `callback(err, result)` - A callback which is called when Merge History is retrieved, or an error occurs.  `result` is an array with the following properties:
  * `merged` - Instance when the change information is merged.
  * `merge_reason` - Reason how the entry changed. 'new' for when the entry is first created, 'duplicate' for when a source is registered to include a duplicate, and 'update' when entry is updated through `updateEntry`.
  * `entry` - Contains all the fields specified by `entryFields`.
  * `record` - Contains all the fields specified by `recordFields`.

__Examples__

```js
bbr.getMerges('allergies', 'testPatient1', 'name severity', 'filename', function(err, result) {
    assert.ifError(err);
    assert.equal(result.length, 4);
    result.sort(function(a, b) {
        var r = a.entry.name.localeCompare(b.entry.name);
        if (r === 0) {
            var c = {'new': -1, 'duplicate': 0, 'update': 1};
            return c[a.merge_reason] - c[b.merge_reason];
        }
        return r;
    });
    assert.equal(result[0].entry.severity, 'updatedSev');
    assert.equal(result[0].record.filename, 'expl1.xml');
    assert.equal(result[0].merge_reason, 'new');
    assert.equal(result[1].entry.severity, 'updatedSev');
    assert.equal(result[1].record.filename, 'expl2.xml');
    assert.equal(result[1].merge_reason, 'duplicate');
    assert.equal(result[2].entry.severity, 'updatedSev');
    assert.equal(result[2].record.filename, 'expl3.xml');
    assert.equal(result[2].merge_reason, 'update');
    assert.equal(result[3].entry.severity, 'severity2');
    assert.equal(result[3].record.filename, 'expl1.xml');
    assert.equal(result[3].merge_reason, 'new');
});
```
---------------------------------------

### mergeCount(secName, ptKey, conditions, callback)

Number of records in Merge History.

__Arguments__
* `secName` - Section name.
* `ptKey` - Identification string for the patient.
* `conditions` - Condition specification.
* `callback(err, count)` - A callback when `count` is retrieved, or an error occurs.

__Examples__

```js
bbr.mergeCount('allergies', 'testPatient1', {}, function(err, count) {
    assert.ifError(err);
    assert.equal(count, 4);
});

bbr.mergeCount('allergies', 'testPatient1', {merge_reason: 'duplicate'}, function(err, count) {
    assert.ifError(err);
    assert.equal(count, 1);
});
 ```
---------------------------------------

### savePartialSection(secName, ptKey, inputSection, sourceId, callback)

Saves section entries in Partial Health Record together with the id of the matching existing entry in Master Health Record and match details.

__Arguments__
* `secName` - Section name.
* `ptKey` - Identification string for the patient.
* `inputSection` - An array of partial entries and match information.  Each element in the array has three top level properties:
  * partial_entry - Section entry with the schema as specified in [`connectDatabase`](#connectDatabase).
  * partial_match - Match information with the schema as specified in [`connectDatabase`](#connectDatabase).
  * match_entry_id - Id of the existing section entry which partial_entry matches.
* `sourceId` - Id for the source where the `inputSection` is located. 
* `callback(err, ids)` - A callback which is called when saving partial entries is succesfull, or an error occurs.  `ids` are database assigned identifiers for entries specified in `partial_entry` in the same order as in `inputSection`.

__Examples__

```js
var inputSection = [{
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
        subelements: ['severity']
    },
    match_entry_id: aid1
},
{
    partial_entry: {
        name: 'allergy2',
        severity: 'severity2',
        value: {
            code: 'code5', 
            display: 'display2'
        }
    },
    partial_match: {
        percent: 90,
        subelements: ['value.code']
    },
    match_entry_id: aid2
}];
var paid1;
var paid2;
bbr.savePartialSection('allergies', 'testPatient1', inputSection, fileId4, function(err, ids) {
    assert.ifError(err);
    paid1 = ids[0];
    paid2 = ids[1];
});
```
---------------------------------------

### getPartialSection(secName, ptKey, callback)

Gets all entries in a section of Partial Health Record without any match information.  The entries are identical to [`getSection`](#getSection) in content.

__Arguments__
* `secName` - Section name.
* `ptKey` - Identification string for the patient.
* `callback(err, entries)` - A callback which is called when entries are retrieved, or an error occurs.  Each entry in `entries` array contains the data as specified in [`getSection`](#getSection).

__Examples__

```js
bbr.getPartialSection('allergies', 'testPatient1', function(err, entries) {
    assert.ifError(err);
    var i = [entries[0].name, entries[1].name].indexOf('allergy1');
    assert.equal(entries[i].name, 'allergy1');
    assert.equal(entries[i].severity, 'severity3');
    assert.equal(entries[i+1 % 2].name, 'allergy2');
    assert.equal(entries[i+1 % 2].value.code, 'code5');
});
```
---------------------------------------

### getMatches(secName, ptKey, fields, callback)

Gets a list of all section entries in Partial Health Record.

__Arguments__
* `secName` - Section name.
* `ptKey` - Identification string for the patient.
* `fields` - Fields of entries to be retrieved.
* `callback(err, partialEntries)` - A callback which is called when entries and match information areretrieved, or an error occurs.  Each element in `partialEntries` array contains `fields` for `match_entry` and `entry` and match information.

__Examples__

```js
bbr.getMatches('allergies', 'testPatient1', 'name severity value.code', function(err, entries) {
    assert.ifError(err);
    var i = [entries[0].entry.name, entries[1].entry.name].indexOf('allergy1');
    assert.equal(entries[i].entry.severity, 'updatedSev');
    assert.equal(entries[i].match_entry.severity, 'severity3');
    assert.equal(entries[i].percent, 80);
    assert.deepEqual(entries[i].subelements, ['severity']);
    assert.equal(entries[i+1 % 2].entry.value.code, 'code2');
    assert.equal(entries[i+1 % 2].match_entry.value.code, 'code5');
    assert.equal(entries[i+1 % 2].percent, 90);
    assert.deepEqual(entries[i+1 % 2].subelements, ['value.code']);            
});
```
---------------------------------------

### getMatch(secName, id, callback)

Gets all the details of a partial entry, the matching entry in Master Health Record, and match information.

__Arguments__
* `secName` - Section name.
* `id` - Id of the match.
* `callback(err, matchInfo)` - A callback which is called when match information is retrieved, or an error occurs.  `match_entry` and `entry` contain patient health data for partial and matching existing data. 

__Examples__

```js
bbr.getMatch('allergies', paid1, function(err, matchInfo) {
    assert.ifError(err);
    assert.equal(matchInfo.entry.severity, 'updatedSev');
    assert.equal(matchInfo.match_entry.severity, 'severity3');
    assert.equal(matchInfo.percent, 80);
    assert.deepEqual(matchInfo.subelements, ['severity']);
});
```
---------------------------------------

### matchCount(secName, ptKey, conditions, callback)

Gets number of section entries in Partial Health Record.

__Arguments__
* `secName` - Section name.
* `ptKey` - Identification string for the patient.
* `conditions` - Conditions for the count.
* `callback(err, count)` - A callback which is called when count is retrieved, or an error occurs.

__Examples__

```js
bbr.matchCount('allergies', 'testPatient1', {}, function(err, count) {
    assert.ifError(err);
    assert.equal(count, 2);
});

bbr.matchCount('allergies', 'testPatient1', {percent: 80}, function(err, count) {
    assert.ifError(err);
    assert.equal(count, 1);
});
```
---------------------------------------

### acceptMatch(secName, id, reason, callback)

Moves the partial entry to Master Health Record.

__Arguments__
* `secName` - Section name.
* `id` - Id of the match.
* `reason` - Reason for acceptance.
* `callback(err)` - A callback which is called when acceptance is achieved, or an error occurs.

__Examples__

```js
bbr.acceptMatch('allergies', paid1, 'added', function(err) {
    assert.ifError(err);
    bbr.getSection('allergies', 'testPatient1', function(err, entries) {
        assert.ifError(err);
        assert.equal(entries.length, 3); // added to Master Health Record
        bbr.matchCount('allergies', 'testPatient1', {}, function(err, count) {
            assert.ifError(err);
            assert.equal(count, 1);     // removed from Partial Health Record 
        });
    });
});
```
---------------------------------------

### cancelMatch(secName, id, reason, callback)

Removes the partial entry from Partial Health Record.

__Arguments__
* `secName` - Section name.
* `id` - Id of the match.
* `reason` - Reason for cancellation.
* `callback(err)` - A callback which is called when canceling is achieved, or an error occurs.

__Examples__

```js
bbr.cancelMatch('allergies', paid2, 'ignored', function(err) {
    assert.ifError(err);
    bbr.getSection('allergies', 'testPatient1', function(err, entries) {
        assert.ifError(err);
        assert.equal(entries.length, 3); // not added to Master Health Record
        bbr.matchCount('allergies', 'testPatient1', {}, function(err, count) {
            assert.ifError(err);
            assert.equal(count, 0);      // removed from Partial Health Record 
        });
    });
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

'contentType' is the file MIME type such as 'application/xml'.  'pat_key' is used to identify the patient file belongs to.  If it exists 'fileClass' indicates the content type (ex: 'ccda').

### Patient data and metadata

Default patient data collections closely follows [blue-button](https://github.com/amida-tech/blue-button) models that implement CCDA header or sections.  Allergy schema is

``` javascript
var schema = {
  allergen: {
    name: String,
    code: String,
    code_system_name: String,
    nullFlavor: String
    translations: [{
      name: String,
      code: String,
      code_system_name: String,
      nullFlavor: String
    }]
  },
  date: [{date: Date, precision: String}],
  identifiers: [{
     identifier:String,
     identifier_type: String
  }],
  severity: String,
  status: String,
  reaction: [{
    reaction: {  
      code: String, 
      name: String, 
      code_system_name: String,
      nullFlavor: String
      translations: [{
        name: String,
        code: String,
        code_system_name: String
        nullFlavor: String
      }],
     severity: String
    }
  }],
  
  pat_key: String,
  metadata: {
    attribution: [{type: ObjectId, ref: 'allergiesmerges'}]
  },
  reviewed: Boolean,
  archived: Boolean
};
```

All the fields before 'pat_key' directly comes from [blue-button](https://github.com/amida-tech/blue-button) models and is documented there.  Remaining fields are identical for all collections.  'pat_key' is the key for the patient whom this entry belongs.  'metadata.attribution' links patient data collections to merge history collections.  'reviewed=false' identifies all partial entries.  'archieved=true' identifies all partial entries that are ignored or merged and is not part of the health record.

If an alternative patient data schema is given during [`connectDatabase`](#connectDatabase) then they simply replace all the fields before 'pat_key'.

Since schema for all other collections follows the same pattern they will not be explicitly shown here.

### Merge History

Collections for merge history hold information on where and how a patient data entry is added to the health record.  There is one merge history collection for each patient data collection.  The schema for each follows a general pattern and shown for 'allergiesmerges' below

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

'entry_type' is a convenience field and holds the section name like allergies.  'pat_key' is the patient key.  'entry' and 'record' respectively link the merge history to patient data and source file.  'merged' is the time that the merge history record is created.  'merge_reason' can currently be 'new', 'update' or 'duplicate'.  'archived=true' identifies all the merge history entries that is linked to patient data collections that has the same flag and is an another convenience field.  

### Partial Match

Collections for partial match history describe partial matches and the action that the patient took.  There is one partial match history collection for each patient data collection.  The schema for each follows a general pattern and shown for 'allergiesmatches' below

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

All the fields until the percent has identical descriptions to corresponding merge history collection. 'percent', 'diff' and 'subelements' describe the details of the partial match for which detailed information can be found in [blue-button-match](https://github.com/amida-tech/blue-button-match).  'determination' describes the action that user took such as 'merged', 'added' or 'ignored'.

If alternative match fields are given during [`connectDatabase`](#connectDatabase) they simply replace 'percent', 'diff' and 'subelements' above.
