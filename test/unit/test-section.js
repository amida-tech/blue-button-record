"use strict";

var async = require('async');

var db = require('../../lib/db');
var section = require('../../lib/section');
var entry = require('../../lib/entry');
var storage = require('../../lib/storage');
var modelutil = require('../../lib/modelutil');

var refmodel = require('./refmodel');

describe('section.js methods', function () {
  var context = {}; // populated by refmodel common methods

  refmodel.prepareConnection('sectiontest', context)();

  it('add sources', function (done) {
    refmodel.addSourcesPerPatient(context, [3, 3, 2], done);
  });

  it('save', function (done) {
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

  it('savePartial', function (done) {
    var matchInfo0 = refmodel.createMatchInformation('0.1', [4, 0, 2], ['diff', 'partial', 'diffsub']);
    var matchInfo1 = refmodel.createMatchInformation('2.1', [1], ['diffsub']);
    var matchInfo2 = refmodel.createMatchInformation('0.1', [2], ['partialsub']);
    var matchInfo3 = refmodel.createMatchInformation('1.1', [1, 3], ['partial', 'diff']);
    var matchInfo4 = refmodel.createMatchInformation('1.2', [2, 4], ['partialsub', 'diffsub']);

    async.parallel([

      function (callback) {
        refmodel.saveMatches(context, 'testallergies', 'pat0', '0.1', '0.0', matchInfo0, callback);
      },
      function (callback) {
        refmodel.saveMatches(context, 'testallergies', 'pat2', '2.1', '2.0', matchInfo1, callback);
      },
      function (callback) {
        refmodel.saveMatches(context, 'testprocedures', 'pat0', '0.1', '0.0', matchInfo2, callback);
      },
      function (callback) {
        refmodel.saveMatches(context, 'testprocedures', 'pat1', '1.1', '1.0', matchInfo3, callback);
      },
      function (callback) {
        refmodel.saveMatches(context, 'testprocedures', 'pat1', '1.2', '1.0', matchInfo4, callback);
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

  it('get', function (done) {
    async.parallel([

      function (callback) {
        section.get(context.dbinfo, 'testallergies', 'pat0', callback);
      },
      function (callback) {
        section.get(context.dbinfo, 'testallergies', 'pat2', callback);
      },
      function (callback) {
        section.get(context.dbinfo, 'testprocedures', 'pat0', callback);
      },
      function (callback) {
        section.get(context.dbinfo, 'testprocedures', 'pat1', callback);
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

  it('getPartial', function (done) {
    async.parallel([

      function (callback) {
        section.getPartial(context.dbinfo, 'testallergies', 'pat0', callback);
      },
      function (callback) {
        section.getPartial(context.dbinfo, 'testallergies', 'pat2', callback);
      },
      function (callback) {
        section.getPartial(context.dbinfo, 'testprocedures', 'pat0', callback);
      },
      function (callback) {
        section.getPartial(context.dbinfo, 'testprocedures', 'pat1', callback);
      },
    ],
      function (err, results) {
        if (!err) {
          checkBBData(results[0], refmodel.createTestSection('testallergies', '0.1', 3));
          checkBBData(results[1], refmodel.createTestSection('testallergies', '2.1', 1));
          checkBBData(results[2], refmodel.createTestSection('testprocedures', '0.1', 1));
          var piece11 = refmodel.createTestSection('testprocedures', '1.1', 2);
          var piece12 = refmodel.createTestSection('testprocedures', '1.2', 2);
          checkBBData(results[3], piece11.concat(piece12));

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

          checkPatientNFile(results[0], 'pat0', 'c01.xml');
          checkPatientNFile(results[1], 'pat2', 'c21.xml');
          checkPatientNFile(results[2], 'pat0', 'c01.xml');

          var cntFilename = {};
          results[3].forEach(function (entry) {
            var filename = refmodel.propertyToFilename(entry.name);
            expect(entry.metadata.attribution[0].record.filename).toBe(filename);
            cntFilename[filename] = (cntFilename[filename] || 0) + 1;
          });
          expect(cntFilename['c11.xml']).toBe(2);
          expect(cntFilename['c12.xml']).toBe(2);

          expect(results[0]).toHaveLength(3);
          expect(results[1]).toHaveLength(1);
          expect(results[2]).toHaveLength(1);
          expect(results[3]).toHaveLength(4);
        }
        done(err);
      }
    );
  });

  it('entry.remove', function (done) {
    var key0 = refmodel.partialEntriesContextKey('testallergies', '2.1');
    var id0 = context[key0][0].entry;
    var key1 = refmodel.partialEntriesContextKey('testprocedures', '1.2');
    var id1 = context[key1][1].entry;
    async.parallel([

      function (callback) {
        entry.remove(context.dbinfo, 'testallergies', key0, id0, callback);
      },
      function (callback) {
        entry.remove(context.dbinfo, 'testprocedures', key1, id1, callback);
      },
    ],
      function (err) {
        done(err);
      }
    );
  });

  it('getPartial (after remove)', function (done) {
    async.parallel([

      function (callback) {
        section.getPartial(context.dbinfo, 'testallergies', 'pat2', callback);
      },
      function (callback) {
        section.getPartial(context.dbinfo, 'testprocedures', 'pat1', callback);
      },
    ],
      function (err, results) {
        if (!err) {

          expect(results[0]).toHaveLength(0);
          expect(results[1]).toHaveLength(3);
          var cntFilename = {};
          results[1].forEach(function (entry) {
            var filename = refmodel.propertyToFilename(entry.name);
            expect(entry.metadata.attribution[0].record.filename).toBe(filename);
            cntFilename[filename] = (cntFilename[filename] || 0) + 1;
          });
          expect(cntFilename['c11.xml']).toBe(2);
          expect(cntFilename['c12.xml']).toBe(1);
        }
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
