Blue Button Record
======================

Master Health Record and Data Reconciliation Engine Persistance Layer (MongoDB)

[![NPM](https://nodei.co/npm/@amida-tech/blue-button-record.png)](https://nodei.co/npm/@amida-tech/blue-button-record/)

[![Build Status](https://travis-ci.org/amida-tech/blue-button-record.svg)](https://travis-ci.org/amida-tech/blue-button-record)
[![Coverage Status](https://coveralls.io/repos/amida-tech/blue-button-record/badge.png)](https://coveralls.io/r/amida-tech/blue-button-record)

blue-button-record is a module to persist patient health data.  It is primarily designed to support [blue-button](https://github.com/amida-tech/blue-button) data model however there is no specific schema dependence and other models can also be [used](#connectDatabase).  This module provides the following functionality:

- Persist the Master Health Record (blue-button data) per patient:  The Master Health Record contains all historical data about a patient's health.  It is organized in sections such as Allergies and Medications, and the blue-button-record API is based on this sectional organization.  Each section is further organized into a set of entries even when there is only one entry, as in the Demographics section.
- Persist all sources of Master Health Record:  Currently text and xml files are supported.  Source content as well as various metadata such as name and upload time are stored.  Each entry in the Master Health Record is linked to a source.    
- Persist Merge History:  Since blue-button data is historical, entries in Master Health Record are expected to appear in multiple sources.  Merge History keeps track of all the sources from which entries are created or updated. It is also possible to register sources for new entries that are duplicates of elements in the Master Health Record (duplicates). 
- Persist Match List:  This module also stores a second set of entries seperate from Master Health Record called Match List.  Match List is designed to store entries that are similar to existing entries in Master Health Record but cannot be identified as duplicate or seperate and thus require further review.  Both the Match List entries, Master Health Record entries that the Match List entries match, and match details are stored.  Match List entries are eventually either added to Master Health Record or removed; blue-button-record API provides methods for both.

This implementation of blue-button-record uses MongoDB.  

## Usage

Require [blue-button](https://github.com/amida-tech/blue-button) and blue-button-record 
``` javascript
var bb = require("@amida-tech/blue-button");
var bbr = require("@amida-tech/blue-button-record");
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
bbr.saveSource('patientKey', xmlString, fileInfo, 'ccda', function(err, id) {
    fileId = id;
});
```

After source is persisted it can also be updated
``` javascript
var updateInfo = {
    'metadata.parsed': new Date(),
    'metadata.archived': new Date()
};
bbr.updateSource('patientKey', fileId, updateInfo, function(err) {
    if (err) {throw err;}
});
```

For simplicity we will only use this `fileId` in usage documentation as if it has several types of data.  Methods are provided to access patient data source records as a list or individually
``` javascript
bbr.getSourceList('patientKey', function(err, results) {
    console.log(results.length);
});

bbr.getSource('patientKey', fileId, function(err, filename, content) {
    console.log(filename);
});

bbr.sourceCount('patientKey', function(err, count) {
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
bbr.updateEntry('allergies', 'patientKey', id, fileId, {severity: 'Severe'}, function(err) {
    if (err) {throw err;}
});

var allergy;
bbr.getEntry('allergies', 'patientKey', id, function(err, result) {
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
bbr.duplicateEntry('allergies', 'patientKey', id, fileId, function(err) {
  if (err) throw err;
});
```

Metadata property for each entry provides both the source of the data and the Merge History
``` javascript
  bbr.getEntry('allergies', 'patientKey', id, function(err, entry) {
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

blue-button-record also stores Match List; entries which cannot immediately become part of the Master Health Record since they are similar enough to existing entries but not identical to become duplicates.  In addition to blue-button health data, blue-button-record requires a pointer to an existing Master Health Record entry and match information to persist partial entries
``` javascript
var partialAllergy = {
            partial_entry: ccdJSON.allergies[0],
            partial_matches: [{
                match_entry: id,
                match_object: {
                    diff: {
                        severity: 'new'
                    },
                    percent: 80,
                    subelements: []
                }
            }]
        };
```
Here match information is assumed to have three fields: diff, subelements, and percent.  The match fields are application specific and are not validated.

Match List entries are persisted as sections
``` javascript
// for simplicity use the same here, these would be different in reality
var partialAllergies = [partialAllergy, partialAllergy];
bbr.saveMatches('allergies', 'patientKey', partialAllergies, fileId, function(err) {
    if (err) {throw err;}       
});
```
Match List is available as a list
``` javascript
bbr.getMatches('allergies', 'patientKey', 'allergen severity', function(err, result) {
    console.log(result[0].matches[0].match_entry.observation.severity.code.name);
    console.log(result[0].entry.observation.allergen.name);
    console.log(result[0].entry.observation.severity.code.name);
    console.log(result[0].matches[0].match_object.diff.severity);
    console.log(result[0].matches[0].match_object.percent);
    matchId0 = result[0]._id;
    matchId1 = result[1]._id;
});
```
Individual Match List entry access is also available and will return the full blue-button data both for the Master Health Record enty and the Match List entry
``` javascript
bbr.getMatch('allergies', 'patientKey', matchId0, function(err, result) {
     console.log(result.matches[0].match_entry.observation.allergen.name);
     console.log(result.matches[0].match_entry.observation.status.name);
     console.log(result.matches[0].match_entry.observation.allergen.name);
     console.log(result.matches[0].match_entry.observation.status.name);
     console.log(result.matches[0].match_object.diff.severity);
     console.log(result.matches[0].match_object.percent);
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

Match List entries can be canceled with application specific reasons such as 'ignored' or 'merged'
``` javascript
bbr.cancelMatch('allergies', 'patientKey', matchId0, 'ignored', function(err, count) {
  console.log(count);
});

bbr.cancelMatch('allergies', 'patientKey', matchId0, 'merged', function(err, count) {
  console.log(count);
});

```
or they can be accepted and become part of the Master Health Record.
``` javascript
bbr.acceptMatch('allergies', 'patientKey', matchId1, 'added', function(err) {
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
  * `supported_sections` - Supported top level sections for health data.  It is an array of section names and defaults to [blue-button-meta](https://github.com/amida-tech/blue-button-meta) `supported_sections` property.
* `callback(err)` - A callback which is called when connection is established, or an error occurs.

__Examples__

```js
var bbr = require('@amida-tech/blue-button-record');
var assert = require('assert');
var options = {
    dbName: 'test',
    supported_sections: ['allergies', 'procedures']
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

### saveSource(ptKey, content, sourceInfo, contentType, callback)

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
bbr.saveSource('testPatient1', '<content value=1 />', {type: 'text/xml', name: 'expl1.xml'}, 'ccda', function(err, id) {
    assert.ifError(err);
    fileId1 = id;
});
```

```js
var fileId2;
bbr.saveSource('testPatient1', '<content value=2 />', {type: 'application/xml', name: 'expl2.xml'}, 'c32', function(err, id) {
    assert.ifError(err);
    fileId2 = id;
});
```

```js
var fileId3;
bbr.saveSource('testPatient1', 'content 3', {type: 'text/plain', name: 'expl3.xml'}, 'ccda', function(err, id) {
    assert.ifError(err);
    fileId3 = id;
});
```

```js
var fileId4;
bbr.saveSource('testPatient2', '<content value=4 />', {type: 'text/xml', name: 'expl4.xml'}, 'ccda', function(err, id) {
    assert.ifError(err);
    fileId4 = id;
});
```

---------------------------------------

### updateSource(ptKey, sourceId, update, callback)

Updates fields of source information.

__Arguments__
* `ptKey` - Identification string for the patient.
* `sourceId` - Database identification string of the source.
* `update`- JSON object for field and field values to be updated.
* `callback(err)` - A callback which is called when source is updated, or an error occurs.

__Examples__

```js
var updateInfo = {
  'metadata.parsed': new Date(),
  'metadata.archived': new Date()
};
bbr.updateSource('testPatient1', fileId1, updateInfo, function(err) {
  assert.ifError(err);
});
```

---------------------------------------

### getSourceList(ptKey, callback)

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
bbr.getSourceList('testPatient1', function(err, sources) {
    assert.ifError(err);
    assert.equal(sources.length, 3);
    var names = sources.map(function(source) {return source.file_name;});
    var index = names.indexOf('expl1.xml');
    assert.equal(sources[index].file_mime_type, 'text/xml');
    assert.equal(sources[index].file_class, 'ccda');
});
```
---------------------------------------

### getSource(ptKey, sourceId, callback)

Gets name and content of the Master Health Record source.

__Arguments__
* `ptKey` - Identification string for the patient.
* `sourceId` - Database identification string of the source.
* `callback(err, name, content)` - A callback which is called when name and content are retrieved, or an error occurs. 

__Examples__

```js
bbr.getSource('testPatient1', fileId1, function(err, name, content) {
    assert.ifError(err);
    assert.equal(name, 'expl1.xml');
    assert.equal(content, '<content value=1 />');
});
```
---------------------------------------

### sourceCount(ptKey, callback)

Gets the number of sources in the database for the patient.

__Arguments__
* `ptKey` - Identification string for the patient.
* `callback(err, count)` - A callback which is called when source `count` is retrieved, or an error occurs. 

__Examples__

```js
bbr.sourceCount('testPatient1', function(err, count) {
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


### <a id="getSection"></a>getSection(secName, ptKey, callback) ###

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

### getEntry(secName, ptKey, id, callback)

Gets an entry of a section `secName` from Master Health Record.

__Arguments__
* `secName` - Section name.
* `ptKey` - Identification string for the patient.
* `id` - Database identifier for the entry.
* `callback(err, entry)` - A callback which is called when entry is retrieved, or an error occurs.  `entry` fields are identical to [`getSection`](#getSection) in content.

__Examples__

```js
bbr.getEntry('allergies', 'testPatient1', aid2, function(err, entry) {
    assert.ifError(err);
    assert.equal(entry.name, 'allergy2');
    assert.equal(entry.value.display, 'display2');
    var attr = entry.metadata.attribution[0];
    assert.equal(attr.merge_reason, 'new');
    assert.equal(attr.record.filename, 'expl1.xml');
});
```
---------------------------------------

### duplicateEntry(secName, ptKey, id, sourceId, callback)

Registers source `sourceId` to include the duplicate of an existing entry `id`.

__Arguments__
* `secName` - Section name.
* `ptKey` - Identification string for the patient.
* `id` - Database identifier for the entry.
* `sourceId` - Id for the source. 
* `callback(err)` - A callback which is called when duplication information is saved, or an error occurs.

__Examples__

```js
bbr.duplicateEntry('allergies', 'testPatient1', aid1, fileId2, function(err) {
    assert.ifError(err);
    bbr.getEntry('allergies', 'testPatient1', aid1, function(err, entry) {
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

### updateEntry(secName, ptKey, id, sourceId, updateObject, callback)

Updates entry with the fields in `updateObject`.

__Arguments__
* `secName` - Section name.
* `ptKey` - Identification string for the patient.
* `id` - Database identifier for the entry.
* `sourceId` - Id for the source.
* `updateObject` - JSON object with keys and values to update.
* `callback(err)` - A callback which is called when update is successful, or an error occurs.

__Examples__

```js
bbr.updateEntry('allergies', 'testPatient1', aid1, fileId3, {severity: 'updatedSev'}, function(err) {
    assert.ifError(err);
    bbr.getEntry('allergies', 'testPatient1', aid1, function(err, entry) {
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

### saveMatches(secName, ptKey, inputSection, sourceId, callback)

Saves Match List entries for a section.

__Arguments__
* `secName` - Section name.
* `ptKey` - Identification string for the patient.
* `inputSection` - An array of Match List entries and match information.  Each element in the array has three top level properties:
  * partial_entry - Section entry.  The fields are expected to be identical to the section entries in Master Health Record.
  * partial_match - Match information.  This information is save to database as is without any validation.
  * match_entry_id - Id of the existing section entry which partial_entry matches.
* `sourceId` - Id for the source where the `inputSection` is located. 
* `callback(err, ids)` - A callback which is called when saving partial entries is succesfull, or an error occurs.  `ids` are database assigned identifiers for entries specified in `partial_entry` in the same order as in `inputSection`.

__Examples__

```js
var inputSection = [{
            partial_entry: {
                name: 'allergy1',
                severity: 'severity3',
                value: {
                    code: 'code1',
                    display: 'display1'
                }
            },
            partial_matches: [{
                match_entry: aid1,
                match_object: {
                    percent: 80,
                    subelements: ['severity']
                }
            }]
        }, {
            partial_entry: {
                name: 'allergy2',
                severity: 'severity2',
                value: {
                    code: 'code5',
                    display: 'display2'
                }
            },
            partial_matches: [{
                match_entry: aid2,
                match_object: {
                    percent: 90,
                    subelements: ['value.code']
                }
            }]
        }];
        bbr.saveMatches('allergies', 'testPatient1', inputSection, fileId4, function (err, ids) {
            assert.ifError(err);
            paid1 = ids[0];
            paid2 = ids[1];
            done();
        });
});
```
---------------------------------------

### getMatches(secName, ptKey, fields, callback)

Gets a list of all section entries in Match List

__Arguments__
* `secName` - Section name.
* `ptKey` - Identification string for the patient.
* `fields` - Fields of entries to be retrieved.
* `callback(err, partialEntries)` - A callback which is called when entries and match information are retrieved, or an error occurs.  Each element in `partialEntries` array contains `fields` for `match_entry` and `entry` and match information.

__Examples__

```js
bbr.getMatches('allergies', 'testPatient1', 'name severity value.code', function (err, entries) {
            assert.ifError(err);
            var i = [entries[0].entry.name, entries[1].entry.name].indexOf('allergy1');

            assert.equal(entries[i].matches[0].match_entry.severity, 'updatedSev');
            assert.equal(entries[i].entry.severity, 'severity3');
            assert.equal(entries[i].matches[0].match_object.percent, 80);
            assert.deepEqual(entries[i].matches[0].match_object.subelements, ['severity']);
            assert.equal(entries[(i + 1) % 2].matches[0].match_entry.value.code, 'code2');
            assert.equal(entries[(i + 1) % 2].entry.value.code, 'code5');
            assert.equal(entries[(i + 1) % 2].matches[0].match_object.percent, 90);
            assert.deepEqual(entries[(i + 1) % 2].matches[0].match_object.subelements, ['value.code']);
            done();
        });
```
---------------------------------------

### getMatch(secName, ptKey, id, callback)

Gets all the details of a Match List entry, the matching entry in Master Health Record, and match information.

__Arguments__
* `secName` - Section name.
* `ptKey` - Identification string for the patient.
* `id` - Id of the match.
* `callback(err, matchInfo)` - A callback which is called when match information is retrieved, or an error occurs.  `match_entry` and `entry` contain full blue-button data for Match List and Master Health Record entries. 

__Examples__

```js
bbr.getMatch('allergies', 'testPatient1', paid1, function(err, matchInfo) {
    assert.ifError(err);
    assert.equal(matchInfo.entry.severity, 'updatedSev');
    assert.equal(matchInfo.match_entry.severity, 'severity3');
    assert.equal(matchInfo.percent, 80);
    assert.deepEqual(matchInfo.subelements, ['severity']);
});
```
---------------------------------------

### matchCount(secName, ptKey, conditions, callback)

Gets number of section entries in Match List.

__Arguments__
* `secName` - Section name.
* `ptKey` - Identification string for the patient.
* `conditions` - Conditions for the count.  Only field names from match information are supported.
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

### acceptMatch(secName, ptKey, id, reason, callback)

Moves the Match List entry to Master Health Record.

__Arguments__
* `secName` - Section name.
* `ptKey` - Identification string for the patient.
* `id` - Id of the match.
* `reason` - Reason for acceptance.
* `callback(err)` - A callback which is called when acceptance is achieved, or an error occurs.

__Examples__

```js
bbr.acceptMatch('allergies', 'testPatient1', paid1, 'added', function(err) {
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

### cancelMatch(secName, ptKey, id, reason, callback)

Removes the entry from Match List.

__Arguments__
* `secName` - Section name.
* `ptKey` - Identification string for the patient.
* `id` - Id of the match.
* `reason` - Reason for cancellation.
* `callback(err)` - A callback which is called when canceling is achieved, or an error occurs.

__Examples__

```js
bbr.cancelMatch('allergies', 'testPatient1', paid2, 'ignored', function(err) {
    assert.ifError(err);
    bbr.getSection('allergies', 'testPatient1', function(ierr, entries) {
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
- Match list
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
    fileClass: String,
    parsed: Date,
    archived: Date
  }
};
```

'contentType' is the file MIME type such as 'application/xml'.  'pat_key' is used to identify the patient file belongs to.  If it exists 'fileClass' indicates the content type (ex: 'ccda').  'parsed' can be used to record the first parsing of the source for health data by applications. 'archived' can be used to by applications for removal functionality.  Currently API methods does not use 'archived' for such functionality. 

### Patient data and metadata

Each [supported section](#connectDatabase) in patient health data has its own collection.  Each document in a section collection consists of entry data and metadata about the entry.  Schemas are identical for each collection
``` javascript
var schema = {
  data: {},
  pat_key: String,
  metadata: {
    attribution: [{type: ObjectId, ref: 'allergiesmerges'}]
  },
  reviewed: Boolean,
  archived: Boolean
};
```

'data' holds the entry data and there is no schema validation for it.  'pat_key' is the key for the patient whom this entry belongs.  'metadata.attribution' links patient data collections to merge history collections.  'reviewed=false' identifies all partial entries.  'archieved=true' identifies all partial entries that are ignored or merged and is not part of the health record.

### Merge History

Collections for merge history hold information on where and how a patient data entry is added to the health record.  There is one merge history collection for each patient data collection.  The schema for each are identical

``` javascript
var schema = {
  entry_type: String,
  pat_key: String,
  entry: ObjectId,
  record: {type: ObjectId, ref: 'storage.files'},
  merged: Date,
  merge_reason: String,
  archived: Boolean
};
```

'entry_type' is a convenience field and holds the section name like allergies.  'pat_key' is the patient key.  'entry' and 'record' respectively link the merge history to patient data and source file.  'merged' is the time that the merge history record is created.  'merge_reason' can currently be 'new', 'update' or 'duplicate'.  'archived=true' identifies all the merge history entries that is linked to patient data collections that has the same flag and is an another convenience field.  

### Match List

Collections for match list describe matches and the action that the patient took.  There is one match list collection for each patient data section collection.  The schema for each are identical

``` javascript
var schema = {
  entry_type: String,
  pat_key: String,
  entry: ObjectId,
  record: {type: ObjectId, ref: 'storage.files'},
  determination: String,
  match_obj: {}
};
```

All the fields except 'match_obj' and 'determination' have identical descriptions to corresponding merge history collection. 'match_obj' describes the details of the partial match and is application specific; some examples can be found in [blue-button-match](https://github.com/amida-tech/blue-button-match).  'match_obj' is not validated.  'determination' describes the action that user took such as 'merged', 'added' or 'ignored'.
