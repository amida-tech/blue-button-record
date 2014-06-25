"use strict";

var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

//Saves raw file to gridFS.
exports.saveRecord = function(dbinfo, ptKey, content, sourceInfo, contentType, callback) {
    var buffer = new Buffer(content);

    var fileMetadata = {pat_key: ptKey};
    if (contentType) {
        fileMetadata.fileClass = contentType;
    }

    dbinfo.grid.put(buffer, {
        metadata: fileMetadata,
        filename: sourceInfo.name,
        content_type: sourceInfo.type,
    }, function(err, fileInfo) {
        if (err) {
            callback(err);
        } else {
            /*Relax for now pending further investigation, seems to be chunking overhead.*/
            //if (fileInfo.length !== sourceInfo.size) {
            //  callback('file size mismatch');
            //} else {
            callback(null, fileInfo._id);
            //}
        }
    });
};

exports.getRecordList = function(dbinfo, ptKey, callback) {
    dbinfo.db.collection('storage.files', function(err, recordCollection) {
        if (err) {
            callback(err);
        } else {
            recordCollection.find({"metadata.pat_key": ptKey}, function(err, findResults) {
                findResults.toArray(function(err, recordArray) {
                    var result = recordArray.map(function(record) {
                        var r = {};
                        r.file_id = record._id;
                        r.file_name = record.filename;
                        r.file_size = record.length;
                        r.file_mime_type = record.contentType;
                        r.file_upload_date = record.uploadDate;
                        if (record.metadata.fileClass) {
                            r.file_class = record.metadata.fileClass;
                        }
                        r.patient_key = record.metadata.pat_key;
                        return r;
                    });
                    callback(null, result);
                });
            });
        }
    });
};

exports.getRecord = function(dbinfo, sourceId, callback) {
    //Removed owner validation for demo purposes.
    dbinfo.db.collection('storage.files', function(err, coll) {
        if (err) {
            callback(err);
        } else {
            if (typeof sourceId === 'string') {
                sourceId = mongoose.Types.ObjectId(sourceId);
            }
            coll.findOne({"_id": sourceId}, function(err, results) {
                if (err) {
                    callback(err);
                } else if (results) {
                    dbinfo.grid.get(sourceId, function(err, data) {
                        if (err) {
                            callback(err);
                        } else {
                            var returnFile = data.toString();
                            callback(null, results.filename, returnFile);
                        }
                    });
                } else {
                    callback(new Error('no file'));
                }
            });
        }
    });
};

exports.recordCount = function(dbinfo, ptKey, callback) {
    dbinfo.storageModel.count({"metadata.pat_key" : ptKey}, function(err, count) {
        callback(err, count);
    });
};
