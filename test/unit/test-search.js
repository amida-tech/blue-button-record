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
        fhir: true,
        maxSearch: 5
    }, context)();

    it('add sources', function (done) {
        refmodel.addSourcesPerPatient(context, [1, 1, 1, 1], done);
    });

    it('search testallergies when empty', function (done) {
        var itself = this;
        var searchSpec = {
            section: 'testallergies',
            patientInfo: true
        };
        search.search(context.dbinfo, searchSpec, function (err, result, searchInfo) {
            expect(searchInfo).to.exist;
            expect(searchInfo.searchId).not.to.exist;
            expect(searchInfo.page).to.equal(0);
            expect(searchInfo.pageSize).to.equal(5);
            expect(searchInfo.total).to.equal(0);
            expect(result).to.have.length(0);
            done();
        });
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
        search.search(context.dbinfo, searchSpec, function (err, result, searchInfo) {
            expect(result).to.have.length(4);
            expect(searchInfo).to.exist;
            expect(searchInfo.searchId).not.to.exist;
            expect(searchInfo.page).to.equal(0);
            expect(searchInfo.pageSize).to.equal(5);
            expect(searchInfo.total).to.equal(4);
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

    var searchIdAllergies;

    var verifyTestAllergies = function (actual, offset) {
        var itself = this;
        var count = 0;
        _.range(actual.length).forEach(function (index) {
            var ptIndex = Math.floor((offset + index) / 8);
            var e = actual[index];
            var ptKey = util.format('pat%s', 3 - ptIndex);
            expect(e._ptKey).to.be.equal(ptKey);
            expect(e._pt).to.exist;
            expect(e._pt.reference).to.be.equal(patientIds[ptIndex]);
            ++count;
        }, itself);
        expect(count).to.not.equal(0);
        expect(count).to.equal(actual.length);
        var actualData = actual.map(function (r) {
            return r.data;
        });
        var expectedData = expectedAllergyData.slice(offset, offset + actual.length);
        expect(actualData).to.deep.equal(expectedData);
    };

    it('search testallergies page:0 (initial call)', function (done) {
        var itself = this;
        var searchSpec = {
            section: 'testallergies',
            patientInfo: true
        };
        search.search(context.dbinfo, searchSpec, function (err, result, searchInfo) {
            expect(searchInfo).to.exist;
            expect(searchInfo.searchId).to.exist;
            expect(searchInfo.page).to.equal(0);
            expect(searchInfo.pageSize).to.equal(5);
            expect(searchInfo.total).to.equal(32);
            expect(result).to.have.length(5);
            searchIdAllergies = searchInfo.searchId;
            verifyTestAllergies.call(itself, result, 0);
            done();
        });
    });

    _.range(0, 7).forEach(function (index) {
        it('search testallergies page:' + index, function (done) {
            var itself = this;
            var searchSpec = {
                searchId: searchIdAllergies,
                section: 'testallergies',
                patientInfo: true,
                page: index
            };
            search.search(context.dbinfo, searchSpec, function (err, result, searchInfo) {
                expect(searchInfo).to.exist;
                expect(searchInfo.searchId).to.equal(searchIdAllergies);
                expect(searchInfo.page).to.equal(index);
                expect(searchInfo.pageSize).to.equal(5);
                expect(searchInfo.total).to.equal(32);
                expect(result).to.have.length(index === 6 ? 2 : 5);
                verifyTestAllergies.call(itself, result, index * 5);
                done();
            });
        });
    }, self);
});
