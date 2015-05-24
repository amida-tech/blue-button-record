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
    var maxSearch = 5;
    var numPatients = 4;
    var numAllersPerPt = 8;
    var numProcsPerPt = 10;

    refmodel.prepareConnection({
        dbName: 'search',
        fhir: true,
        maxSearch: maxSearch
    }, context)();

    it('add sources', function (done) {
        refmodel.addSourcesPerPatient(context, _.times(numPatients, _.constant(1)), done);
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
            expect(searchInfo.pageSize).to.equal(maxSearch);
            expect(searchInfo.total).to.equal(0);
            expect(result).to.have.length(0);
            done();
        });
    });

    var expectedPatData = _.range(numPatients).map(function (ptIndex) {
        var sourceKey = util.format('%s.%s', ptIndex, 0);
        return refmodel.createTestSection('testdemographics', sourceKey, 1)[0];
    });
    expectedPatData.reverse();

    _.range(numPatients).forEach(function (ptIndex) {
        var patKey = util.format('pat%s', ptIndex);
        var sourceKey = util.format('%s.%s', ptIndex, 0);
        var title = util.format('save data for %s', patKey);
        it(title, function (done) {
            refmodel.saveAllSections(patKey, sourceKey, [numAllersPerPt, numProcsPerPt], context, done);
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
            expect(result).to.have.length(numPatients);
            expect(searchInfo).to.exist;
            expect(searchInfo.searchId).not.to.exist;
            expect(searchInfo.page).to.equal(0);
            expect(searchInfo.pageSize).to.equal(maxSearch);
            expect(searchInfo.total).to.equal(numPatients);
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

    var verify = function (numPerPt, actual, expected, offset) {
        var itself = this;
        var count = 0;
        _.range(actual.length).forEach(function (index) {
            var ptIndex = Math.floor((offset + index) / numPerPt);
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
        var expectedData = expected.slice(offset, offset + actual.length);
        expect(actualData).to.deep.equal(expectedData);
    };

    var testPaging = function (sectionName, numPerPt) {
        describe('page test for ' + sectionName, function () {
            var dself = this;
            var total = numPerPt * numPatients;

            var expectedData = _.range(numPatients).map(function (ptIndex) {
                var sourceKey = util.format('%s.%s', ptIndex, 0);
                return refmodel.createTestSection(sectionName, sourceKey, numPerPt);
            });
            expectedData = _.flatten(expectedData);
            expectedData.reverse();

            var searchId;

            it('page:0 (initial call)', function (done) {
                var itself = this;
                var searchSpec = {
                    section: sectionName,
                    patientInfo: true
                };
                search.search(context.dbinfo, searchSpec, function (err, result, searchInfo) {
                    expect(searchInfo).to.exist;
                    expect(searchInfo.searchId).to.exist;
                    expect(searchInfo.page).to.equal(0);
                    expect(searchInfo.pageSize).to.equal(maxSearch);
                    expect(searchInfo.total).to.equal(total);
                    expect(result).to.have.length(maxSearch);
                    searchId = searchInfo.searchId;
                    verify.call(itself, numPerPt, result, expectedData, 0);
                    done();
                });
            });

            var lastPage = Math.ceil(total / maxSearch) - 1;
            _.range(0, lastPage + 1).forEach(function (index) {
                it('page:' + index, function (done) {
                    var itself = this;
                    var searchSpec = {
                        searchId: searchId,
                        section: sectionName,
                        patientInfo: true,
                        page: index
                    };
                    var expectedLength = maxSearch;
                    if ((index === lastPage) && ((total % maxSearch) !== 0)) {
                        expectedLength = total % maxSearch;
                    }
                    search.search(context.dbinfo, searchSpec, function (err, result, searchInfo) {
                        expect(searchInfo).to.exist;
                        expect(searchInfo.searchId).to.equal(searchId);
                        expect(searchInfo.page).to.equal(index);
                        expect(searchInfo.pageSize).to.equal(maxSearch);
                        expect(searchInfo.total).to.equal(total);
                        expect(result).to.have.length(expectedLength);
                        verify.call(itself, numPerPt, result, expectedData, index * maxSearch);
                        done();
                    });
                });
            }, dself);
        });
    };

    testPaging.call(this, 'testallergies', numAllersPerPt);
    testPaging.call(this, 'testprocedures', numProcsPerPt);

});
