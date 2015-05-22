"use strict";

var util = require('util');

var chai = require('chai');
var _ = require('lodash');

var search = require('../../lib/search');

var refmodel = require('./refmodel');

var expect = chai.expect;

describe('search.js', function () {
    var self = this;
    var context = {}; // populated by refmodel common methods

    refmodel.prepareConnection({
        dbName: 'search',
        fhir: true
    }, context)();

    it('add sources', function (done) {
        refmodel.addSourcesPerPatient(context, [1, 1, 1, 1], done);
    });

    var expectedPatData = _.range(4).map(function (ptIndex) {
        var sourceKey = util.format('%s.%s', ptIndex, 0);
        return refmodel.createTestSection('testdemographics', sourceKey, 1)[0];
    });
    expectedPatData.reverse();

    _.range(4).forEach(function (ptIndex) {
        var patKey = util.format('pat%s', ptIndex);
        var sourceKey = util.format('%s.%s', ptIndex, 0);
        var title = util.format('save data for %s', patKey);
        it(title, function (done) {
            refmodel.saveAllSections(patKey, sourceKey, [8, 10], context, done);
        });
    }, self);

    var patientIds;

    it('search all testdemographics', function (done) {
        var searchSpec = {
            section: 'testdemographics',
            query: {},
            patientInfo: false
        };
        search.search(context.dbinfo, searchSpec, function (err, result) {
            expect(result).to.have.length(4);
            var resultData = result.map(function (r) {
                return r.data;
            });
            patientIds = result.map(function (r) {
                return r._id;
            });
            expect(resultData).to.deep.equal(expectedPatData);
            done();
        });
    });

    var expectedAllergyData = _.range(4).map(function (ptIndex) {
        var sourceKey = util.format('%s.%s', ptIndex, 0);
        return refmodel.createTestSection('testallergies', sourceKey, 8);
    });
    expectedAllergyData = _.flatten(expectedAllergyData);
    expectedAllergyData.reverse();

    it('search all testallergies', function (done) {
        var searchSpec = {
            section: 'testallergies',
            query: {},
            patientInfo: true
        };
        var itself = this;
        search.search(context.dbinfo, searchSpec, function (err, result) {
            expect(result).to.have.length(32);
            var count = 0;
            _.range(4).forEach(function (ptIndex) {
                _.range(8).forEach(function (allergyIndex) {
                    var e = result[ptIndex * 8 + allergyIndex];
                    var ptKey = util.format('pat%s', 3 - ptIndex);
                    expect(e._ptKey).to.be.equal(ptKey);
                    expect(e._pt).to.exist;
                    expect(e._pt.reference).to.be.equal(patientIds[ptIndex]);
                    ++count;
                }, itself);
            }, itself);
            expect(count).to.equal(32);
            var resultData = result.map(function (r) {
                return r.data;
            });
            expect(resultData).to.deep.equal(expectedAllergyData);
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
