"use strict";

var chai = require('chai');
var async = require('async');
var _ = require('lodash');
var util = require('util');

var db = require('../../lib/db');
var section = require('../../lib/section');
var match = require('../../lib/match');
var storage = require('../../lib/storage');
var allsections = require('../../lib/allsections');

var expect = chai.expect;
chai.config.includeStack = true;

var testObjectInstance = exports.testObjectInstance = {
    testallergies: function (suffix) {
        return {
            name: 'name' + suffix,
            severity: 'severity' + suffix,
            value: {
                code: 'code' + suffix,
                display: 'display' + suffix
            }
        };
    },
    testprocedures: function (suffix) {
        return {
            name: 'name' + suffix,
            proc_type: 'proc_type' + suffix,
            proc_value: {
                code: 'code' + suffix,
                display: 'display' + suffix
            }
        };
    },
    testdemographics: function (suffix) {
        return {
            name: {
                first: 'first' + suffix,
                last: 'last' + suffix,
                middle: [
                    'amid' + suffix,
                    'bmif' + suffix
                ]
            }
        };
    }
};

var matchObjectInstance = exports.matchObjectInstance = {
    diff: function (suffix, entryIndex) {
        return {
            match: 'diff',
            diff: 'diff' + suffix
        };
    },
    partial: function (suffix, entryIndex) {
        return {
            match: 'partial',
            percent: (entryIndex + 1) * 10,
            diff: 'diff' + suffix
        };
    },
    diffsub: function (suffix, entryIndex) {
        return {
            match: 'diff',
            diff: 'diff' + suffix,
            subelements: 'subelements' + suffix
        };
    },
    partialsub: function (suffix, entryIndex) {
        return {
            match: 'partial',
            percent: (entryIndex + 1) * 10,
            diff: 'diff' + suffix,
            subelements: 'subelements' + suffix
        };
    }
};

var createStorage = function (context, pat, filename, index, callback) {
    storage.saveSource(context.dbinfo, pat, 'content', {
        type: 'text/xml',
        name: filename
    }, 'ccda', function (err, id) {
        if (err) {
            callback(err);
        } else {
            expect(id).to.exist;
            if (!context.storageIds) {
                context.storageIds = {};
            }
            context.storageIds[index] = id;
            callback();
        }
    });
};

var createTestSection = exports.createTestSection = function (secName, sourceIndex, count) {
    return _.range(count).reduce(function (r, i) {
        var suffix = '_' + sourceIndex + '.' + i;
        r[i] = testObjectInstance[secName](suffix);
        return r;
    }, []);
};

var newEntriesContextKey = exports.newEntriesContextKey = function (secName, sourceIndex) {
    return util.format("new.%s.%s", secName, sourceIndex);
};

var partialEntriesContextKey = exports.partialEntriesContextKey = function (secName, sourceIndex) {
    return util.format("partial.%s.%s", secName, sourceIndex);
};

exports.propertyToFilename = function (value) {
    var n = value.length;
    return util.format('c%s%s.xml', value.charAt(n - 5), value.charAt(n - 3));
};

var pushToContext = function (context, keyGen, secName, sourceIndex, values) {
    if (values) {
        var key = keyGen(secName, sourceIndex);
        var r = context[key];
        if (!r) {
            r = context[key] = [];
        }
        Array.prototype.push.apply(r, values);
    }
};

exports.saveAllSections = function (ptKey, sourceIndex, counts, context, callback) {
    var a = createTestSection('testallergies', sourceIndex, counts[0]);
    var p = createTestSection('testprocedures', sourceIndex, counts[1]);
    var d = createTestSection('testdemographics', sourceIndex, 1);
    var r = {
        testallergies: a,
        testprocedures: p,
        testdemographics: d[0]
    };
    var sourceId = context.storageIds[sourceIndex];
    allsections.save(context.dbinfo, ptKey, r, sourceId, callback);
};

