# Usage

Require [blue-button](https://github.com/amida-tech/blue-button) and blue-button-record 
```javascript
var bb = require("@amida-tech/blue-button");
var bbr = require("@amida-tech/blue-button-record");
```
blue-button-record assumes MongoDB is already running.  Connect to the database
```javascript
bbr.connectDatabase('localhost', function(err) {
  if (err) throw err;
}
```
Read a ccd file and convert it to JSON.  An example file exists in this repository
```javascript
var fs = require('fs');
var path = require('path');
var filepath  = 'test/artifacts/standard/CCD_demo1.xml';
var xmlString = fs.readFileSync(filepath, 'utf-8');
var result = bb.parseString(xmlString);
var ccdJSON = result.data;
```
Persist the file as a source of patient data. Various properties is the responsibility the caller
```javascript
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
```javascript
var updateInfo = {
    'metadata.parsed': new Date(),
    'metadata.archived': new Date()
};
bbr.updateSource('patientKey', fileId, updateInfo, function(err) {
    if (err) {throw err;}
});
```

For simplicity we will only use this `fileId` in usage documentation as if it has several types of data.  Methods are provided to access patient data source records as a list or individually
```javascript
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
```javascript
bbr.saveAllSections('patientKey', ccdJSON, fileId, function(err) {
    if (err) {throw err;}
});
```
or individually
```javascript
bbr.saveSection('allergies', 'patientKey', ccdJSON.allergies, fileId, function(err) {
    if (err) {throw err;}
});
```
Note that persisting blue-button-data always requires a source (`fileId` above).  By default all sections supported by [blue-button](https://github.com/amida-tech/blue-button) are also supported by blue-button-record.

You can get all sections of the Master Health Record
```javascript
bbr.getAllSections('patientKey',function(err, result) {
    console.log(result.allergies[0].allergen.name);
    console.log(result.procedures[0].procedure.name);
});
```
or get any section individually
```javascript
var id;
var allergies;
bbr.getSection('allergies', 'patientKey', function(err, result) {
    console.log(result[0].allergen.name);
    id = result[0]._id;
    allergies = result;
});

```
In addition to [blue-button](https://github.com/amida-tech/blue-button) data, each entry also includes metadata and property `_id` which you can later use to update or access
```javascript
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
```javascript
var allergiesBBOnly = bbr.cleanSection(allergies);
console.log(allergiesBBOnly[0]._id);
console.log(allergiesBBOnly[0].allergen.name);
```
which makes allergiesBBOnly comparable to ccdJSON.allergies.

If you find an existing entry of Master Health Record in a new source, you can register the source as such
```javascript
bbr.duplicateEntry('allergies', 'patientKey', id, fileId, function(err) {
  if (err) throw err;
});
```

Metadata property for each entry provides both the source of the data and the Merge History
```javascript
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
```javascript
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
```javascript
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
```javascript
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
```javascript
// for simplicity use the same here, these would be different in reality
var partialAllergies = [partialAllergy, partialAllergy];
bbr.saveMatches('allergies', 'patientKey', partialAllergies, fileId, function(err) {
    if (err) {throw err;}       
});
```
Match List is available as a list
```javascript
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
```javascript
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
```javascript
bbr.matchCount('allergies', 'patientKey', {}, function(err, count) {
    console.log(count);
});   

bbr.matchCount('allergies', 'patientKey', {percent: 90}, function(err, count) {
    console.log(count);
});   
```

Match List entries can be canceled with application specific reasons such as 'ignored' or 'merged'
```javascript
bbr.cancelMatch('allergies', 'patientKey', matchId0, 'ignored', function(err, count) {
  console.log(count);
});

bbr.cancelMatch('allergies', 'patientKey', matchId0, 'merged', function(err, count) {
  console.log(count);
});

```
or they can be accepted and become part of the Master Health Record.
```javascript
bbr.acceptMatch('allergies', 'patientKey', matchId1, 'added', function(err) {
    if (err) {throw err;}
});   
```

When the session ends, you disconnect from the database
```javascript
bbr.disconnect(function(err) {
    if (err) {throw err;}
});   
```

