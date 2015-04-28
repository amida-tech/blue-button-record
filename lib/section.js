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

exports.save = function (dbinfo, secName, ptKey, input, sourceId, callback) {
    var localSaveNewEntry = function (entryObject, cb) {
        entry.save(dbinfo, secName, entryObject, sourceId, cb);
    };

    var prepForDb = function (entryObject) {
        var d = _.clone(entryObject);
        var r = {
            data: d,
            pat_key: ptKey,
            reviewed: true
        };
        return r;
    };

    if (_.isArray(input)) {
        if (input.length === 0) {
            callback(null, null);
        } else {
            var inputArrayForDb = input.map(prepForDb);
            async.map(inputArrayForDb, localSaveNewEntry, callback);
        }
    } else {
        var inputForDb = prepForDb(input);
        localSaveNewEntry(inputForDb, callback);
    }
};

exports.savePartial = function (dbinfo, secName, ptKey, input, sourceId, callback) {

    //console.log(input);

    var savePartialEntry = function (entryObject, cb) {

        //console.log(entryObject);

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

            //console.log(JSON.stringify(inputArrayForDb, null, 10));

            async.map(inputArrayForDb, savePartialEntry, callback);
        }
    } else {
        var inputForDb = prepForDb(input);
        savePartialEntry(inputForDb, callback);
    }
};

var patientKeyToInfo = function (dbinfo, ptKey, callback) {
    var model = dbinfo.models['demographics'];
    var query = model.findOne({
        'pat_key': ptKey
    });
    query.exec(function (err, current) {
        if (err) {
            callback(err);
        } else {
            var name = current.data.name;
            var patientInfo = {
                reference: current._id.toString(),
                display: name.last + ' ' + name.first
            };
            callback(null, patientInfo);
        }
    });
};

exports.getMulti = function (dbinfo, secName, queryObject, findPatientInfo, callback) {
    var model = dbinfo.models[secName];
    queryObject = queryObject || {};

    if (queryObject._id && (typeof queryObject._id === 'string')) {
        queryObject._id = mongoose.Types.ObjectId(queryObject._id);
    }

    var query = model.find(queryObject);
    query.where('archived').in([null, false]);
    query.where('reviewed', true);
    query.lean();

    query.exec(function (err, results) {
        if (err) {
            callback(err);
        } else {
            if (findPatientInfo) {
                var patientInfos = results.reduce(function (r, result) {
                    var patKey = result.pat_key;
                    r[patKey] = null;
                    return r;
                }, {});
                var f = function (ptKey, cb) {
                    patientKeyToInfo(dbinfo, ptKey, cb);
                };
                var ptKeys = Object.keys(patientInfos);
                async.mapSeries(ptKeys, f, function (err, ptInfos) {
                    if (err) {
                        callback(err);
                    } else {
                        ptInfos.forEach(function (ptInfo, index) {
                            patientInfos[ptKeys[index]] = ptInfo;
                        });
                        var cleanedResults = results.map(function (result) {
                            var r = result.data;
                            r._id = result._id;
                            r._pt = patientInfos[result.pat_key];
                            return r;
                        });
                        callback(null, cleanedResults);
                    }
                });
            } else {
                var cleanedResults = results.map(function (result) {
                    var r = result.data;
                    r._id = result._id;
                    return r;
                });
                callback(null, cleanedResults);
            }
        }
    });
};
