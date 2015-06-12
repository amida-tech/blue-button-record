"use strict";

var _ = require('lodash');
var mongoose = require('mongoose');
var async = require('async');

var merge = require('./merge');
var modelutil = require('./modelutil');
var match = require('./match');
var entry = require('./entry');

var localGet = function (dbinfo, secName, ptKey, reviewed, callback) {
    var model = dbinfo.models[secName];

    var query = model.find({});
    query.where('archived').in([null, false]);
    query.where('hidden').in([null, false]);
    query.where('reviewed', reviewed);
    query.where('pat_key', ptKey);
    query.lean();
    query.populate('metadata.attribution', 'record merge_reason merged -_id');

    query.exec(function (err, results) {
        if (err) {
            callback(err);
        } else {
            dbinfo.storageModel.populate(results, {
                path: 'metadata.attribution.record',
                select: 'filename'
            }, function (err, docs) {
                if (err) {
                    callback(err);
                } else {
                    modelutil.mongooseCleanSection(docs);
                    callback(null, docs);
                }
            });
        }
    });
};

exports.get = function (dbinfo, secName, ptKey, callback) {
    localGet(dbinfo, secName, ptKey, true, callback);
};

exports.getPartial = function (dbinfo, secName, ptKey, callback) {
    localGet(dbinfo, secName, ptKey, false, callback);
};

exports.save = function (dbinfo, secName, ptKey, input, sourceId, options, callback) {
    if (callback || options) {
        if (!callback) {
            callback = options;
            options = {};
        }
        if (!options) {
            options = {};
        }
    }
    var localSaveNewEntry = function (entryObject, cb) {
        entry.save(dbinfo, secName, entryObject, sourceId, options, cb);
    };

    var prepForDb = function (entryObject) {
        var r = {
            pat_key: ptKey,
            reviewed: true
        };
        if (entryObject) {
            var d = _.clone(entryObject);
            if (d._id) {
                r._id = d._id;
                delete d._id;
            }
            r.data = d;
            if (d._components) {
                r._components = d._components;
                delete d._components;
            }
            if (d._link) {
                r._link = d._link;
                delete d._link;
            }
            if (d._resource) {
                r._resource = d._resource;
                delete d._resource;
            }
        }
        return r;
    };

    if (_.isArray(input)) {
        if (input.length === 0) {
            callback(null, null);
        } else {
            var inputArrayForDb = input.map(prepForDb);
            async.mapSeries(inputArrayForDb, localSaveNewEntry, callback);
        }
    } else {
        var inputForDb = prepForDb(input);
        localSaveNewEntry(inputForDb, callback);
    }
};

exports.savePartial = function (dbinfo, secName, ptKey, input, sourceId, callback) {
    var savePartialEntry = function (entryObject, cb) {

        var localSaveNewEntry = function (cb2) {
            entry.save(dbinfo, secName, entryObject.entry, sourceId, cb2);
        };

        function savePartialMatch(matchEntryId, cb2) {
            var tmpMatch = {
                pat_key: ptKey,
                entry_type: secName,
                entry: matchEntryId,
                matches: entryObject.matches
            };
            match.save(dbinfo, secName, tmpMatch, cb2);
        }

        async.waterfall([localSaveNewEntry, savePartialMatch], cb);
    };

    var prepForDb = function (entry) {

        var r = {};
        var d = _.clone(entry.partial_entry);
        var entryForDb = {
            data: d,
            reviewed: false,
            pat_key: ptKey
        };
        r.entry = entryForDb;
        r.matches = _.clone(entry.partial_matches);
        return r;

    };

    if (_.isArray(input)) {
        if (input.length === 0) {
            callback(new Error('no data'));
        } else {
            var inputArrayForDb = input.map(prepForDb);
            async.map(inputArrayForDb, savePartialEntry, callback);
        }
    } else {
        var inputForDb = prepForDb(input);
        savePartialEntry(inputForDb, callback);
    }
};
