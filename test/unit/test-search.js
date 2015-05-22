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
        return refmodel.createTestSection('testdemographics', sourceKey, 1);
    });

    _.range(4).forEach(function (ptIndex) {
        var patKey = util.format('pat%s', ptIndex);
        var sourceKey = util.format('%s.%s', ptIndex, 0);
        var title = util.format('save data for %s', patKey);
        it(title, function (done) {
            refmodel.saveAllSections(patKey, sourceKey, [18, 24], context, done);
        });
    }, self);

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
            expect(result).to.have.length(4);
            var groupResults = groupByPatient(result);
            _.range(4).forEach(function (ptIndex) {
                var ptKey = util.format('pat%s', ptIndex);
                var expected = expectedPatData[ptIndex];
                expect(expected).to.have.length(1);
                var actual = groupResults[ptKey];
                expect(actual).to.have.length(1);
                expect(expected[0]).to.deep.equal(actual[0].data);
            }, itself);
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
