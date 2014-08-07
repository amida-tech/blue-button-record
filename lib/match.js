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

exports.get = function(dbinfo, secName, ptKey, id, callback) {
    var findRawResult = function(cb) {
        var model = dbinfo.matchModels[secName];
        var query = model.findOne({_id: id, pat_key: ptKey}).lean();
        query.exec(function (err, result) {
            if (err || !result) {
                err ? callback(err) : cb(new Error('no match found'));
            } else {
                delete result.__v;
                delete result.pat_key;
                cb(null, result);
            }
        });
    };

    var populateEntry = function(result, cb) {
        entry.getOnlyHealthFields(dbinfo, secName, ptKey, result.entry, undefined, function(err, entryResult) {
            result.entry = entryResult;
            cb(err, result);
        });
    };

    var populateMatchEntry = function(result, cb) {
        entry.getOnlyHealthFields(dbinfo, secName, ptKey, result.match_entry, undefined, function(err, matchEntryResult) {
            result.match_entry = matchEntryResult;
            cb(err, result);
        });
    };

    async.waterfall([findRawResult, populateEntry, populateMatchEntry], callback);
};

exports.getAll = function(dbinfo, secName, ptKey, fields, callback) {
    var findRawResults = function(cb) {
        var model = dbinfo.matchModels[secName];
        var query = model.find({pat_key: ptKey}).lean();
        query.exec(function (err, results) {
            if (err) {
                cb(err);
            } else {
                var filteredResults = results.filter(function(result) {
                    return result.determination === undefined;
                });
                filteredResults.forEach(function(result) {
                    delete result.__v;
                    delete result.pat_key;
                });
                cb(null, filteredResults);
            }
        });
    };

    var populateEntry = function(result, cb) {
        entry.getOnlyHealthFields(dbinfo, secName, ptKey, result.entry, fields, function(err, entryResult) {
            result.entry = entryResult;
            cb(err, result);
        });
    };

    var populateMatchEntry = function(result, cb) {
        entry.getOnlyHealthFields(dbinfo, secName, ptKey, result.match_entry, fields, function(err, matchEntryResult) {
            result.match_entry = matchEntryResult;
            cb(err, result);
        });
    };

    var populateEntries = function(results, cb) {
        async.map(results, populateEntry, cb);
    };

    var populateMatchEntries = function(results, cb) {
        async.map(results, populateMatchEntry, cb);
    };

    async.waterfall([findRawResults, populateEntries, populateMatchEntries], callback);
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

exports.cancel = function(dbinfo, secName, ptKey, id, reason, callback) {
    var queryMatch = function(cb) {
        var model = dbinfo.matchModels[secName];
        var query = model.findOne({_id: id, pat_key: ptKey});
        query.exec(function(err, result) {
            if (err || result) {
                cb(err, result);
            } else {
                cb(new Error('no match found'));
            }
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

exports.accept = function(dbinfo, secName, ptKey, id, reason, callback) {
    var queryMatch = function(cb) {
        var model = dbinfo.matchModels[secName];
        var query = model.findOne({_id: id, pat_key: ptKey});
        query.exec(function(err, result) {
            if (err || result) {
                var queryResult = {match: result};
                cb(err, queryResult);
            } else {
                cb(new Error('no match found'));                
            }
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
