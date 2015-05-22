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

exports.search = function (dbinfo, secName, queryObject, findPatientInfo, callback) {
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
                            var r = {};
                            r.data = result.data;
                            r._id = result._id.toString();
                            r._pt = patientInfos[result.pat_key];
                            r._ptKey = result.pat_key;
                            r._components = result._components.map(function (c) {
                                return c.toString();
                            });
                            return r;
                        });
                        callback(null, cleanedResults);
                    }
                });
            } else {
                var cleanedResults = results.map(function (result) {
                    var r = {};
                    r.data = result.data;
                    r._id = result._id.toString();
                    r._ptKey = result.pat_key;
                    return r;
                });
                callback(null, cleanedResults);
            }
        }
    });
};
