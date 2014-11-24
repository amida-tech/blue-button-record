"use strict";

var chai = require('chai');
var async = require('async');

var db = require('../../lib/db');
var section = require('../../lib/pim');
var entry = require('../../lib/entry');
var storage = require('../../lib/storage');
var modelutil = require('../../lib/modelutil');

var refmodel = require('./refmodel');

var expect = chai.expect;
chai.config.includeStack = true;

describe('pim.js methods', function () {
    var context = {}; // populated by refmodel common methods

    refmodel.prepareConnection('sectiontest', context)();

    it('add records', function (done) {
        refmodel.addRecordsPerPatient(context, [3, 3, 2], done);
    });

    it('save', function (done) {
        async.parallel([

                function (callback) {
                    refmodel.saveSection(context, 'testallergies', 'pat0', '0.0', 5, callback);
                },
                function (callback) {
                    refmodel.saveSection(context, 'testallergies', 'pat2', '2.0', 3, callback);
                },
                function (callback) {
                    refmodel.saveSection(context, 'testprocedures', 'pat0', '0.0', 3, callback);
                },
                function (callback) {
                    refmodel.saveSection(context, 'testprocedures', 'pat1', '1.0', 5, callback);
                },
            ],
            function (err) {
                done(err);
            }
        );
    });



    var checkBBData = function (getResult, original) {
        var bbClean = modelutil.mongooseToBBModelSection(getResult);
        expect(original).to.deep.include.members(bbClean);
        expect(bbClean).to.deep.include.members(original);
    };

    var checkPatientNFile = function (result, ptKey, filename) {
        result.forEach(function (entry) {
            expect(entry.metadata.attribution[0].record.filename).to.equal(filename);
        });
    };

    it('get', function (done) {
        async.parallel([

                function (callback) {
                    section.get(context.dbinfo, 'testallergies', 'pat0', callback);
                },
                function (callback) {
                    section.get(context.dbinfo, 'testallergies', 'pat2', callback);
                },
                function (callback) {
                    section.get(context.dbinfo, 'testprocedures', 'pat0', callback);
                },
                function (callback) {
                    section.get(context.dbinfo, 'testprocedures', 'pat1', callback);
                },
            ],
            function (err, results) {
                if (!err) {
                    checkBBData(results[0], refmodel.createTestSection('testallergies', '0.0', 5));
                    checkBBData(results[1], refmodel.createTestSection('testallergies', '2.0', 3));
                    checkBBData(results[2], refmodel.createTestSection('testprocedures', '0.0', 3));
                    checkBBData(results[3], refmodel.createTestSection('testprocedures', '1.0', 5));

                    results.forEach(function (result) {
                        result.forEach(function (entry) {
                            expect(entry.archived).to.not.be.ok;
                            expect(entry.reviewed).to.not.be.ok;
                            expect(entry.metadata).to.exist;
                            expect(entry.metadata.attribution).to.exist;
                            expect(entry.metadata.attribution).to.have.length(1);
                            expect(entry.metadata.attribution[0].merge_reason).to.equal('new');
                            expect(entry.metadata.attribution[0].record).to.exist;
                        });
                    });

                    checkPatientNFile(results[0], 'pat0', 'c00.xml');
                    checkPatientNFile(results[1], 'pat2', 'c20.xml');
                    checkPatientNFile(results[2], 'pat0', 'c00.xml');
                    checkPatientNFile(results[3], 'pat1', 'c10.xml');

                    expect(results[0]).to.have.length(5);
                    expect(results[1]).to.have.length(3);
                    expect(results[2]).to.have.length(3);
                    expect(results[3]).to.have.length(5);
                }
                done(err);
            }
        );
    });
    it('entry.remove', function (done) {
        var key0 = refmodel.partialEntriesContextKey('testallergies', '2.1');
        var id0 = context[key0][0].entry;
        var key1 = refmodel.partialEntriesContextKey('testprocedures', '1.2');
        var id1 = context[key1][1].entry;
        async.parallel([

                function (callback) {
                    entry.remove(context.dbinfo, 'testallergies', id0, callback);
                },
                function (callback) {
                    entry.remove(context.dbinfo, 'testprocedures', id1, callback);
                },
            ],
            function (err) {
                done(err);
            }
        );
    });


    after(function (done) {
        context.dbinfo.db.dropDatabase(function (err) {
            if (err) {
                done(err);
            } else {
                context.dbinfo.connection.close(function (err) {
                    done(err);
                });
            }
        });
    });
});