var saveSection = exports.saveSection = function (context, secName, pat_key, sourceIndex, count, callback) {
    var data = createTestSection(secName, sourceIndex, count);
    var sourceId = context.storageIds[sourceIndex];
    section.save(context.dbinfo, secName, pat_key, data, sourceId, function (err, ids) {
        if (!err) {
            pushToContext(context, newEntriesContextKey, secName, sourceIndex, ids);
        }
        callback(err);
    });
};

exports.saveMatches = function (context, secName, pat_key, sourceIndex, destsourceIndex, extraContent, callback) {
    var data = createTestSection(secName, sourceIndex, extraContent.length);
    var sourceId = context.storageIds[sourceIndex];
    var key = newEntriesContextKey(secName, destsourceIndex);
    var extendedData = data.reduce(function (r, e, index) {
        var v = {
            partial_entry: e,
            partial_matches: [{
                match_entry: context[key][extraContent[index].destIndex],
                match_object: extraContent[index].matchObject
            }]
        };
        r.push(v);
        return r;
    }, []);

    section.savePartial(context.dbinfo, secName, pat_key, extendedData, sourceId, function (err, result) {
        if (!err) {
            pushToContext(context, partialEntriesContextKey, secName, sourceIndex, result);
        }
        callback(err);
    });
};

var setConnectionContext = function (overrideOptions, context, callback) {
    var options = {
        dbName: 'testrefModel',
        supported_sections: ['testallergies', 'testprocedures', 'testdemographics'],
        demographicsSection: 'testdemographics'
    };
    if (overrideOptions) {
        _.merge(options, overrideOptions);
    }
    db.connect('localhost', options, function (err, result) {
        if (err) {
            callback(err);
        } else {
            context.dbinfo = result;
            callback();
        }
    });
};

exports.prepareConnection = function (options, context) {
    if (typeof options === 'string') {
        options = {
            dbName: options
        };
    }

    return function () {
        before(function (done) {
            setConnectionContext(options, context, function (err) {
                if (err) {
                    done(err);
                } else {
                    context.dbinfo.db.dropDatabase(done);
                }
            });
        });

        it('check connection and models', function (done) {
            expect(context.dbinfo).to.exist;
            expect(context.dbinfo.db).to.exist;
            expect(context.dbinfo.GridStore).to.exist;
            expect(context.dbinfo.ObjectID).to.exist;
            expect(context.dbinfo.models).to.exist;
            expect(context.dbinfo.models.testallergies).to.exist;
            expect(context.dbinfo.models.testprocedures).to.exist;
            expect(context.dbinfo.models.testdemographics).to.exist;
            done();
        });
    };
};

var addSourcesPerPatient = exports.addSourcesPerPatient = function (context, countPerPatient, callback) {
    var fs = countPerPatient.reduce(function (r, fileCount, i) {
        var pat_key = util.format('pat%d', i);
        return _.range(fileCount).reduce(function (q, j) {
            var filename = util.format('c%d%d.xml', i, j);
            var sourceIndex = util.format('%d.%d', i, j);
            var f = function (cb) {
                createStorage(context, pat_key, filename, sourceIndex, cb);
            };
            q.push(f);
            return q;
        }, r);
    }, []);

    async.series(fs, callback);
};

exports.createMatchInformation = function (sourceIndex, destIndices, matchTypes) {
    return matchTypes.reduce(function (r, matchType, index) {
        var destIndex = destIndices[index];
        var suffix = '_' + sourceIndex + '.' + destIndex;
        var v = {
            matchObject: matchObjectInstance[matchType](suffix, destIndex),
            destIndex: destIndex
        };
        r.push(v);
        return r;
    }, []);
};

exports.cancelMatch = function (context, secName, ptKey, recordKey, index, callback) {
    var key = partialEntriesContextKey(secName, recordKey);
    var id = context[key][index]._id;
    match.cancel(context.dbinfo, secName, ptKey, id, 'cancel_' + recordKey + '.' + index, callback);
};

exports.acceptMatch = function (context, secName, ptKey, recordKey, index, callback) {
    var key = partialEntriesContextKey(secName, recordKey);
    var id = context[key][index]._id;
    match.accept(context.dbinfo, secName, ptKey, id, 'accept_' + recordKey + '.' + index, callback);
};
