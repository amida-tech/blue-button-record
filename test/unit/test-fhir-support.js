"use strict";

var util = require('util');
var chai = require('chai');
var async = require('async');
var _ = require('lodash');

var refmodel = require('./refmodel');
var section = require('../../lib/section');
var entry = require('../../lib/entry');
var search = require('../../lib/search');

var expect = chai.expect;
chai.config.includeStack = true;

describe('fhir support', function () {
    var context = {}; // populated by refmodel common methods

    refmodel.prepareConnection({
        dbName: 'fhirsupport',
        fhir: true
    }, context)();

    it('add sources', function (done) {
        refmodel.addSourcesPerPatient(context, [2, 1], done);
    });

    it('save sections for patient 0', function (done) {
        refmodel.saveAllSections('pat0', '0.0', [4, 6], context, done);
    });

    it('save sections for patient 1', function (done) {
        refmodel.saveAllSections('pat1', '1.0', [4, 6], context, done);
    });

    var expectedPatData = _.range(4).map(function (ptIndex) {
        var sourceKey = util.format('%s.%s', ptIndex, 0);
        return refmodel.createTestSection('testdemographics', sourceKey, 1);
    });

    var patientIds = [null, null];

    var groupByPatient = function (entries) {
        return _.groupBy(entries, function (entry) {
            return entry._ptKey;
        });
    };

    it('search all testdemographics', function (done) {
        var itself = this;
        var searchSpec = {
            section: 'testdemographics',
            query: {},
            patientInfo: false
        };
        search.search(context.dbinfo, searchSpec, function (err, result) {
            expect(result).to.have.length(2);
            var groupResults = groupByPatient(result);
            _.range(2).forEach(function (ptIndex) {
                var ptKey = util.format('pat%s', ptIndex);
                var expected = expectedPatData[ptIndex];
                expect(expected).to.have.length(1);
                var actual = groupResults[ptKey];
                expect(actual).to.have.length(1);
                expect(expected[0]).to.deep.equal(actual[0].data);
                patientIds[ptIndex] = actual[0]._id;
            }, itself);
            done();
        });
    });

    it('search.search testallergies', function (done) {
        var expectedPat0 = refmodel.createTestSection('testallergies', '0.0', 4);
        var expectedPat1 = refmodel.createTestSection('testallergies', '1.0', 4);
        var expected = expectedPat0.concat(expectedPat1);
        var searchSpec = {
            section: 'testallergies',
            query: {},
            patientInfo: false
        };
        search.search(context.dbinfo, searchSpec, function (err, result) {
            result = result.map(function (entry) {
                return entry.data;
            });
            expect(expected).to.deep.include.members(result);
            expect(result).to.deep.include.members(expected);
            done();
        });
    });

    var procedures = {};

    it('search.search testprocedures', function (done) {
        var expectedPat0 = refmodel.createTestSection('testprocedures', '0.0', 6);
        var expectedPat1 = refmodel.createTestSection('testprocedures', '1.0', 6);
        var expected = expectedPat0.concat(expectedPat1);
        var searchSpec = {
            section: 'testprocedures',
            query: {},
            patientInfo: false
        };
        search.search(context.dbinfo, searchSpec, function (err, result) {
            result = result.map(function (entry) {
                procedures[entry._id] = entry.data;
                return entry.data;
            });
            //console.log(procedures);
            expect(expected).to.deep.include.members(result);
            expect(result).to.deep.include.members(expected);
            done();
        });
    });

    ['x', '123456789012345678901234'].forEach(function (id) {
        var msg = util.format('entry.idToPatientInfo empty result (%s)', id);
        it(msg, function (done) {
            entry.idToPatientInfo(context.dbinfo, 'testprocedures', id, function (err, patientInfo) {
                expect(err).not.to.exist;
                expect(patientInfo).not.to.exist;
                done();
            });
        });
    }, this);

    it('read', function (done) {
        var countProcs = 0;
        var procKeys = Object.keys(procedures);
        procKeys.forEach(function (id) {
            var ptNdx = procedures[id].name.split('_')[1].charAt(0);
            entry.idToPatientInfo.call(this, context.dbinfo, 'testprocedures', id, function (err, patientInfo) {
                expect(err).not.to.exist;
                var suffix = '_' + ptNdx + ".0.0";
                var ptKey = ptNdx === '0' ? 'pat0' : 'pat1';
                expect(patientInfo).to.deep.equal({
                    key: ptKey,
                    reference: patientIds[ptNdx].toString(),
                    display: 'last' + suffix + ', ' + 'first' + suffix + ' a ' + 'b'
                });
                entry.get.call(this, context.dbinfo, 'testprocedures', ptKey, id, function (err, e) {
                    expect(err).not.to.exist;
                    expect(e.data).to.deep.equal(procedures[id]);
                    expect(e.metadata).to.exist;
                    ++countProcs;
                    if (countProcs === procKeys.length) {
                        done();
                    }
                });
            });
        }, this);
    });

    it('entry.idToPatientInfo (valid id)', function (done) {
        var id = Object.keys(procedures)[0];
        var ptNdx = procedures[id].name.split('_')[1].charAt(0);
        entry.idToPatientInfo(context.dbinfo, 'testprocedures', id, function (err, patientInfo) {
            expect(err).not.to.exist;
            var suffix = '_' + ptNdx + ".0.0";
            expect(patientInfo).to.deep.equal({
                key: ptNdx === '0' ? 'pat0' : 'pat1',
                reference: patientIds[ptNdx].toString(),
                display: 'last' + suffix + ', ' + 'first' + suffix + ' a ' + 'b'
            });
            done();
        });
    });

    it('entry.idToPatientKey (invalid id)', function (done) {
        entry.idToPatientKey(context.dbinfo, 'testprocedures', 'x', function (err, result) {
            expect(err).not.to.exist;
            expect(result.invalid).to.equal(true);
            done();
        });
    });

    it('entry.idToPatientKey (valid id that does not point to a record)', function (done) {
        entry.idToPatientKey(context.dbinfo, 'testprocedures', '123456789012345678901234', function (err, result) {
            expect(err).not.to.exist;
            expect(result).not.to.exist;
            done();
        });
    });

    it('entry.idToPatientKey (valid id)', function (done) {
        var id = Object.keys(procedures)[0];
        var ptNdx = procedures[id].name.split('_')[1].charAt(0);
        entry.idToPatientKey(context.dbinfo, 'testprocedures', id, function (err, result) {
            expect(err).not.to.exist;
            var ptKey = ptNdx === '0' ? 'pat0' : 'pat1';
            expect(result.key).to.equal(ptKey);
            expect(result.invalid).to.equal(false);
            done();
        });
    });

    it('entry.idToPatientKey (pat0)', function (done) {
        entry.idToPatientKey(context.dbinfo, 'testdemographics', patientIds[0].toString(), function (err, result) {
            if (err) {
                done(err);
            } else {
                expect(result.key).to.equal('pat0');
                done();
            }
        });
    });

    it('entry.idToPatientKey (pat1)', function (done) {
        entry.idToPatientKey(context.dbinfo, 'testdemographics', patientIds[1].toString(), function (err, result) {
            if (err) {
                done(err);
            } else {
                expect(result.key).to.equal('pat1');
                done();
            }
        });
    });

    it('entry.patientKeyToId (pat0)', function (done) {
        entry.patientKeyToId(context.dbinfo, 'testdemographics', 'pat0', function (err, id) {
            if (err) {
                done(err);
            } else {
                expect(id.toString()).to.equal(patientIds[0]);
                done();
            }
        });
    });

    it('entry.patientKeyToId (pat1)', function (done) {
        entry.patientKeyToId(context.dbinfo, 'testdemographics', 'pat1', function (err, id) {
            if (err) {
                done(err);
            } else {
                expect(id.toString()).to.deep.equal(patientIds[1]);
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
