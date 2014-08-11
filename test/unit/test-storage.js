"use strict";

var chai = require('chai');
var chaidatetime = require('chai-datetime');
var util = require('util');
var path = require('path');
var async = require('async');
var _ = require('underscore');

var db = require('../../lib/db');
var storage = require('../../lib/storage');

chai.use(chaidatetime);
var expect = chai.expect;

describe('storage.js methods', function () {
    this.timeout(5000);
    var dbinfo = null;
    var ids = [];

    var sizes = [5, 250000, 10, 15, 20, 25];
    var types = ['xml', 'bin', 'bin', 'xml', 'xml', 'bin'];
    var pats = ['pat1', 'pat1', 'pat1', 'pat2', 'pat2', 'pat3'];
    var classes = ['ccda', undefined, 'ccda', null, 'ccda', undefined];
    var contents = [];

    var testNow = new Date();

    var getContentType = function (index) {
        if (types[index] === 'xml') {
            return 'text/xml';
        } else {
            return 'binary/octet-stream';
        }
    };

    var getFileName = function (index) {
        return 'c' + index + '.' + types[index];
    };

    var createFileContent = function (index) {
        var content = "<root\n";
        for (var i = 0; i < sizes[index]; ++i) {
            var line = util.format('a%s=d%s\n', i, i);
            content += line;
        }
        content += '/>\n';
        return content;
    };

    before(function (done) {
        for (var i = 0; i < 6; ++i) {
            contents[i] = createFileContent(i);
        }
        var options = {
            dbName: 'storagetest',
            supportedSections: [],
            typeToSchemaDesc: {}
        };
        db.connect('localhost', options, function (err, result) {
            if (err) {
                done(err);
            } else {
                dbinfo = result;
                done();
            }
        });
    });

    it('check connection and models', function (done) {
        expect(dbinfo).to.exist;
        expect(dbinfo.db).to.exist;
        expect(dbinfo.grid).to.exist;
        expect(dbinfo.storageModel).to.exist;
        done();
    });

    it('saveSource', function (done) {
        var f = function (index, callback) {
            var fileinfo = {
                name: getFileName(index),
                type: getContentType(index)
            };
            storage.saveSource(dbinfo, pats[index], contents[index], fileinfo, classes[index], callback); 
        };
        var r = _.range(6);
        async.map(r, f, function(err, result) {
            if (err) {
                done(err);
            } else {
                ids = result;
                done();
            }
        });
    });

    it('getSourceList', function (done) {
        var f = function (input, callback) {
            var start = input.start;
            var end = input.end;
            storage.getSourceList(dbinfo, pats[start], function (err, result) {
                if (err) {
                    callback(err);
                } else {
                    var n = result.length;
                    expect(n).to.equal(end - start);
                    for (var i = start; i < end; ++i) {
                        var r = result[i - start];
                        var index = -1;
                        for (var j = 0; j < 6; ++j) {
                            if (ids[j].equals(r.file_id)) {
                                index = j;
                                break;
                            }
                        }
                        expect(index).to.not.equal(-1);
                        expect(r).to.exist;
                        expect(r.file_name).to.equal(getFileName(index));
                        expect(r.file_mime_type).to.equal(getContentType(index));
                        expect(r.patient_key).to.equal(pats[index]);
                        expect(r.file_parsed).to.not.exist;
                        expect(r.file_archived).to.not.exist;
                        if (classes[index]) {
                            expect(r.file_class).to.equal(classes[index]);
                        } else {
                            expect(r.file_class).to.not.exist;
                        }
                    }
                    callback();
                }
            });
        };
        var inputs = [[0, 3], [3, 5], [5,6]].map(function(v) {
            return {start: v[0], end: v[1]};
        });
        async.each(inputs, f, done);
    });

    it('getSource', function (done) {
        var f = function (index, callback) {
            storage.getSource(dbinfo, pats[index], ids[index].toString(), function (err, filename, content) {
                if (err) {
                    callback(err);
                } else {
                    expect(filename).to.equal(getFileName(index));
                    var expectedContent = contents[index];
                    expect(content).to.equal(expectedContent);
                    callback(null);
                }
            });
        };
        var r = _.range(6);
        async.each(r, f, done);
    });

    it('updateSource', function (done) {
        var f = function (index, callback) {
            var updateInfo = {
                'metadata.parsed': testNow,
                'metadata.archived': testNow
            };
            storage.updateSource(dbinfo, pats[index], ids[index].toString(), updateInfo, function (err) {
                callback(err);
            });
        };
        var r = _.range(6);
        async.each(r, f, done);
    });

    it('getSourceList (after update)', function (done) {
        var f = function (input, callback) {
            var start = input.start;
            var end = input.end;
            storage.getSourceList(dbinfo, pats[start], function (err, result) {
                if (err) {
                    callback(err);
                } else {
                    var n = result.length;
                    expect(n).to.equal(end - start);
                    for (var i = start; i < end; ++i) {
                        var r = result[i - start];
                        expect(r.file_parsed).to.equalTime(testNow);
                        expect(r.file_archived).to.equalTime(testNow);
                    }
                    callback();
                }
            });
        };
        var inputs = [[0, 3], [3, 5], [5,6]].map(function(v) {
            return {start: v[0], end: v[1]};
        });
        async.each(inputs, f, done);
    });

    it('getSource (wrong patient)', function (done) {
        storage.getSource(dbinfo, 'wrongpatient', ids[0].toString(), function (err, filename, content) {
            expect(err).to.exist;
            done();
        });
    });

    it('sourceCount', function (done) {
        var f = function (input, callback) {
            storage.sourceCount(dbinfo, input.patient, function (err, count) {
                if (err) {
                    callback(err);
                } else {
                    expect(count).to.equal(input.count);
                    callback();
                }
            });
        };
        var inputs = [['pat1', 3], ['pat2', 2], ['pat3', 1], ['patnone', 0]].map(function(a) {
            return {patient: a[0], count: a[1]};
        });
        async.each(inputs, f, done);
    });

    after(function (done) {
        dbinfo.db.dropDatabase(function (err) {
            if (err) {
                done(err);
            } else {
                dbinfo.connection.close(function (err) {
                    done(err);
                });
            }
        });
    });
});