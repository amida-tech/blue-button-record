"use strict";

var _ = require('underscore');
var async = require('async');

var merge = require('./merge');
var modelutil = require('./modelutil');
var match = require('./match');
var entry = require('./entry');

var localGet = function (dbinfo, callback) {
    var secName = "demographics";
    var reviewed = true; //(only actual/current MHR records)
    var model = dbinfo.models[secName];

    var query = model.find({});
    query.where('archived').in([null, false]);
    query.where('reviewed', reviewed);
    query.lean();
    //query.populate('metadata.attribution', 'record merge_reason merged -_id');

    query.exec(function (err, results) {
        if (err) {
            callback(err);
        } else {
            //dbinfo.storageModel.populate(results, {
            //    path: 'metadata.attribution.record',
            //    select: 'filename'
            //}, function (err, docs) {
            if (err) {
                callback(err);
            } else {
                //modelutil.mongooseCleanSection(docs);
                //callback(null, docs);
                callback(null, results);
            }
            //});
        }
    });
};

exports.get = function (dbinfo, ptInfo, callback) {
    //TODO: ignore patient info for PIM query for now
    localGet(dbinfo, callback);
};
