"use strict";

var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var storageColName = 'storage.files';

exports.models = function(connection, supportedSections) {
    var result = {
        merge: {},
        clinical: {},
        match: {}
    };
    supportedSections.forEach(function(secName) {
        var mergeColName = secName + 'merges';
        var mergeSchema = new Schema({
            entry_type: String,
            pat_key: String,
            entry: ObjectId,
            record: {
                type: ObjectId,
                ref: storageColName
            },
            merged: Date,
            merge_reason: String,
            archived: Boolean
        });
        result.merge[secName] = connection.model(mergeColName, mergeSchema);

        var matchColName = secName + 'matches';
        var matchSchemaDesc = {
            entry_type: String,
            pat_key: String,
            entry: ObjectId,
            match_entry: ObjectId,
            match_obj: {},
            determination: String //Can be 1) Merged, 2) Added, 3) Ignored.
        };
        var matchSchema = new Schema(matchSchemaDesc);
        result.match[secName] = connection.model(matchColName, matchSchema);

        var desc = {};
        desc.data = {};
        desc.pat_key = String;
        desc.metadata = {
            attribution: [{
                type: ObjectId,
                ref: mergeColName
            }]
        };
        desc.reviewed = Boolean;
        desc.archived = Boolean;
        var schema = new Schema(desc);

        result.clinical[secName] = connection.model(secName, schema);
    });
    return result;
};

exports.storageModel = function(connection) {
    if (!connection) {
        connection = mongoose;
    }
    //GridFS will automatically make this, but a schema is needed for population/refs.
    var schema = new Schema({
        pat_key: String,
        metadata: {
            class: String
        },
        md5: String,
        uploadDate: Date,
        chunkSize: Number,
        length: Number,
        contentType: String,
        filename: String,
    });

    var model = connection.model(storageColName, schema);
    return model;
};
