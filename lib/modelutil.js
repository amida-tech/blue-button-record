"use strict";

var jsutil = require('./jsutil');
var _ = require('underscore');

var mongooseCleanDocument = exports.mongooseCleanDocument = function(doc) {
    var id = doc._id;
    ['__v', 'reviewed', 'archived', 'pat_key'].forEach(function(prop) {
        delete doc[prop];
    });
    jsutil.deepDeleteEmpty(doc);
    jsutil.movePropUp(doc, 'data');
    doc._id = id;
};

var mongooseCleanSection = exports.mongooseCleanSection = function(section) {
    if (Array.isArray(section)) {
        section.forEach(mongooseCleanDocument);
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

var mongooseToBBModelSection = exports.mongooseToBBModelSection = function(input) {
    if (Array.isArray(input)) {
        return input.map(mongooseToBBModelDocument);
    } else {
        return mongooseToBBModelDocument(input);
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
