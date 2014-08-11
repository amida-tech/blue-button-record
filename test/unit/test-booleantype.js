"use strict";

var chai = require('chai');
var mongoose = require('mongoose');
var async = require('async');

var bbr = require('../../index');

var expect = chai.expect;
chai.config.includeStack = true;

describe('boolean model field type verification', function () {
    var ids;

    before(function (done) {
        var options = {
            dbName: 'booleanTest',
            supported_sections: ['sectiona', 'sectionb']
        };

        bbr.connectDatabase('localhost', options, function (err) {
            done(err);
        });
    });

    it('save test data', function (done) {
        var record = {
            sectiona: [{
                name: 'namea0',
            }, {
                name: 'namea1',
                flag: true
            }, {
                name: 'namea2',
                flag: false
            }],
            sectionb: [{
                name: 'nameb0',
                value: {
                    code: 'codeb0'
                }
            }, {
                name: 'nameb1',
                value: {
                    code: 'codeb1',
                    active: true
                }
            }, {
                name: 'nameb2',
                value: {
                    code: 'codeb2',
                    active: false
                }
            }]
        };

        var sourceId = mongoose.Types.ObjectId();
        bbr.saveAllSections('btest', record, sourceId, function (err, result) {
            if (err) {
                done(err);
            } else {
                ids = result;
                expect(ids).to.have.length(2);
                expect(ids[0]).to.have.length(3);
                expect(ids[1]).to.have.length(3);
                done();
            }
        });
    });

    var checkSortEntries = function (entries) {
        expect(entries).to.exist;
        expect(entries).have.length(3);
        entries.forEach(function (entry) {
            expect(entry).to.exist;
            expect(entry.name).to.exist;
        });
        entries.sort(function (a, b) {
            return a.name < b.name ? -1 : (b.name < a.name ? 1 : 0);
        });
    };

    it('check booleans after getAllSections', function (done) {
        bbr.getAllSections('btest', function (err, record) {
            if (err) {
                done(err);
            } else {
                expect(record).to.exist;
                checkSortEntries(record.sectiona);
                var valuesa = record.sectiona.map(function (entry) {
                    return entry.flag;
                });
                expect(valuesa).to.deep.equal([undefined, true, false]);
                checkSortEntries(record.sectionb);
                var valuesb = record.sectionb.map(function (entry) {
                    return entry.value && entry.value.active;
                });
                expect(valuesb).to.deep.equal([undefined, true, false]);
                done();
            }
        });
    });

    it('check booleans after getSections', function (done) {
        bbr.getSection('sectiona', 'btest', function (err, result) {
            if (err) {
                done(err);
            } else {
                checkSortEntries(result);
                var values = result.map(function (entry) {
                    return entry.flag;
                });
                expect(values).to.deep.equal([undefined, true, false]);
                done();
            }
        });
    });

    it('check booleans after getEntry', function (done) {
        var generator = function (sectionName, sectionIndex, entryIndex) {
            return function (cb) {
                bbr.getEntry(sectionName, 'btest', ids[sectionIndex][entryIndex], cb);
            };
        };
        var fs = [];
        ['sectiona', 'sectionb'].forEach(function (sectionName, sectionIndex) {
            for (var j = 0; j < 3; ++j) {
                var f = generator(sectionName, sectionIndex, j);
                fs.push(f);
            }
        });
        async.parallel(fs, function (err, results) {
            if (err) {
                done(err);
            } else {
                var values = results.map(function (entry, index) {
                    return index < 3 ? entry.flag : entry.value.active;
                });
                expect(values).to.deep.equal([undefined, true, false, undefined, true, false]);
                done();
            }
        });
    });

    after(function (done) {
        bbr.clearDatabase(function (err) {
            if (err) {
                done(err);
            } else {
                bbr.disconnect(done);
            }
        });
    });
});
