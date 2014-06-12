"use strict";

var _ = require('underscore');
var async = require('async');

var merge = require('./merge');
var modelutil = require('./modelutil');
var match = require('./match');
var entry = require('./entry');

var localGet = function(dbinfo, secName, ptKey, reviewed, callback) {
    var model = dbinfo.models[secName];

    var query = model.find({});
    query.where('archived').in([null, false]);
    query.where('reviewed', reviewed);
    query.where('patKey', ptKey);
    query.lean();
    query.populate('metadata.attribution', 'record_id merge_reason merged');

    query.exec(function(err, results) {
        if (err) {
            callback(err);
        } else {
            dbinfo.storageModel.populate(results, {
                path: 'metadata.attribution.record_id',
                select: 'filename'
            }, function(err, docs) {
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

exports.get = function(dbinfo, secName, ptKey, callback) {
    localGet(dbinfo, secName, ptKey, true, callback);
};

exports.getPartial = function(dbinfo, secName, ptKey, callback) {
    localGet(dbinfo, secName, ptKey, false, callback);
};

exports.save = function(dbinfo, secName, ptKey, input, sourceId, callback) {
    var localSaveNewEntry = function(entryObject, cb) {
        entry.save(dbinfo, secName, entryObject, sourceId, cb);    
    };

    var prepForDb = function(entryObject) {
        var r = _.clone(entryObject);
        r.patKey = ptKey;
        r.reviewed = true;
        return r;
    };

    if (_.isArray(input)) {
        if (input.length === 0) {
            callback(new Error('no data'));
        } else {
            var inputArrayForDb = input.map(prepForDb);
            async.map(inputArrayForDb, localSaveNewEntry, callback);
        }
    } else {
        var inputForDb = prepForDb(input);
        localSaveNewEntry(inputForDb, callback);
    }
};

exports.savePartial = function(dbinfo, secName, ptKey, input, sourceId, callback) {
    var savePartialEntry = function(entryObject, cb) {
        var localSaveNewEntry = function(cb2) {
            entry.save(dbinfo, secName, entryObject.entry, sourceId, cb2);    
        };

        function savePartialMatch (matchEntryId, cb2) {
            var tmpMatch = {
                patKey: ptKey,
                entry_type: dbinfo.sectionToType[secName],
                entry_id: entryObject.matchRecordId,
                match_entry_id: matchEntryId
            };

            var matchObject = entryObject.match;
            dbinfo.matchFieldNames().forEach(function(key) {
                if (matchObject[key]) {
                    tmpMatch[key] = matchObject[key];
                }
            }); 

            match.save(dbinfo, secName, tmpMatch, cb2);
        }

        async.waterfall([localSaveNewEntry, savePartialMatch], cb);
    };

    var prepForDb = function(entry) {
        var r = {};        
        var entryForDb = _.clone(entry.partial_array);
        entryForDb.reviewed = false;
        entryForDb.patKey = ptKey;
        r.entry = entryForDb;
        r.match = entry.partial_match;
        r.matchRecordId = entry.match_record_id;
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
