"use strict";

var chai = require('chai');
var async = require('async');

var refmodel = require('./refmodel');
var section = require('../../lib/section');
var entry = require('../../lib/entry');
var bundle = require('../../lib/bundle');

var expect = chai.expect;
chai.config.includeStack = true;

describe('fhir support', function () {
    var context = {}; // populated by refmodel common methods

    refmodel.prepareConnection({
        dbName: 'fhirsupport',
        bundle_sections: ['testprocedures']

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

    var patientIds = [null, null];

    it('section.getMulti testdemographics', function (done) {
        var expectedPat0 = refmodel.createTestSection('testdemographics', '0.0', 1);
        var expectedPat1 = refmodel.createTestSection('testdemographics', '1.0', 1);
        var expected = expectedPat0.concat(expectedPat1);
        section.getMulti(context.dbinfo, 'testdemographics', {}, false, function (err, result) {
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
        section.getMulti(context.dbinfo, 'testallergies', {}, false, function (err, result) {
            result.forEach(function (entry) {
                delete entry._id;
            });
            expect(expected).to.deep.include.members(result);
            expect(result).to.deep.include.members(expected);
            done();
        });
    });

    var procedures = {};

    it('section.getMulti testprocedures', function (done) {
        var expectedPat0 = refmodel.createTestSection('testprocedures', '0.0', 6);
        var expectedPat1 = refmodel.createTestSection('testprocedures', '1.0', 6);
        var expected = expectedPat0.concat(expectedPat1);
        section.getMulti(context.dbinfo, 'testprocedures', {}, false, function (err, result) {
            result.forEach(function (entry) {
                var id = entry._id.toString();
                procedures[id] = entry;
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

    var bundles;

    it('create bundle data', function () {
        bundles = Object.keys(procedures).reduce(function (r, id) {
            expect(typeof id).to.equal('string');
            var name = procedures[id].name;
            if (name.substring(0, 8) === 'name_0.0') {
                var index = parseInt(name.charAt(9), 10);
                var bundleIndex = index % 2;
                r[bundleIndex].push(id);
            }
            return r;
        }, [
            [],
            []
        ]);

        expect(bundles[0]).to.have.length(3);
        expect(bundles[1]).to.have.length(3);
    });

    var bundleExpected = {};
    var bundleIds = [];

    it('bundle.save (bundle 0)', function (done) {
        var bundleData = {
            name: 'name_0.0.0'
        };
        bundle.save(context.dbinfo, 'testprocedures', 'pat0', bundles[0], bundleData, null, function (err, id) {
            if (err) {
                done(err);
            } else {
                id = id.toString();
                bundleExpected[id] = {
                    _id: id,
                    elements: bundles[0],
                    data: bundleData
                };
                bundleIds.push(id);
                done();
            }
        });
    });

    it('bundle.save (bundle 1)', function (done) {
        var bundleData = {
            name: 'name_1.0.0'
        };
        bundle.save(context.dbinfo, 'testprocedures', 'pat1', bundles[1], bundleData, null, function (err, id) {
            if (err) {
                done(err);
            } else {
                id = id.toString();
                bundleExpected[id] = {
                    _id: id,
                    elements: bundles[1],
                    data: bundleData
                };
                bundleIds.push(id);
                done();
            }
        });
    });

    it('bundle.get (bundle 0)', function (done) {
        bundle.get(context.dbinfo, 'testprocedures', 'pat0', bundleIds[0], function (err, result) {
            if (err) {
                done(err);
            } else {
                var id = bundleIds[0];
                var expected = bundleExpected[id];
                expect(result).to.deep.equal(expected);
                done();
            }
        });
    });

    it('bundle.getMulti', function (done) {
        bundle.getMulti(context.dbinfo, 'testprocedures', {}, function (err, result) {
            if (err) {
                done(err);
            } else {
                result.forEach(function (bundle) {
                    var id = bundle._id;
                    var expected = bundleExpected[id];
                    expect(bundle).to.deep.equal(expected);
                });
                done();
            }
        });
    });

    it('bundle.replace', function (done) {
        var bundleData = {
            name: 'name_replaced'
        };
        bundles[0].splice(2, 1);
        bundle.replace(context.dbinfo, 'testprocedures', 'pat0', bundleIds[0], bundles[0], bundleData, null, function (err) {
            if (err) {
                done(err);
            } else {
                bundleExpected[bundleIds[0]].data = bundleData;
                done();
            }
        });
    });

    it('bundle.getMulti (after replace)', function (done) {
        bundle.getMulti(context.dbinfo, 'testprocedures', {}, function (err, result) {
            if (err) {
                done(err);
            } else {
                result.forEach(function (bundle) {
                    var id = bundle._id;
                    var expected = bundleExpected[id];
                    expect(bundle).to.deep.equal(expected);
                });
                done();
            }
        });
    });

    it('bundle.remove', function (done) {
        bundle.remove(context.dbinfo, 'testprocedures', 'pat0', bundleIds[1], function (err) {
            done(err);
        });
    });

    it('bundle.getMulti (after remove)', function (done) {
        bundle.getMulti(context.dbinfo, 'testprocedures', {}, function (err, result) {
            if (err) {
                done(err);
            } else {
                expect(result).to.have.length(1);
                var expected = bundleExpected[bundleIds[0]];
                expect(result[0]).to.deep.equal(expected);
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
