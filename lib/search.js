"use strict";

var async = require('async');
var mongoose = require('mongoose');
var _ = require('lodash');

var patientKeyToInfo = function (dbinfo, ptKey, callback) {
    var model = dbinfo.models[dbinfo.demographicsSection];
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
        _ptKey: dbObject.pat_key,
        _section: dbObject._section
    };
    if (dbObject._components) {
        r._components = dbObject._components.map(function (c) {
            return c.toString();
        });
    }
    r.data = dbObject.data;
    return r;
};

var searchAllIdsForSection = function (dbinfo, sectionName, searchSpec, callback) {
    var queryObject = searchSpec.query || {};

    var model = dbinfo.models[sectionName];

    if (queryObject._id) {
        queryObject._id = mongoose.Types.ObjectId(queryObject._id);
    }

    var query = model.find(queryObject);
    query.where('archived').in([null, false]);
    query.where('reviewed', true);
    query.sort({
        _id: -1
    });
    query.lean();
    query.select('_id');
    query.exec(function (err, results) {
        if (err) {
            callback(err);
        } else {
            var returnResult = results.map(function (result) {
                return {
                    id: result._id.toString(),
                    sectionName: sectionName
                };
            });
            callback(null, returnResult);
        }
    });
};

var searchAllIds = function (dbinfo, searchSpec, callback) {
    var sectionName = searchSpec.section;
    searchAllIdsForSection(dbinfo, sectionName, searchSpec, callback);
};

var fillSearchPage = function (dbinfo, entries, searchSpec, searchInfo, callback) {
    var fn = function (entry, cb) {
        var sectionName = entry.sectionName;
        var model = dbinfo.models[sectionName];
        model.findOne({
            _id: entry.id
        }, function (err, result) {
            if (!err) {
                result._section = entry.sectionName;
            }
            cb(err, result);
        });
    };
    async.mapSeries(entries, fn, function (err, results) {
        if (err) {
            callback(err);
        } else {
            var findPatientInfo = searchSpec.patientInfo;
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
                        callback(null, cleanedResults, searchInfo);
                    }
                });
            } else {
                var cleanedResults = results.map(dbObjectToExternal);
                callback(null, cleanedResults, searchInfo);
            }
        }
    });
};

var insertPages = function (dbinfo, searchSpec, entries, callback) {
    var SearchPageModel = dbinfo.searchPageModel;
    var chunks = _.chunk(entries, dbinfo.maxSearch);
    var fn = function (chunk, cb) {
        var obj = new SearchPageModel({
            entries: chunk
        });
        obj.save(function (err, result) {
            if (err) {
                cb(err);
            } else {
                cb(null, result._id);
            }
        });
    };
    async.mapSeries(chunks, fn, function (err, pageIds) {
        if (err) {
            callback(err);
        } else {
            var SearchModel = dbinfo.searchModel;
            var obj = new SearchModel({
                spec: searchSpec,
                pages: pageIds,
                pageSize: dbinfo.maxSearch,
                total: entries.length
            });
            obj.save(callback);
        }
    });
};

var newSearchFromIds = function (dbinfo, entries, searchSpec, callback) {
    var n = entries.length;
    if (n === 0) {
        callback(null, [], {
            page: 0,
            pageSize: dbinfo.maxSearch,
            total: 0
        });
        return;
    }
    var searchInfo;
    if (n <= dbinfo.maxSearch) {
        searchInfo = {
            page: 0,
            pageSize: dbinfo.maxSearch,
            total: n
        };
        fillSearchPage(dbinfo, entries, searchSpec, searchInfo, callback);
    } else {
        searchInfo = {
            page: 0,
            pageSize: dbinfo.maxSearch,
            total: n
        };
        insertPages(dbinfo, searchSpec, entries, function (err, result) {
            if (err) {
                callback(err);
            } else {
                searchInfo.searchId = result._id.toString();
                fillSearchPage(dbinfo, entries.slice(0, dbinfo.maxSearch), searchSpec, searchInfo, callback);
            }
        });
    }
};

var newSearch = function (dbinfo, searchSpec, callback) {
    searchAllIds(dbinfo, searchSpec, function (err, entries) {
        if (err) {
            callback(err);
        } else {
            newSearchFromIds(dbinfo, entries, searchSpec, callback);
        }
    });
};

var existingSearch = function (dbinfo, searchSpec, callback) {
    var searchModel = dbinfo.searchModel;
    searchModel.findOne({
        _id: searchSpec.searchId
    }, function (err, result) {
        if (err) {
            callback(err);
        } else if (!result) {
            callback(new Error('Invalid search identifier.'));
        } else {
            var pageIds = result.pages;
            var pageIndex = searchSpec.page;
            if (pageIndex >= pageIds.length) {
                callback(new Error('Invalid page number'));
            } else {
                var pageId = pageIds[pageIndex];
                var searchPageModel = dbinfo.searchPageModel;
                searchPageModel.findOne({
                    _id: pageId
                }, function (err, page) {
                    if (err) {
                        callback(err);
                    } else {
                        var searchInfo = {
                            searchId: searchSpec.searchId,
                            page: pageIndex,
                            pageSize: result.pageSize,
                            total: result.total
                        };
                        fillSearchPage(dbinfo, page.entries, result.spec, searchInfo, callback);
                    }
                });
            }
        }
    });
};

exports.search = function (dbinfo, searchSpec, callback) {
    if (searchSpec.searchId) {
        existingSearch(dbinfo, searchSpec, callback);
    } else {
        var sectionInfo = searchSpec.section;
        if (Array.isArray(sectionInfo)) {
            var fn = function (sectionName, cb) {
                searchAllIdsForSection(dbinfo, sectionName, searchSpec, cb);
            };
            async.map(sectionInfo, fn, function (err, results) {
                if (err) {
                    callback(err);
                } else {
                    var entries = _.flatten(results);
                    entries.sort(function (entryL, entryR) {
                        var idL = entryL.id.toString();
                        var idR = entryR.id.toString();
                        return idR.localeCompare(idL);
                    });
                    newSearchFromIds(dbinfo, entries, searchSpec, callback);
                }
            });
        } else {
            newSearch(dbinfo, searchSpec, callback);
        }
    }
};
