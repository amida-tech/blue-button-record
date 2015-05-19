"use strict";

var _ = require('lodash');
var async = require('async');

var modelutil = require('./modelutil');
var entry = require('./entry');

exports.save = function (dbinfo, secName, input, mergeInfo, callback) {
    var Model = dbinfo.mergeModels[secName];
    var mergeObject = new Model({
        entry_type: secName,
        pat_key: input.pat_key,
        entry: input._id,
        record: mergeInfo.record,
        merged: new Date(),
        merge_reason: mergeInfo.merge_reason
    });

    mergeObject.save(function (err, mergeResult) {
        if (err) {
            callback(err);
        } else {
            input.metadata.attribution.push(mergeResult._id);
            input.save(function (err, result) {
                if (err) {
                    callback(err);
                } else {
                    if (dbinfo.fhir) {
                        var createInfo = {
                            id: result._id.toString(),
                            versionId: input.metadata.attribution.length.toString(),
                            lastUpdated: mergeObject.merged.toISOString()
                        };
                        callback(null, createInfo);
                    } else {
                        callback(null, result._id);
                    }
                }
            });
        }
    });
};

exports.getAll = function (dbinfo, secName, ptKey, typeFields, recordFields, callback) {
    var model = dbinfo.mergeModels[secName];
    var allFields = recordFields;
    var query = model.find({
        pat_key: ptKey
    });
    query.where('archived').in([null, false]);
    query.where('entry_type', secName);
    query.lean();
    query.populate('record', allFields);

    query.exec(function (err, mergeResults) {
        if (err) {
            callback(err);
        } else {
            var f = function (r, cb) {
                entry.getRawFields(dbinfo, secName, ptKey, r.entry, typeFields, cb);
            };
            async.map(mergeResults, f, function (err, entries) {
                if (err) {
                    callback(err);
                } else {
                    var filteredResult = mergeResults.reduce(function (r, m, index) {
                        var e = entries[index];
                        if (e.reviewed !== false) {
                            modelutil.mongooseCleanDocument(e);
                            delete m.__v;
                            delete m.pat_key;
                            m.entry = e;
                            r.push(m);
                        }
                        return r;
                    }, []);
                    callback(null, filteredResult);
                }
            });
        }
    });
};

exports.count = function (dbinfo, secName, ptKey, conditions, callback) {
    var model = dbinfo.mergeModels[secName];
    var condsWPat = _.clone(conditions);
    condsWPat.pat_key = ptKey;
    var query = model.find({});
    query.where(condsWPat);
    query.exec(function (err, mergeResults) {
        if (err) {
            callback(err);
        } else {
            var f = function (r, cb) {
                entry.getRawFields(dbinfo, secName, ptKey, r.entry, undefined, cb);
            };
            async.map(mergeResults, f, function (err, entries) {
                if (err) {
                    callback(err);
                } else {
                    var cnt = entries.reduce(function (r, e) {
                        if (e.reviewed) {
                            ++r;
                        }
                        return r;
                    }, 0);
                    callback(null, cnt);
                }
            });
        }
    });
};
