"use strict";

var async = require('async');

var section = require('./section');
var entry = require('./entry');
var modelutil = require('./modelutil');

exports.save = function (dbinfo, secName, input, callback) {
    var Model = dbinfo.matchModels[secName];
    var m = new Model(input);
    m.save(callback);
};

exports.get = function (dbinfo, secName, ptKey, id, callback) {
    var findRawResult = function (cb) {
        var model = dbinfo.matchModels[secName];
        var query = model.findOne({
            _id: id,
            pat_key: ptKey
        }).lean();
        query.exec(function (err, result) {
            if (err || !result) {
                err ? callback(err) : cb(new Error('no match found'));
            } else {
                modelutil.cleanMatchDocument(result);
                cb(null, result);
            }
        });
    };

    var populateEntry = function (result, cb) {
        entry.getOnlyHealthFields(dbinfo, secName, ptKey, result.entry, undefined, function (err, entryResult) {
            result.entry = entryResult;
            cb(err, result);
        });
    };

    var populateMatchEntry = function (result, cb) {

        function getSubRecords(item, callback) {

            entry.getOnlyHealthFields(dbinfo, secName, ptKey, item.match_entry, undefined, function (err, matchEntryResult) {
                item.match_entry = matchEntryResult;
                callback(err, item);
            });
        }

        async.map(result.matches, getSubRecords, function (err, results) {
            if (err) {
                cb(err);
            } else {
                result.matches = results;
                cb(null, result);
            }
        });

    };

    async.waterfall([findRawResult, populateEntry, populateMatchEntry], callback);
};

exports.getAll = function (dbinfo, secName, ptKey, fields, callback) {
    var findRawResults = function (cb) {
        var model = dbinfo.matchModels[secName];
        var query = model.find({
            pat_key: ptKey
        }).lean();
        query.exec(function (err, results) {
            if (err) {
                cb(err);
            } else {
                var filteredResults = results.filter(function (result) {
                    return result.determination === undefined;
                });
                filteredResults.forEach(function (result) {
                    modelutil.cleanMatchDocument(result);
                });

                cb(null, filteredResults);
            }
        });
    };

    var populateEntry = function (result, cb) {

        entry.getOnlyHealthFields(dbinfo, secName, ptKey, result.entry, fields, function (err, entryResult) {
            result.entry = entryResult;
            cb(err, result);
        });
    };

    var populateMatchEntry = function (result, cb) {

        function getSubRecords(item, callback) {
            entry.getOnlyHealthFields(dbinfo, secName, ptKey, item.match_entry, fields, function (err, matchEntryResult) {
                item.match_entry = matchEntryResult;
                callback(err, item);
            });
        }

        async.map(result.matches, getSubRecords, function (err, results) {
            if (err) {
                cb(err);
            } else {
                result.matches = results;
                cb(null, result);
            }
        });

    };

    var populateEntries = function (results, cb) {
        async.map(results, populateEntry, cb);
    };

    var populateMatchEntries = function (results, cb) {
        async.map(results, populateMatchEntry, cb);
    };

    async.waterfall([findRawResults, populateEntries, populateMatchEntries], callback);
};

exports.count = function (dbinfo, secName, ptKey, conditions, callback) {

    //need to find all objects, then query all sub elements to find options.

    var model = dbinfo.matchModels[secName];
    var query = model.count();
    query.where('determination').in([null, false]);
    var c = Object.keys(conditions).reduce(function (r, key) {
        r['matches.match_object.' + key] = conditions[key];
        return r;
    }, {});

    c.pat_key = ptKey;
    query.where(c);
    query.exec(callback);
};

exports.cancel = function (dbinfo, secName, ptKey, id, reason, callback) {
    var queryMatch = function (cb) {
        var model = dbinfo.matchModels[secName];
        var query = model.findOne({
            _id: id,
            pat_key: ptKey
        });
        query.exec(function (err, result) {
            if (err || result) {
                cb(err, result);
            } else {
                cb(new Error('no match found'));
            }
        });
    };

    var removeEntry = function (result, cb) {
        entry.remove(dbinfo, secName, ptKey, result.entry, function (err) {
            cb(err, result);
        });
    };

    var updateMatch = function (result, cb) {
        result.determination = reason;
        result.save(function (err) {
            cb(err);
        });
    };

    async.waterfall([queryMatch, removeEntry, updateMatch], callback);
};

exports.accept = function (dbinfo, secName, ptKey, id, reason, callback) {
    var queryMatch = function (cb) {
        var model = dbinfo.matchModels[secName];
        var query = model.findOne({
            _id: id,
            pat_key: ptKey
        });
        query.exec(function (err, result) {
            if (err || result) {
                var queryResult = {
                    match: result
                };
                cb(err, queryResult);
            } else {
                cb(new Error('no match found'));
            }
        });
    };

    var queryEntry = function (queryResult, cb) {

        var entryId = queryResult.match.entry;
        var model = dbinfo.models[secName];
        var query = model.findOne({
            "_id": entryId
        });
        query.exec(function (err, entry) {

            //console.log(entry);

            queryResult.entry = entry;

            cb(err, queryResult);
        });
    };

    var reviewEntry = function (queryResult, cb) {
        var e = queryResult.entry;
        e.reviewed = true;
        e.save(function (err) {
            cb(err, queryResult);
        });
    };

    var updateMatch = function (queryResult, cb) {
        var m = queryResult.match;
        m.determination = reason;
        m.save(function (err) {
            cb(err);
        });
    };

    async.waterfall([queryMatch, queryEntry, reviewEntry, updateMatch], callback);
};
