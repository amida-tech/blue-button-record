"use strict";

var async = require('async');

var db = require('../../lib/db');
var allsections = require('../../lib/allsections');
var modelutil = require('../../lib/modelutil');

var refmodel = require('./refmodel');

describe('allsections.js methods', function () {
  var context = {}; // populated by refmodel common methods

  refmodel.prepareConnection('allsectionstest2', context)();

  it('add sources', function (done) {
    refmodel.addSourcesPerPatient(context, [1, 1], done);
  });

  it('save sections for patient 0', function (done) {
    refmodel.saveAllSections('pat0', '0.0', [3, 3], context, done);
  });

  it('save sections for patient 1', function (done) {
    refmodel.saveAllSections('pat1', '1.0', [2, 4], context, done);
  });

  var verify = function (actual, secName, sourceIndex, count) {
    var expected = refmodel.createTestSection(secName, sourceIndex, count);
    var actualSection = actual[secName];
    expect(expected).toEqual(actualSection);
    expect(actualSection).toEqual(expected);
  };

  it('get', function (done) {
    async.parallel([
      function (cb) {
        allsections.get(context.dbinfo, 'pat0', cb);
      },
      function (cb) {
        allsections.get(context.dbinfo, 'pat1', cb);
      },
    ],
      function (err, results) {
        if (err) {
          done(err);
        } else {
          var actuals = results.map(function (result) {
            return modelutil.mongooseToBBModelFullRecord(result);
          });
          verify(actuals[0], 'testallergies', '0.0', 3);
          verify(actuals[0], 'testprocedures', '0.0', 3);
          verify(actuals[0], 'testdemographics', '0.0', 1);
          verify(actuals[1], 'testallergies', '1.0', 2);
          verify(actuals[1], 'testprocedures', '1.0', 4);
          verify(actuals[1], 'testdemographics', '1.0', 1);
          done();
        }
      }
    );
  });

  afterAll(function (done) {
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
