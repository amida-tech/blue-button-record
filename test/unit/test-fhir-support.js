"use strict";

var chai = require('chai');
var async = require('async');

var refmodel = require('./refmodel');
var section = require('../../lib/section');
var entry = require('../../lib/entry');

var expect = chai.expect;
chai.config.includeStack = true;

describe('fhir support', function () {
    var context = {}; // populated by refmodel common methods

    refmodel.prepareConnection('fhirsupport', context)();

    it('add sources', function (done) {
        refmodel.addSourcesPerPatient(context, [1, 1], done);
    });

    it('save sections for patient 0', function (done) {
        refmodel.saveAllSections('pat0', '0.0', [4, 4], context, done);
    });

    it('save sections for patient 1', function (done) {
        refmodel.saveAllSections('pat1', '1.0', [4, 4], context, done);
    });

    var patientIds = [null, null];

    it('section.getMulti testdemographics', function (done) {
        var expectedPat0 = refmodel.createTestSection('testdemographics', '0.0', 1);
        var expectedPat1 = refmodel.createTestSection('testdemographics', '1.0', 1);
        var expected = expectedPat0.concat(expectedPat1);
        section.getMulti(context.dbinfo, 'testdemographics', {}, function (err, result) {
            result.forEach(function (entry) {
                if (entry.name === 'name_0.0.0') {
                    patientIds[0] = entry._id;
                }
                if (entry.name === 'name_1.0.0') {
                    patientIds[1] = entry._id;
                }
                delete entry._id;
            });
            expect(expected).to.deep.include.members(result);
            expect(result).to.deep.include.members(expected);
            done();
        });
    });

    it('section.getMulti testallergies', function (done) {
        var expectedPat0 = refmodel.createTestSection('testallergies', '0.0', 4);
        var expectedPat1 = refmodel.createTestSection('testallergies', '1.0', 4);
        var expected = expectedPat0.concat(expectedPat1);
        section.getMulti(context.dbinfo, 'testallergies', {}, function (err, result) {
            result.forEach(function (entry) {
                delete entry._id;
            });
            expect(expected).to.deep.include.members(result);
            expect(result).to.deep.include.members(expected);
            done();
        });
    });

    it('entry.idToPatientKey (pat0)', function (done) {
        entry.idToPatientKey(context.dbinfo, 'testdemographics', patientIds[0], function (err, ptKey) {
            if (err) {
                done(err);
            } else {
                expect(ptKey).to.equal('pat0');
                done();
            }
        });
    });

    it('entry.idToPatientKey (pat1)', function (done) {
        entry.idToPatientKey(context.dbinfo, 'testdemographics', patientIds[1].toString(), function (err, ptKey) {
            if (err) {
                done(err);
            } else {
                expect(ptKey).to.equal('pat1');
                done();
            }
        });
    });

    it('entry.patientKeyToId (pat0)', function (done) {
        entry.patientKeyToId(context.dbinfo, 'testdemographics', 'pat0', function (err, id) {
            if (err) {
                done(err);
            } else {
                expect(id).to.deep.equal(patientIds[0]);
                done();
            }
        });
    });

    it('entry.patientKeyToId (pat1)', function (done) {
        entry.patientKeyToId(context.dbinfo, 'testdemographics', 'pat1', function (err, id) {
            if (err) {
                done(err);
            } else {
                expect(id).to.deep.equal(patientIds[1]);
                done();
            }
        });
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
