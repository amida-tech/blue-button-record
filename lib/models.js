"use strict";

var DoubleMetaphone = require('doublemetaphone');
var encoder = new DoubleMetaphone();

var pim = require('blue-button-pim');

var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var storageColName = 'storage.files';

var history_model = require('./history/model');

exports.otherModels = function (connection) {
    var result = {
        other: {}
    };

    result.other.account_history = connection.model('account_history', history_model.AccountHistorySchema);

    return result;

};

exports.models = function (connection, supportedSections) {
    var result = {
        merge: {},
        clinical: {},
        match: {}
    };
    supportedSections.forEach(function (secName) {
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
            matches: [],
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

        //extra metadata for demographics section for PIm purposes
        if (secName === 'demographics') {
            desc.pim = {};
        }

        var schema = new Schema(desc);

        //hook for demographics model only (to process PIM attributes)
        if (secName === 'demographics') { //TODO: disabled for now
            schema.pre('save', function (next) {
                var self = this;

                //pre-calculate blocking traits
                self.pim = pim.calculate_blockers(self.data);

                next();
            });
        }

        result.clinical[secName] = connection.model(secName, schema);
    });
    return result;
};

exports.storageModel = function (connection) {
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
