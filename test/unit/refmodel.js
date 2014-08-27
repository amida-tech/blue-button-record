"use strict";

var chai = require('chai');
var async = require('async');
var _ = require('underscore');
var util = require('util');

var db = require('../../lib/db');
var section = require('../../lib/section');
var match = require('../../lib/match');
var storage = require('../../lib/storage');

var expect = chai.expect;
chai.config.includeStack = true;

var schemas = {
    testallergies: {
        name: 'string',
        severity: 'string',
        value: {
            code: 'string',
            display: 'string'
        }
    },
    testprocedures: {
        name: 'string',
        proc_type: 'string',
        proc_value: {
            code: 'string',
            display: 'string'
        }
    },
    testdemographics: {
        name: 'string',
        lastname: 'string',
    }
};

var getConnectionOptions = function (dbName) {
    return {
        dbName: dbName,
        supported_sections: ['testallergies', 'testprocedures', 'testdemographics']
    };
};

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
            name: 'name' + suffix,
            lastname: 'lastname' + suffix
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

var createTestSection = exports.createTestSection = function (secName, recordIndex, count) {
    return _.range(count).reduce(function (r, i) {
        var suffix = '_' + recordIndex + '.' + i;
        r[i] = testObjectInstance[secName](suffix);
        return r;
    }, []);
};

var newEntriesContextKey = exports.newEntriesContextKey = function (secName, recordIndex) {
    return util.format("new.%s.%s", secName, recordIndex);
};

var partialEntriesContextKey = exports.partialEntriesContextKey = function (secName, recordIndex) {
    return util.format("partial.%s.%s", secName, recordIndex);
};

exports.propertyToFilename = function (value) {
    var n = value.length;
    return util.format('c%s%s.xml', value.charAt(n - 5), value.charAt(n - 3));
};

var pushToContext = exports.pushToContext = function (context, keyGen, secName, recordIndex, values) {
    if (values) {
        var key = keyGen(secName, recordIndex);
        var r = context[key];
        if (!r) {
            r = context[key] = [];
        }
        Array.prototype.push.apply(r, values);
    }

    //console.log(context);
};

var saveSection = exports.saveSection = function (context, secName, pat_key, recordIndex, count, callback) {
    var data = createTestSection(secName, recordIndex, count);
    var sourceId = context.storageIds[recordIndex];
    section.save(context.dbinfo, secName, pat_key, data, sourceId, function (err, ids) {
        if (!err) {
            pushToContext(context, newEntriesContextKey, secName, recordIndex, ids);
        }
        callback(err);
    });
};

exports.saveMatches = function (context, secName, pat_key, recordIndex, destRecordIndex, extraContent, callback) {
    var data = createTestSection(secName, recordIndex, extraContent.length);
    var sourceId = context.storageIds[recordIndex];
    var key = newEntriesContextKey(secName, destRecordIndex);
    var extendedData = data.reduce(function (r, e, index) {

        //console.log(e);


        var v = {
            partial_entry: e,
            partial_matches: [{
                match_entry: context[key][extraContent[index].destIndex],
                match_object: extraContent[index].matchObject
            }]
        };

        //console.log(JSON.stringify(v, null, 10));

        r.push(v);
        return r;
    }, []);

    section.savePartial(context.dbinfo, secName, pat_key, extendedData, sourceId, function (err, result) {
        if (!err) {
            pushToContext(context, partialEntriesContextKey, secName, recordIndex, result);
        }
        callback(err);
    });
};

var setConnectionContext = exports.setConnectionContext = function (dbName, context, callback) {
    var options = getConnectionOptions(dbName);
    db.connect('localhost', options, function (err, result) {
        if (err) {
            callback(err);
        } else {
            context.dbinfo = result;
            callback();
        }
    });
};

exports.prepareConnection = function (dbname, context) {
    return function () {
        before(function (done) {
            setConnectionContext(dbname, context, done);
        });

        it('check connection and models', function (done) {
            expect(context.dbinfo).to.exist;
            expect(context.dbinfo.db).to.exist;
            expect(context.dbinfo.grid).to.exist;
            expect(context.dbinfo.models).to.exist;
            expect(context.dbinfo.models.testallergies).to.exist;
            expect(context.dbinfo.models.testprocedures).to.exist;
            done();
        });
    };
};

var addRecordsPerPatient = exports.addRecordsPerPatient = function (context, countPerPatient, callback) {
    var fs = countPerPatient.reduce(function (r, fileCount, i) {
        var pat_key = util.format('pat%d', i);
        return _.range(fileCount).reduce(function (q, j) {
            var filename = util.format('c%d%d.xml', i, j);
            var recordIndex = util.format('%d.%d', i, j);
            var f = function (cb) {
                createStorage(context, pat_key, filename, recordIndex, cb);
            };
            q.push(f);
            return q;
        }, r);
    }, []);

    async.parallel(fs, callback);
};

exports.createMatchInformation = function (recordIndex, destIndices, matchTypes) {
    return matchTypes.reduce(function (r, matchType, index) {
        var destIndex = destIndices[index];
        var suffix = '_' + recordIndex + '.' + destIndex;
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
