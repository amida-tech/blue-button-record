'use strict';

var mongoose = require('mongoose');
var _ = require('lodash');

exports.save = function (dbinfo, secName, ptKey, bundleElements, bundleData, sourceId, callback) {
    bundleElements = _.cloneDeep(bundleElements);
    bundleData = _.cloneDeep(bundleData);
    var model = dbinfo.bundleModels[secName]({
        pat_key: ptKey,
        entry_type: secName,
        elements: bundleElements,
        data: bundleData,
        archieved: false
    });
    model.save(function (err, result) {
        if (err) {
            callback(err);
        } else {
            callback(null, result._id.toString());
        }
    });
};

exports.replace = function (dbinfo, secName, ptKey, id, bundleElements, bundleData, sourceId, callback) {
    if (typeof id === 'string') {
        id = mongoose.Types.ObjectId(id);
    }
    bundleElements = _.cloneDeep(bundleElements);
    bundleData = _.cloneDeep(bundleData);

    var model = dbinfo.bundleModels[secName];
    var queryObject = {
        '_id': id,
        pat_key: ptKey
    };
    var query = model.findOne(queryObject);
    query.where('archived').in([null, false]);
    query.exec(function (err, bundle) {
        if (err || !bundle) {
            err ? callback(err) : callback(new Error('no bundle found.'));
        } else {
            if (bundleElements) {
                bundle.elements = bundleElements;
            }
            if (bundleData) {
                bundle.data = bundleData;
            }
            bundle.save(callback);
        }
    });
};

exports.remove = function (dbinfo, secName, ptKey, id, callback) {
    if (typeof id === 'string') {
        id = mongoose.Types.ObjectId(id);
    }
    var model = dbinfo.bundleModels[secName];
    var query = model.update({
        _id: id
    }, {
        archived: true
    });
    query.exec(callback);
};

exports.getMulti = function (dbinfo, secName, queryObject, callback) {
    var model = dbinfo.bundleModels[secName];
    queryObject = queryObject || {};

    if (queryObject._id && (typeof queryObject._id === 'string')) {
        queryObject._id = mongoose.Types.ObjectId(queryObject._id);
    }

    var query = model.find(queryObject);
    query.where('archived').in([null, false]);

    query.exec(function (err, results) {
        if (err) {
            callback(err);
        } else {
            var cleanedResults = results.map(function (result) {
                var r = {
                    _id: result._id.toString(),
                    elements: result.elements.map(function(e) {
                        return e.toString();
                    }),
                    data: result.data
                }
                 return r;
            });
            callback(null, cleanedResults);
        }
    });
};
