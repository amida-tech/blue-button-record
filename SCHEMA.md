# Schemas

Underlying MongoDB collections can be classified into four categories

- Patient data and metadata
- Merge history
- Match list
- Source file storage

## Source file storage

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

## Patient data and metadata

Each [supported section](./API.md#connectdatabaseserver-options-callback) in patient health data has its own collection.  Each document in a section collection consists of entry data and metadata about the entry.  Schemas are identical for each collection
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

## Merge History

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

## Match List

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
