"use strict";

var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var fs = require('fs');

//Saves raw file to gridFS.
exports.saveSource = function (dbinfo, ptKey, content, sourceInfo, contentType, callback) {
    var buffer = new Buffer(content);

    var fileMetadata = {
        pat_key: ptKey
    };
    if (contentType) {
        fileMetadata.fileClass = contentType;
    }

    //source of file
    var source = "";
    if (sourceInfo.source) {
        source = sourceInfo.source;
    }

    fileMetadata.source = source;

    var fileId = new dbinfo.ObjectID();

    var gridStore = new dbinfo.GridStore(dbinfo.db, fileId, sourceInfo.name, 'w', {
        root: 'storage',
        metadata: fileMetadata,
        content_type: sourceInfo.type
    });

    if (sourceInfo.type === 'application/pdf') {
        gridStore.writeFile(sourceInfo.path, function (err, result) {
            if (err) {
                callback(err);
            } else {
                gridStore.close(function (err, fileData) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null, fileData._id);
                    }
                });
            }
        });
    } else {
        gridStore.open(function (err, gridStore) {
            if (err) {
                callback(err);
            }
            gridStore.write(buffer, function (err, gridStore) {
                if (err) {
                    callback(err);
                }
                gridStore.close(function (err, fileData) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null, fileData._id);
                    }
                });
            });
        });
    }
};

exports.getSourceList = function (dbinfo, ptKey, callback) {
    dbinfo.db.collection('storage.files', function (err, recordCollection) {
        if (err) {
            callback(err);
        } else {
            recordCollection.find({
                "metadata.pat_key": ptKey
            }, function (err, findResults) {
                findResults.toArray(function (err, recordArray) {
                    var result = recordArray.map(function (record) {
                        var r = {};
                        r.file_id = record._id;
                        r.file_name = record.filename;
                        r.file_size = record.length;
                        r.file_mime_type = record.contentType;
                        r.file_upload_date = record.uploadDate;

                        if (record.metadata.source) {
                            r.source = record.metadata.source;
                        }

                        if (record.metadata.parsed) {
                            r.file_parsed = record.metadata.parsed;
                        }

                        if (record.metadata.archived) {
                            r.file_archived = record.metadata.archived;
                        }

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

exports.updateSource = function (dbinfo, ptKey, sourceId, update, callback) {

    dbinfo.db.collection('storage.files', function (err, recordCollection) {
        if (err) {
            callback(err);
        } else {
            if (typeof sourceId === 'string') {
                sourceId = mongoose.Types.ObjectId(sourceId);
            }
            recordCollection.update({
                "metadata.pat_key": ptKey,
                "_id": sourceId
            }, {
                $set: update
            }, {}, function (err) {
                if (err) {
                    callback(err);
                } else {
                    callback(null);
                }
            });
        }

    });

};

exports.getSource = function (dbinfo, ptKey, sourceId, callback) {
    //Removed owner validation for demo purposes.
    dbinfo.db.collection('storage.files', function (err, coll) {
        if (err) {
            callback(err);
        } else {
            if (typeof sourceId === 'string') {
                sourceId = mongoose.Types.ObjectId(sourceId);
            }
            coll.findOne({
                '_id': sourceId,
                'metadata.pat_key': ptKey
            }, function (err, results) {
                if (err) {
                    callback(err);
                } else if (results) {
                    var gridStore = new dbinfo.GridStore(dbinfo.db, results._id, 'r', {
                        root: 'storage'
                    });

                    gridStore.open(function (err, gridStore) {
                        if (err) {
                            callback(err);
                        } else {
                            gridStore.read(function (err2, data) {
                                if (err2) {
                                    callback(err2);
                                } else {
                                    callback(null, results.filename, data);
                                }
                            });
                        }
                    });
                } else {
                    callback(new Error('no file found'));
                }
            });
        }
    });
};

exports.sourceCount = function (dbinfo, ptKey, callback) {
    dbinfo.storageModel.count({
        "metadata.pat_key": ptKey
    }, function (err, count) {
        callback(err, count);
    });
};
