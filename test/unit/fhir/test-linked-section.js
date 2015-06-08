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

// Multiple FHIR medication related resources map to CCDA medications.  This 
// test simulates the case where multiple linked entries exist in the record
// for FHIR resources but only one must to be shown from blue-button model API.
describe('section with linked entries', function () {
    var context = {}; // populated by refmodel common methods

    var self = this;
    var numPatients = 2;
    var numAllergiesPerPt = 4;
    var options = {
        fhir: true
    };

    refmodel.prepareConnection({
        dbName: 'fhirlinkedentries'
    }, context)();

    var sourceIds;
    it('add sources', function (done) {
        refmodel.addSourcesPerPatient(context, _.times(numPatients, _.constant(1)), function (err, result) {
            if (err) {
                done(err);
            } else {
                sourceIds = result;
                done();
            }
        });
    });

    var patientSamples = _.range(numPatients).map(function (ptIndex) {
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
            section.save(context.dbinfo, 'testdemographics', patKey, sampleClone, sourceIds[ptIndex], options, function (err, result) {
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

    var numAllergies = 6;
    var allergySamples = _.range(2).map(function (ptIndex) {
        var sourceKey = util.format('%s.%s', ptIndex, 0);
        return refmodel.createTestSection('testallergies', sourceKey, numAllergies);
    });
    allergySamples = _.flatten(allergySamples);
    allergySamples.forEach(function (allergySample) {
        allergySample.flag = 'not linked';
    });

    var allergiesIds = [];
    allergySamples.forEach(function (allergySample, index) {
        var sampleClone = _.cloneDeep(allergySample);
        var ptIndex = Math.floor(index / numAllergies);
        var patKey = util.format('pat%s', ptIndex);
        var title = util.format('create testallergies %s for %s', index, patKey);
        var momentBefore = moment();
        it(title, function (done) {
            var itself = this;
            section.save(context.dbinfo, 'testallergies', patKey, sampleClone, sourceIds[ptIndex], options, function (err, result) {
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

    var verifySection = function (section, ids, done) {
        try {
            expect(section.length).to.equal(numAllergies);
            section.forEach(function (entry) {
                var index = ids.indexOf(entry._id.toString());
                expect(index).to.be.above(-1);
                delete entry._id;
                delete entry.metadata;
                delete entry._link;
                expect(entry).to.deep.equal(allergySamples[index]);
            });
            done();
        } catch (err) {
            done(err);
        }
    };

    _.range(2).forEach(function (ptIndex) {
        var patKey = util.format('pat%s', ptIndex);
        var title = util.format('get testallergies section for %s', patKey);
        it(title, function (done) {
            section.get(context.dbinfo, 'testallergies', patKey, function (err, section) {
                if (err) {
                    done(err);
                } else {
                    verifySection(section, allergiesIds, done);
                }
            });
        });
    });

    var linkedAllergyIds = [];
    _.range(2).forEach(function (ptIndex) {
        var patKey = util.format('pat%s', ptIndex);
        _.range(2).forEach(function (allergyIndex) {
            var title = util.format('create linked testallergies %s for %s', allergyIndex, patKey);
            it(title, function (done) {
                var actualIndex = allergyIndex + numAllergies * ptIndex;
                var sampleClone = _.cloneDeep(allergySamples[allergyIndex + numAllergies * ptIndex]);
                sampleClone._link = allergiesIds[actualIndex];
                var momentBefore = moment();
                section.save(context.dbinfo, 'testallergies', patKey, sampleClone, sourceIds[ptIndex], options, function (err, result) {
                    if (err) {
                        done(err);
                    } else {
                        expect(result).to.exist;
                        expect(result.versionId).to.equal('1');
                        common.verifyMoment(momentBefore, result.lastUpdated);
                        linkedAllergyIds.push(result.id);
                        done();
                    }
                });
            });
        });
    });

    _.range(2).forEach(function (ptIndex) {
        var patKey = util.format('pat%s', ptIndex);
        var title = util.format('get testallergies section for %s', patKey);
        it(title, function (done) {
            var effectiveAllergyIds = _.clone(allergiesIds);
            effectiveAllergyIds[0] = linkedAllergyIds[0];
            effectiveAllergyIds[1] = linkedAllergyIds[1];
            effectiveAllergyIds[numAllergies] = linkedAllergyIds[2];
            effectiveAllergyIds[numAllergies + 1] = linkedAllergyIds[3];

            section.get(context.dbinfo, 'testallergies', patKey, function (err, section) {
                if (err) {
                    done(err);
                } else {
                    verifySection(section, effectiveAllergyIds, done);
                }
            });
        });
    });

    it('search one that has link', function (done) {
        var searchSpec = {
            section: 'testallergies',
            query: {},
            patientInfo: false,
            mustLink: true
        };
        search.search(context.dbinfo, searchSpec, function (err, result, searchInfo) {
            expect(result).to.have.length(4);
            expect(searchInfo).to.exist;
            expect(searchInfo.searchId).not.to.exist;
            expect(searchInfo.page).to.equal(0);
            expect(searchInfo.total).to.equal(4);
            var resultData = result.map(function (r) {
                result.forEach(function (e) {
                    expect(e._section).to.equal('testallergies');
                });
            });
            done();
        });
    });

    it('search one that does not have link', function (done) {
        var searchSpec = {
            section: 'testallergies',
            query: {},
            patientInfo: false
        };
        search.search(context.dbinfo, searchSpec, function (err, result, searchInfo) {
            expect(result).to.have.length(12);
            expect(searchInfo).to.exist;
            expect(searchInfo.searchId).not.to.exist;
            expect(searchInfo.page).to.equal(0);
            expect(searchInfo.total).to.equal(12);
            var resultData = result.map(function (r) {
                result.forEach(function (e) {
                    expect(e._section).to.equal('testallergies');
                });
            });
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
