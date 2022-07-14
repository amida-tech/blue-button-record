# API

## connectDatabase(server, options, callback)

Connects to the database on `server`.  If called multiple times before [`disconnect`](#disconnectcallback) is called, the subsequent calls are silently ignored.

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

## disconnect(callback)

Disconnects from the previously connected database using [`connectDatabase`](#connectdatabaseserver-options-callback).  If there is no existing connection the call is silently ignored.

__Arguments__
* `callback(err)` - A callback which is called when disconnection is succesfull, or an error occurs.

__Examples__

```js
bbr.disconnect(function(err) {
  assert.ifError(err);
});
```
---------------------------------------

## clearDatabase(callback)

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

## saveSource(ptKey, content, sourceInfo, contentType, callback)

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

## updateSource(ptKey, sourceId, update, callback)

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

## getSourceList(ptKey, callback)

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

## getSource(ptKey, sourceId, callback)

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

## sourceCount(ptKey, callback)

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

## saveSection(secName, ptKey, inputSection, sourceId, callback)

Saves section entries in Master Health Record.

__Arguments__
* `secName` - Section name.
* `ptKey` - Identification string for the patient.
* `inputSection` - An array of entries with schema as specified in [`connectDatabase`](#connectdatabaseserver-options-callback).
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


## getSection(secName, ptKey, callback)

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

## saveAllSections(ptKey, ptRecord, sourceId, callback)

Saves multiple sections in Master Health Record.

__Arguments__
* `ptKey` - Identification string for the patient.
* `ptRecord` - Multiple sections keyed with section names and an array of entries with schema as specified in [`connectDatabase`](#connectdatabaseserver-options-callback).
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

## getAllSections(ptKey, callback)

Gets the whole Master Patient Record.

__Arguments__
* `ptKey` - Identification string for the patient.
* `callback(err, ptRecord)` - A callback which is called when Master Health Record is retrieved, or an error occurs.  For each section entries are identical to [`getSection`](#getsectionsecname-ptkey-callback) in content.

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

## cleanSection(input)

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

## getEntry(secName, ptKey, id, callback)

Gets an entry of a section `secName` from Master Health Record.

__Arguments__
* `secName` - Section name.
* `ptKey` - Identification string for the patient.
* `id` - Database identifier for the entry.
* `callback(err, entry)` - A callback which is called when entry is retrieved, or an error occurs.  `entry` fields are identical to [`getSection`](#getsectionsecname-ptkey-callback) in content.

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

## duplicateEntry(secName, ptKey, id, sourceId, callback)

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

## updateEntry(secName, ptKey, id, sourceId, updateObject, callback)

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

## getMerges(secName, ptKey, entryFields, recordFields, callback)

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

## mergeCount(secName, ptKey, conditions, callback)

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

## saveMatches(secName, ptKey, inputSection, sourceId, callback)

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

## getMatches(secName, ptKey, fields, callback)

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

## getMatch(secName, ptKey, id, callback)

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

## matchCount(secName, ptKey, conditions, callback)

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

## acceptMatch(secName, ptKey, id, reason, callback)

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

## cancelMatch(secName, ptKey, id, reason, callback)

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

