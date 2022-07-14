"use strict";

var async = require('async');

var db = require('../../lib/db');
var section = require('../../lib/pim');
var entry = require('../../lib/entry');
var storage = require('../../lib/storage');
var modelutil = require('../../lib/modelutil');

var refmodel = require('./refmodel');

describe('pim.js methods', function () {
  var context = {}; // populated by refmodel common methods

  refmodel.prepareConnection('sectiontest', context)();

  it.skip('add sources', function (done) {
    refmodel.addSourcesPerPatient(context, [3, 3, 2], done);
  });

  it.skip('save', function (done) {
    async.parallel([

      function (callback) {
        refmodel.saveSection(context, 'testallergies', 'pat0', '0.0', 5, callback);
      },
      function (callback) {
        refmodel.saveSection(context, 'testallergies', 'pat2', '2.0', 3, callback);
      },
      function (callback) {
        refmodel.saveSection(context, 'testprocedures', 'pat0', '0.0', 3, callback);
      },
      function (callback) {
        refmodel.saveSection(context, 'testprocedures', 'pat1', '1.0', 5, callback);
      },
    ],
      function (err) {
        done(err);
      }
    );
  });

  var checkBBData = function (getResult, original) {
    var bbClean = modelutil.mongooseToBBModelSection(getResult);
    expect(original).toEqual(bbClean);
    expect(bbClean).toEqual(original);
  };

  var checkPatientNFile = function (result, ptKey, filename) {
    result.forEach(function (entry) {
      expect(entry.metadata.attribution[0].record.filename).toBe(filename);
    });
  };

  it.skip('get', function (done) {
    async.parallel([

      function (callback) {
        section.get(context.dbinfo, 'testallergies', callback);
      },
      function (callback) {
        section.get(context.dbinfo, 'testallergies', callback);
      },
      function (callback) {
        section.get(context.dbinfo, 'testprocedures', callback);
      },
      function (callback) {
        section.get(context.dbinfo, 'testprocedures', callback);
      },
    ],
      function (err, results) {
        if (!err) {
          checkBBData(results[0], refmodel.createTestSection('testallergies', '0.0', 5));
          checkBBData(results[1], refmodel.createTestSection('testallergies', '2.0', 3));
          checkBBData(results[2], refmodel.createTestSection('testprocedures', '0.0', 3));
          checkBBData(results[3], refmodel.createTestSection('testprocedures', '1.0', 5));

          results.forEach(function (result) {
            result.forEach(function (entry) {
              expect(entry.archived).toBeFalsy();
              expect(entry.reviewed).toBeFalsy();
              expect(entry.metadata).toBeDefined();
              expect(entry.metadata.attribution).toBeDefined();
              expect(entry.metadata.attribution).toHaveLength(1);
              expect(entry.metadata.attribution[0].merge_reason).toBe('new');
              expect(entry.metadata.attribution[0].record).toBeDefined();
            });
          });

          checkPatientNFile(results[0], 'pat0', 'c00.xml');
          checkPatientNFile(results[1], 'pat2', 'c20.xml');
          checkPatientNFile(results[2], 'pat0', 'c00.xml');
          checkPatientNFile(results[3], 'pat1', 'c10.xml');

          expect(results[0]).toHaveLength(5);
          expect(results[1]).toHaveLength(3);
          expect(results[2]).toHaveLength(3);
          expect(results[3]).toHaveLength(5);
        }
        done(err);
      }
    );
  });
  it.skip('entry.remove', function (done) {
    var key0 = refmodel.partialEntriesContextKey('testallergies', '2.1');
    var id0 = context[key0][0].entry;
    var key1 = refmodel.partialEntriesContextKey('testprocedures', '1.2');
    var id1 = context[key1][1].entry;
    async.parallel([

      function (callback) {
        entry.remove(context.dbinfo, 'testallergies', id0, callback);
      },
      function (callback) {
        entry.remove(context.dbinfo, 'testprocedures', id1, callback);
      },
    ],
      function (err) {
        done(err);
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
