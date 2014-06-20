"use strict";

var _ = require('underscore');

exports.save = function(dbinfo, secName, input, mergeInfo, callback) {
    var Model = dbinfo.mergeModels[secName];
    var mergeObject = new Model({
        entry_type: secName,
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
    query.where('entry_type', secName);
    query.lean();
    query.populate('entry record', allFields);

    query.exec(function (err, mergeResults) {
        if (err) {
            callback(err);
        } else {
            var filteredResult = mergeResults.reduce(function(r, mergeResult) {
                if (mergeResult.entry.reviewed !== false) {
                    delete mergeResult.entry.reviewed;
                    delete mergeResult.__v;
                    delete mergeResult.pat_key;
                    r.push(mergeResult);
                }
                return r;
            }, []);
            callback(null, filteredResult);
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
        if (err) {
            callback(err);
        } else {
           var recCount = mergeResults.reduce(function(r, mergeResult) {
               if (mergeResult.entry.reviewed) {
                   r++;
               }
               return r;    
           }, 0);
           callback(null, recCount);
        }
    });
};
