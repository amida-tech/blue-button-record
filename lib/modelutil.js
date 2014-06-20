"use strict";

var jsutil = require('./jsutil');
var _ = require('underscore');

var mongooseCleanDocument = exports.mongooseCleanDocument = function(doc) {
    var id = doc._id;
    ['__v', 'reviewed', 'archived', 'patKey'].forEach(function(prop) {
        delete doc[prop];
    });
    jsutil.deepDeleteEmpty(doc);
    doc._id = id;
};

var mongooseCleanSection = exports.mongooseCleanSection = function(section) {
    if (Array.isArray(section)) { // all but demographics
        var n = section.length;
        for (var i=0; i<n; ++i) {
            var entry = section[i];
            mongooseCleanDocument(entry);
        }
    } else {
        mongooseCleanDocument(section);
    }
};

var mongooseToBBModelDocument = exports.mongooseToBBModelDocument = function(doc) {
    var result = _.clone(doc);
    ['_id', 'metadata'].forEach(function(prop) {
        delete result[prop];
    });
    return result;
};

var mongooseToBBModelSection = exports.mongooseToBBModelSection = function(section) {
    if (Array.isArray(section)) { // all but demographics
        var n = section.length;
        if (n > 0) {
            var result = [];
            for (var i=0; i<n; ++i) {
                var entry = section[i];
                var entryResult = mongooseToBBModelDocument(entry);
                result[i] = entryResult;
            }
            return result;
        } else {
            return section;
        }
    } else {
        return mongooseToBBModelDocument(section);
    }
};

exports.mongooseToBBModelFullRecord = function(record) {
    var result = {};
    Object.keys(record).forEach(function(sectionKey) {
        var section = record[sectionKey];
        if (section) {
            section = mongooseToBBModelSection(section);
        }
        result[sectionKey] = section;
    });
    return result;
};
