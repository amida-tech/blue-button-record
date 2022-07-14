"use strict";

var mongoose = require('mongoose');
var fs = require('fs');
var { Buffer } = require('buffer');

var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

//Saves raw file to gridFS.
exports.saveSource = function (dbinfo, ptKey, content, sourceInfo, contentType, callback) {
  var buffer = Buffer.from(content);

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

  if (sourceInfo.type === 'application/pdf') {
    fs.createReadStream(sourceInfo.path)
      .pipe(dbinfo.GridStore.openUploadStream(sourceInfo.path))
      .on('error', callback)
      .on('finish', function () {
        callback(null, fileId._id);
      });
  } else {
    dbinfo.GridStore.openUploadStreamWithId(fileId, sourceInfo.name, {
      metadata: fileMetadata,
      contentType: sourceInfo.type
    }).end(buffer)
      .on('error', function () {
        callback(err);
      })
      .on('finish', function () {
        callback(null, fileId._id);
      });
  }

};

exports.getSourceList = function (dbinfo, ptKey, callback) {
  dbinfo.GridStore.find({ 'metadata.pat_key': ptKey }).toArray(function (err, recordArray) {
    if (err) {
      callback(err);
    } else {
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
    }
  });
};

exports.updateSource = function (dbinfo, ptKey, sourceId, update, callback) {
  if (typeof sourceId === 'string') {
    sourceId = mongoose.Types.ObjectId(sourceId);
  }

  dbinfo.db.collection('storage.files').updateOne({
    "metadata.pat_key": ptKey,
    "_id": sourceId
  }, {
    $set: update
  }, callback);

};

exports.getSource = function (dbinfo, ptKey, sourceId, callback) {
  //Removed owner validation for demo purposes.
  if (typeof sourceId === 'string') {
    sourceId = mongoose.Types.ObjectId(sourceId);
  }

  dbinfo.db.collection('storage.files').findOne({
    '_id': sourceId,
    'metadata.pat_key': ptKey
  }, function (err, results) {
    if (err) {
      callback(err);
    } else if (results) {
      var returnFile = '';
      dbinfo.GridStore.openDownloadStream(results._id)
        .end()
        .on('error', function (err) {
          callback(err);
        })
        .on('data', function (data) {
          if (results.contentType === 'application/pdf') {
            returnFile = data;
          } else {
            returnFile += data.toString();
          }
        })
        .on('end', function () {
          callback(null, results.filename, returnFile);
        });
    } else {
      callback(new Error('no file found'));
    }
  });
};

exports.sourceCount = function (dbinfo, ptKey, callback) {
  dbinfo.storageModel.countDocuments({ 'metadata.pat_key': ptKey }, callback);
};
