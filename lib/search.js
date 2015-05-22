"use strict";

var async = require('async');
var mongoose = require('mongoose');

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

var dbObjectToExternal = function (dbObject) {
    var r = {
        _id: dbObject._id.toString(),
        _ptKey: dbObject.pat_key
    };
    if (dbObject._components) {
        r._components = dbObject._components.map(function (c) {
            return c.toString();
        });
    }
    r.data = dbObject.data;
    return r;
};

exports.search = function (dbinfo, searchSpec, callback) {
    var secName = searchSpec.section;
    var queryObject = searchSpec.query || {};
    var findPatientInfo = searchSpec.patientInfo;

    var model = dbinfo.models[secName];

    if (queryObject._id && (typeof queryObject._id === 'string')) {
        queryObject._id = mongoose.Types.ObjectId(queryObject._id);
    }

    var query = model.find(queryObject);
    query.where('archived').in([null, false]);
    query.where('reviewed', true);
    query.sort({
        _id: -1
    });
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
                            var r = dbObjectToExternal(result);
                            r._pt = patientInfos[result.pat_key];
                            return r;
                        });
                        callback(null, cleanedResults);
                    }
                });
            } else {
                var cleanedResults = results.map(dbObjectToExternal);
                callback(null, cleanedResults);
            }
        }
    });
};
