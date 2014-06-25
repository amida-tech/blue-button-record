"use strict";

var _ = require('underscore');
var async = require('async');

var section = require('./section');
var entry = require('./entry');
var modelutil = require('./modelutil');

exports.save = function(dbinfo, secName, input, callback) {
    var Model = dbinfo.matchModels[secName];
    var m = new Model(input);
    m.save(callback);
};

exports.get = function(dbinfo, secName, id, callback) {
    var model = dbinfo.matchModels[secName];
    var query = model.findOne({_id: id}).populate('entry match_entry').lean();
    query.exec(function (err, result) {
        if (err) {
            callback(err);
        } else {
            modelutil.mongooseCleanSection(result.entry);
            modelutil.mongooseCleanSection(result.match_entry);
            delete result.__v;
            delete result.pat_key;
            delete result.entry.metadata;
            delete result.match_entry.metadata;
            callback(null, result);
        }
    });
};

exports.getAll = function(dbinfo, secName, ptKey, fields, callback) {
    var model = dbinfo.matchModels[secName];
    var query = model.find({pat_key: ptKey}).populate('entry match_entry', fields).lean();
    query.exec(function (err, results) {
        if (err) {
            callback(err);
        } else {
            var filteredResults = results.filter(function(result) {
                return result.determination === undefined;
            });
            filteredResults.forEach(function(result) {
                delete result.__v;
                delete result.pat_key;
            });
            callback(null, filteredResults);
        }
    });
};

exports.count = function(dbinfo, secName, ptKey, conditions, callback) {
    var model = dbinfo.matchModels[secName];
    var query = model.count();
    query.where('determination').in([null, false]);
    var c = _.clone(conditions);
    c.pat_key = ptKey;
    query.where(c);
    query.exec(callback);
};

exports.cancel = function(dbinfo, secName, id, reason, callback) {
    var queryMatch = function(cb) {
        var model = dbinfo.matchModels[secName];
        var query = model.findOne({_id: id});
        query.exec(function(err, result) {
            cb(err, result);
        });
    };

    var removeEntry = function(result, cb) {
        entry.remove(dbinfo, secName, result.match_entry, function(err) {
            cb(err, result);
        });
    };

    var updateMatch = function(result, cb) {
        result.determination = reason;
        result.save(function(err) {
            cb(err);
        });
    };

    async.waterfall([queryMatch, removeEntry, updateMatch], callback);
};

exports.accept = function(dbinfo, secName, id, reason, callback) {
    var queryMatch = function(cb) {
        var model = dbinfo.matchModels[secName];
        var query = model.findOne({_id: id});
        query.exec(function(err, result) {
            var queryResult = {match: result};
            cb(err, queryResult);
        });
    };

    var queryEntry = function(queryResult, cb) {
        var entryId = queryResult.match.match_entry;
        var model = dbinfo.models[secName];
        var query = model.findOne({"_id": entryId});
        query.exec(function(err, entry) {
            queryResult.entry = entry;
            cb(err, queryResult);
        });
    };

    var reviewEntry = function(queryResult, cb) {
        var e = queryResult.entry;
        e.reviewed = true;
        e.save(function(err) {
            cb(err, queryResult);
        });
    };

    var updateMatch = function(queryResult, cb) {
        var m = queryResult.match;
        m.determination = reason;
        m.save(function(err) {
            cb(err);
        });
    };

    async.waterfall([queryMatch, queryEntry, reviewEntry, updateMatch], callback);
};
