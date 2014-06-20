"use strict";

var _ = require('underscore');

exports.save = function(dbinfo, secName, input, mergeInfo, callback) {
    var Model = dbinfo.mergeModels[secName];
    var mergeObject = new Model({
        entry_type: dbinfo.sectionToType[secName],
        pat_key: input.pat_key,
        entry: input._id,
        record: mergeInfo.record,
        merged: new Date(),
        merge_reason: mergeInfo.merge_reason
    });

    mergeObject.save(function(err, mergeResult) {
        if (err) {
            callback(err);
        } else {
            if (! input.metadata) {
                input.metadata = {};
            }
            if (! input.metadata.attribution) {
                input.metadata.attribution = [];
            }
            input.metadata.attribution.push(mergeResult._id);
            input.save(function(err, result) {
                if (err) {
                    callback(err);
                } else {
                    callback(null, result._id);
                }
            });
        }
    });
};

exports.getAll = function(dbinfo, secName, ptKey, typeFields, recordFields, callback) {
    var model = dbinfo.mergeModels[secName];
    var allFields = typeFields + ' ' + recordFields + ' reviewed';
    var query = model.find({pat_key: ptKey});
    query.where('archived').in([null, false]);
    query.where('entry_type', dbinfo.sectionToType[secName]);
    query.lean();
    query.populate('entry record', allFields);

    query.exec(function (err, mergeResults) {
        if (err) {
            callback(err);
        } else {
            //Filter out unreviewed entries.
            var returnMerges = [];
            for (var iMerge in mergeResults) {
                if (mergeResults[iMerge].entry.reviewed !== false) {
                    delete mergeResults[iMerge].entry.reviewed;
                    delete mergeResults[iMerge].__v;
                    delete mergeResults[iMerge].pat_key;
                    returnMerges.push(mergeResults[iMerge]);
                }
            }
            callback(null, returnMerges);
        }
    });
};

exports.count = function(dbinfo, secName, ptKey, conditions, callback) {
    var model = dbinfo.mergeModels[secName];
    var condsWPat = _.clone(conditions);
    condsWPat.pat_key = ptKey;
    var query = model.find({});
    query.where(condsWPat);
    query.populate('entry');
    query.exec(function(err, mergeResults) {
        var recCount = mergeResults.reduce(function(r, mergeResult) {
            if (mergeResult.entry.reviewed) {
                r++;
            }
            return r;    
        }, 0);
        callback(null, recCount);
    });
};
