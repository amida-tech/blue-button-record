"use strict";

var util = require('util');
var chai = require('chai');
var async = require('async');
var _ = require('lodash');
var moment = require('moment');

var refmodel = require('../refmodel');
var section = require('../../../lib/section');
var entry = require('../../../lib/entry');
var search = require('../../../lib/search');
var common = require('./common');

var expect = chai.expect;
chai.config.includeStack = true;

describe('fhir support', function () {
    var context = {}; // populated by refmodel common methods
    var self = this;
    var numPatients = 3;
    var numAllersPerPt = 3;
    var numProcsPerPt = 4;

    refmodel.prepareConnection({
        dbName: 'fhirsupport',
        fhir: true
    }, context)();

    var sourceIds;
    it('add sources', function (done) {
        refmodel.addSourcesPerPatient(context, _.times(numPatients + 1, _.constant(1)), function (err, result) {
            if (err) {
                done(err);
            } else {
                sourceIds = result;
                done();
            }
        });
    });

    it('entry.patientKeyToId missing', function (done) {
        entry.patientKeyToId(context.dbinfo, 'testdemographics', 'pat0', function (err, id) {
            expect(err).not.to.exist;
            expect(id).not.to.exist;
            done();
        });
    });

    var patientSamples = _.range(numPatients + 1).map(function (ptIndex) {
        var sourceKey = util.format('%s.%s', ptIndex, 0);
        return refmodel.createTestSection('testdemographics', sourceKey, 1)[0];
    });

    var patientIds = [];
    patientSamples.forEach(function (patientSample, ptIndex) {
        var sampleClone = _.cloneDeep(patientSample);
        var patKey = util.format('pat%s', ptIndex);
        var title = util.format('create testdemographics for %s', patKey);
        var momentBefore = moment();
        it(title, function (done) {
            var itself = this;
            section.save(context.dbinfo, 'testdemographics', patKey, sampleClone, sourceIds[ptIndex], function (err, result) {
                if (err) {
                    done(err);
                } else {
                    expect(result).to.exist;
                    expect(result.versionId).to.equal('1');
                    common.verifyMoment.call(itself, momentBefore, result.lastUpdated);
                    patientIds.push(result.id);
                    done();
                }
            });
        });
    });

    _.range(numPatients).forEach(function (ptIndex) {
        var patKey = util.format('pat%s', ptIndex);
        it('entry.patientKeyToId ' + patKey, function (done) {
            entry.patientKeyToId(context.dbinfo, 'testdemographics', patKey, function (err, id) {
                expect(err).not.to.exist;
                expect(id.toString()).to.equal(patientIds[ptIndex]);
                done();
            });
        }, self);
    });

    _.range(numPatients).forEach(function (ptIndex) {
        var patKey = util.format('pat%s', ptIndex);
        it('entry.idToPatientKey ' + patKey, function (done) {
            entry.idToPatientKey(context.dbinfo, 'testdemographics', patientIds[ptIndex], function (err, result) {
                expect(err).not.to.exist;
                expect(result.key).to.equal(patKey);
                expect(result.invalid).to.be.false;
                expect(!!result.archived).to.be.false;
                done();
            });
        }, self);
    });

    _.range(numPatients).forEach(function (ptIndex) {
        var patKey = util.format('pat%s', ptIndex);
        it('entry.get testdemographics ' + patKey, function (done) {
            entry.get(context.dbinfo, 'testdemographics', patKey, patientIds[ptIndex], function (err, entry) {
                if (err) {
                    done(err);
                } else {
                    expect(entry.data).to.deep.equal(patientSamples[ptIndex]);
                    done();
                }
            });
        });
    });

    it('entry.replace pat2', function (done) {
        var itself = this;
        var sampleClone = _.cloneDeep(patientSamples[3]);
        var momentBefore = moment();
        entry.replace(context.dbinfo, 'testdemographics', 'pat2', patientIds[2], sourceIds[3], sampleClone, function (err, result) {
            if (err) {
                done(err);
            } else {
                expect(result.id).to.equal(patientIds[2]);
                expect(result.versionId).to.equal('2');
                common.verifyMoment.call(itself, momentBefore, result.lastUpdated);
                done();
            }
        });
    });

    it('entry.get testdemographics pat2 after replace', function (done) {
        entry.get(context.dbinfo, 'testdemographics', 'pat2', patientIds[2], function (err, entry) {
            if (err) {
                done(err);
            } else {
                expect(entry.data).to.deep.equal(patientSamples[3]);
                done();
            }
        });
    });

    var momentBeforeDelete;
    it('entry.remove pat2', function (done) {
        momentBeforeDelete = moment();
        entry.remove(context.dbinfo, 'testdemographics', 'pat2', patientIds[2], done);
    });

    it('entry.idToPatientKey removed pat2', function (done) {
        entry.idToPatientKey(context.dbinfo, 'testdemographics', patientIds[2], function (err, result) {
            expect(err).not.to.exist;
            expect(result.key).to.equal('pat2');
            expect(result.invalid).to.be.false;
            expect(result.archived).to.be.true;
            done();
        });
    }, self);

    it('entry.get testdemographics pat2 after remove', function (done) {
        var itself = this;
        entry.get(context.dbinfo, 'testdemographics', 'pat2', patientIds[2], function (err, entry) {
            if (err) {
                done(err);
            } else {
                expect(entry.archived_on).to.exist;
                expect(entry.data).to.deep.equal(patientSamples[3]);
                expect(entry.archived).to.equal(true);
                common.verifyMoment.call(itself, momentBeforeDelete, entry.archived_on.toISOString());
                done();
            }
        });
    });

    var numAllergies = 4;
    var allergySamples = _.range(2).map(function (ptIndex) {
        var sourceKey = util.format('%s.%s', ptIndex, 0);
        return refmodel.createTestSection('testallergies', sourceKey, numAllergies);
    });
    allergySamples = _.flatten(allergySamples);

    var allergiesIds = [];
    allergySamples.forEach(function (allergySample, index) {
        var sampleClone = _.cloneDeep(allergySample);
        var ptIndex = Math.floor(index / numAllergies);
        var patKey = util.format('pat%s', ptIndex);
        var title = util.format('create testallergies %s for %s', index, patKey);
        var momentBefore = moment();
        it(title, function (done) {
            var itself = this;
            section.save(context.dbinfo, 'testallergies', patKey, sampleClone, sourceIds[ptIndex], function (err, result) {
                if (err) {
                    done(err);
                } else {
                    expect(result).to.exist;
                    expect(result.versionId).to.equal('1');
                    common.verifyMoment.call(itself, momentBefore, result.lastUpdated);
                    allergiesIds.push(result.id);
                    done();
                }
            });
        });
    });

    _.range(2).forEach(function (ptIndex) {
        var patKey = util.format('pat%s', ptIndex);
        _.range(4).forEach(function (allergiesIndex) {
            it('entry.idToPatientKey (testallergies) ' + patKey, function (done) {
                var index = ptIndex * numAllergies + allergiesIndex;
                entry.idToPatientKey(context.dbinfo, 'testallergies', allergiesIds[index], function (err, result) {
                    expect(err).not.to.exist;
                    expect(result.key).to.equal(patKey);
                    expect(result.invalid).to.be.false;
                    expect(!!result.archived).to.be.false;
                    done();
                });
            }, self);
        });
    });

    it('entry.idToPatientKey (testallergies) invalid id', function (done) {
        entry.idToPatientKey(context.dbinfo, 'testallergies', 'x', function (err, result) {
            expect(err).not.to.exist;
            expect(result.invalid).to.equal(true);
            done();
        });
    });

    it('entry.idToPatientKey (test allergies) valid id that does not point to a record', function (done) {
        entry.idToPatientKey(context.dbinfo, 'testallergies', '123456789012345678901234', function (err, result) {
            expect(err).not.to.exist;
            expect(result).not.to.exist;
            done();
        });
    });

    _.range(2).forEach(function (ptIndex) {
        var patKey = util.format('pat%s', ptIndex);
        _.range(4).forEach(function (allergiesIndex) {
            it('entry.idToPatientInfo (testallergies) ' + patKey, function (done) {
                var index = ptIndex * numAllergies + allergiesIndex;
                entry.idToPatientInfo(context.dbinfo, 'testallergies', allergiesIds[index], function (err, result) {
                    expect(err).not.to.exist;
                    expect(result.key).to.equal(patKey);
                    expect(result.reference).to.equal(patientIds[ptIndex]);
                    done();
                });
            }, self);
        });
    });

    it('entry.idToPatientInfo (testallergies) invalid id', function (done) {
        entry.idToPatientInfo(context.dbinfo, 'testallergies', 'x', function (err, result) {
            expect(err).not.to.exist;
            expect(result).not.to.exist;
            done();
        });
    });

    it('entry.idToPatientInfo (test allergies) valid id that does not point to a record', function (done) {
        entry.idToPatientInfo(context.dbinfo, 'testallergies', '123456789012345678901234', function (err, result) {
            expect(err).not.to.exist;
            expect(result).not.to.exist;
            done();
        });
    });

    _.range(2).forEach(function (ptIndex) {
        var patKey = util.format('pat%s', ptIndex);
        _.range(4).forEach(function (allergiesIndex) {
            var patKey = util.format('pat%s', ptIndex);
            var index = 4 * ptIndex + allergiesIndex;
            var title = util.format('entry.get testallergies %s for %s', index, patKey);
            it(title, function (done) {
                entry.get(context.dbinfo, 'testallergies', patKey, allergiesIds[index], function (err, entry) {
                    if (err) {
                        done(err);
                    } else {
                        expect(entry.data).to.deep.equal(allergySamples[index]);
                        done();
                    }
                });
            });
        });
    });

    it('entry.replace testallergies 3 for pat0', function (done) {
        var itself = this;
        var sampleClone = _.cloneDeep(allergySamples[2]);
        var momentBefore = moment();
        entry.replace(context.dbinfo, 'testallergies', 'pat0', allergiesIds[3], sourceIds[3], sampleClone, function (err, result) {
            if (err) {
                done(err);
            } else {
                expect(result.id).to.equal(allergiesIds[3]);
                expect(result.versionId).to.equal('2');
                common.verifyMoment.call(itself, momentBefore, result.lastUpdated);
                done();
            }
        });
    });

    it('entry.get testallergies 3 after replace', function (done) {
        entry.get(context.dbinfo, 'testallergies', 'pat0', allergiesIds[3], function (err, entry) {
            if (err) {
                done(err);
            } else {
                expect(entry.data).to.deep.equal(allergySamples[2]);
                done();
            }
        });
    });

    it('entry.remove testallergies 3', function (done) {
        momentBeforeDelete = moment();
        entry.remove(context.dbinfo, 'testallergies', 'pat0', allergiesIds[3], done);
    });

    it('entry.idToPatientKey removed testallergies 3', function (done) {
        entry.idToPatientKey(context.dbinfo, 'testallergies', allergiesIds[3], function (err, result) {
            expect(err).not.to.exist;
            expect(result.key).to.equal('pat0');
            expect(result.invalid).to.be.false;
            expect(result.archived).to.be.true;
            done();
        });
    }, self);

    it('entry.get testallergies 3 after remove', function (done) {
        var itself = this;
        entry.get(context.dbinfo, 'testallergies', 'pat0', allergiesIds[3], function (err, entry) {
            if (err) {
                done(err);
            } else {
                expect(entry.archived_on).to.exist;
                expect(entry.data).to.deep.equal(allergySamples[2]);
                expect(entry.archived).to.equal(true);
                common.verifyMoment.call(itself, momentBeforeDelete, entry.archived_on.toISOString());
                done();
            }
        });
    });

    it('entry.replace testallergies 7 for pat1', function (done) {
        var itself = this;
        var sampleClone = _.cloneDeep(allergySamples[6]);
        var momentBefore = moment();
        entry.replace(context.dbinfo, 'testallergies', 'pat1', allergiesIds[7], sourceIds[7], sampleClone, function (err, result) {
            if (err) {
                done(err);
            } else {
                expect(result.id).to.equal(allergiesIds[7]);
                expect(result.versionId).to.equal('2');
                common.verifyMoment.call(itself, momentBefore, result.lastUpdated);
                done();
            }
        });
    });

    it('entry.get testallergies 7 after replace', function (done) {
        entry.get(context.dbinfo, 'testallergies', 'pat1', allergiesIds[7], function (err, entry) {
            if (err) {
                done(err);
            } else {
                expect(entry.data).to.deep.equal(allergySamples[6]);
                done();
            }
        });
    });

    it('entry.remove testallergies 7', function (done) {
        momentBeforeDelete = moment();
        entry.remove(context.dbinfo, 'testallergies', 'pat1', allergiesIds[7], done);
    });

    it('entry.idToPatientKey removed testallergies 7', function (done) {
        entry.idToPatientKey(context.dbinfo, 'testallergies', allergiesIds[7], function (err, result) {
            expect(err).not.to.exist;
            expect(result.key).to.equal('pat1');
            expect(result.invalid).to.be.false;
            expect(result.archived).to.be.true;
            done();
        });
    }, self);

    it('entry.get testallergies 7 after remove', function (done) {
        var itself = this;
        entry.get(context.dbinfo, 'testallergies', 'pat1', allergiesIds[7], function (err, entry) {
            if (err) {
                done(err);
            } else {
                expect(entry.archived_on).to.exist;
                expect(entry.data).to.deep.equal(allergySamples[6]);
                expect(entry.archived).to.equal(true);
                common.verifyMoment.call(itself, momentBeforeDelete, entry.archived_on.toISOString());
                done();
            }
        });
    });

    xit('search.search testallergies', function (done) {
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

    xit('search.search testprocedures', function (done) {
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
            expect(expected).to.deep.include.members(result);
            expect(result).to.deep.include.members(expected);
            done();
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
