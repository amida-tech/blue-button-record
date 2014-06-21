"use strict";

var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var bbTypeToMongoose = {
    string: function() {
        return {type: String};
    },
    datetime: function() {
        return {type: Date};
    },
    number: function() {
        return {type: Number};
    },
    boolean: function() {
        return {type: Boolean};    
    }
};

var bbToMongoose = function(description) {
    if (!description) {
        return null;
    }
    if (Array.isArray(description)) {
        var elem = bbToMongoose(description[0]);
        if (!elem) {
            throw new Error('unknown description in array: ' + description);
        }
        if (typeof description[0] === "object") { 
            return [new Schema(elem, {_id: false})];
        } else {
            return [elem];
        }
    } else if (typeof description === "object") {
        var result = Object.keys(description).reduce(function(r, key) {
            var elem = bbToMongoose(description[key]);
            if (!elem) {
                throw new Error('unknown description in object: ' + description);
            }
            r[key] = elem;
            return r;
        }, {});
        return result;
    } else {
        var f = bbTypeToMongoose[description];
        if (f) {
            return f();
        } else {
            throw new Error('unknown description: ' + description);            
        }
    }
};

var storageColName = 'storage.files';

exports.models = function(connection, supportedSections, schemas, matchFields) {
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
            entry: {
                type: ObjectId,
                ref: secName
            },
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
            entry: {
                type: ObjectId,
                ref: secName
            },
            match_entry: {
                type: ObjectId,
                ref: secName
            },
            determination: String //Can be 1) Merged, 2) Added, 3) Ignored.
        };
        Object.keys(matchFields).forEach(function(matchFieldKey) {
            var matchFieldType = matchFields[matchFieldKey];
            if (matchFieldType) {
                if (matchFieldType === 'number') {
                    matchSchemaDesc[matchFieldKey] = Number;
                } else if (matchFieldType === 'string') {
                    matchSchemaDesc[matchFieldKey] = String;
                }
            } else {
                matchSchemaDesc[matchFieldKey] = {};
            }
        });
        var matchSchema = new Schema(matchSchemaDesc);
        result.match[secName] = connection.model(matchColName, matchSchema);

        var desc = bbToMongoose(schemas[secName]);
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
