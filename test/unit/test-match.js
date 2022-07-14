"use strict";

var async = require('async');

var match = require('../../lib/match');
var modelutil = require('../../lib/modelutil');

var refmodel = require('./refmodel');

describe('match.js methods', function () {
  var context = {}; // populated by refmodel common methods

  refmodel.prepareConnection('matchtest', context)();

  it('check match models', function (done) {
    expect(context.dbinfo.matchModels).toBeDefined();
    expect(context.dbinfo.matchModels.testallergies).toBeDefined();
    expect(context.dbinfo.matchModels.testprocedures).toBeDefined();
    done();
  });

  var verifyCount = function (addlMessage, expected) {
    return function () {
      it('count' + addlMessage, function (done) {
        async.parallel([

          function (callback) {
            match.count(context.dbinfo, 'testallergies', 'pat0', {}, callback);
          },
          function (callback) {
            match.count(context.dbinfo, 'testprocedures', 'pat0', {}, callback);
          },
          function (callback) {
            match.count(context.dbinfo, 'testallergies', 'pat1', {}, callback);
          },
          function (callback) {
            match.count(context.dbinfo, 'testprocedures', 'pat1', {}, callback);
          },
          function (callback) {
            match.count(context.dbinfo, 'testallergies', 'pat2', {}, callback);
          },
          function (callback) {
            match.count(context.dbinfo, 'testprocedures', 'pat2', {}, callback);
          },
        ],
          function (err, results) {
            if (err) {
              done(err);
            } else {

              //console.log(results);
              results.forEach(function (result, index) {
                expect(result).toBe(expected[index]);
              });
              done();
            }
          }
        );
      });
    };
  };

  var callGetAll = function (callback) {
    async.parallel([

      function (callback) {
        match.getAll(context.dbinfo, 'testallergies', 'pat0', 'name severity', callback);
      },
      function (callback) {
        match.getAll(context.dbinfo, 'testallergies', 'pat2', 'name severity', callback);
      },
      function (callback) {
        match.getAll(context.dbinfo, 'testprocedures', 'pat0', 'name proc_type', callback);
      },
      function (callback) {
        match.getAll(context.dbinfo, 'testprocedures', 'pat1', 'name proc_type', callback);
      },
      function (callback) {
        match.getAll(context.dbinfo, 'testprocedures', 'pat2', 'name proc_type', callback);
      }
    ],
      function (err, results) {
        if (err) {
          callback(err);
        } else {

          //console.log(results);

          var allResults = results[0].concat(results[1]).concat(results[2]).concat(results[3]).concat(results[4]);

          //console.log(allResults);

          var resultsById = allResults.reduce(function (r, result) {

            r[result._id] = result;
            return r;
          }, {});
          callback(null, allResults.length, resultsById);
        }
      }
    );
  };

  verifyCount(' (empty db)', [0, 0, 0, 0, 0, 0])();

  it('getAll (empty db)', function (done) {
    callGetAll(function (err, count) {
      if (err) {
        done(err);
      } else {
        expect(count).toBe(0);
        done();
      }
    });
  });

  it('add sources', function (done) {
    refmodel.addSourcesPerPatient(context, [3, 3, 2], done);
  });

  it('add sections', function (done) {
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

  verifyCount(' (db sections no partial sections)', [0, 0, 0, 0, 0, 0])();

  it('getAll (db sections no partial sections)', function (done) {
    callGetAll(function (err, count) {
      if (err) {
        done(err);
      } else {
        expect(count).toBe(0);
        done();
      }
    });
  });

  it('add partial sections', function (done) {

    //Flip this to new stuff.

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

  verifyCount(' (added partial sections)', [3, 1, 0, 4, 1, 0])();

  var verifyContent = function (resultsById, sourceIndex, index, destsourceIndex, destIndex, secName, diffType) {
    var key = refmodel.partialEntriesContextKey(secName, sourceIndex);
    var id = context[key][index]._id;
    var result = resultsById[id];
    expect(result).toBeDefined();

    //console.log(JSON.stringify(result, null, 10));
    var suffix = '_' + sourceIndex + '.' + index;
    expect(result.entry.name).toBe('name' + suffix);
    var destSuffix = '_' + destsourceIndex + '.' + destIndex;
    expect(result.matches[0].match_entry.name).toBe('name' + destSuffix);
    expect(result.entry_type).toBe(secName);

    ['_id', '__v', 'entry_type', 'entry', 'match_entry', 'pat_key'].forEach(function (p) {
      delete result[p];
    });

    var diffSuffix = '_' + sourceIndex + '.' + destIndex;
    var diffExpect = refmodel.matchObjectInstance[diffType](diffSuffix, destIndex);
    expect(result.matches[0].match_object).toEqual(diffExpect);
  };

  it('getAll (added partial sections)', function (done) {

    callGetAll(function (err, totalCount, resultsById) {
      if (err) {
        done(err);
      } else {

        expect(totalCount).toBe(9);

        verifyContent(resultsById, '0.1', 0, '0.0', 4, 'testallergies', 'diff');
        verifyContent(resultsById, '0.1', 1, '0.0', 0, 'testallergies', 'partial');
        verifyContent(resultsById, '0.1', 2, '0.0', 2, 'testallergies', 'diffsub');
        verifyContent(resultsById, '2.1', 0, '2.0', 1, 'testallergies', 'diffsub');

        verifyContent(resultsById, '0.1', 0, '0.0', 2, 'testprocedures', 'partialsub');
        verifyContent(resultsById, '1.1', 0, '1.0', 1, 'testprocedures', 'partial');
        verifyContent(resultsById, '1.1', 1, '1.0', 3, 'testprocedures', 'diff');
        verifyContent(resultsById, '1.2', 0, '1.0', 2, 'testprocedures', 'partialsub');
        verifyContent(resultsById, '1.2', 1, '1.0', 4, 'testprocedures', 'diffsub');

        done();
      }
    });
  });

  it('count (conditional)', function (done) {
    async.parallel([

      function (callback) {
        match.count(context.dbinfo, 'testallergies', 'pat0', {
          match: 'diff'
        }, callback);
      },
      function (callback) {
        match.count(context.dbinfo, 'testprocedures', 'pat1', {
          match: 'partial'
        }, callback);
      }
    ],
      function (err, results) {
        if (err) {
          done(err);
        } else {
          expect(results[0]).toBe(2);
          expect(results[1]).toBe(2);
          done();
        }
      }
    );
  });

  it('cancel (wrong patient)', function (done) {
    refmodel.cancelMatch(context, 'testallergies', 'wrongpatient', '0.1', 2, function (err) {
      expect(err).toBeDefined();
      done();
    });
  });

  it('cancel', function (done) {
    async.parallel([

      function (callback) {
        refmodel.cancelMatch(context, 'testallergies', 'pat0', '0.1', 2, callback);
      },
      function (callback) {
        refmodel.cancelMatch(context, 'testprocedures', 'pat1', '1.1', 0, callback);
      }
    ],
      function (err) {
        done(err);
      }
    );
  });

  verifyCount(' (some canceled)', [2, 1, 0, 3, 1, 0])();

  var verifyDropped = function (resultsById, sourceIndex, index, secName) {
    var key = refmodel.partialEntriesContextKey(secName, sourceIndex);
    var id = context[key][index]._id;
    var result = resultsById[id];
    expect(result).toBeFalsy();
  };

  it('getAll (some canceled)', function (done) {
    callGetAll(function (err, totalCount, resultsById) {
      if (err) {
        done(err);
      } else {
        expect(totalCount).toBe(7);

        verifyContent(resultsById, '0.1', 0, '0.0', 4, 'testallergies', 'diff');
        verifyContent(resultsById, '0.1', 1, '0.0', 0, 'testallergies', 'partial');
        verifyDropped(resultsById, '0.1', 2, 'testallergies');
        verifyContent(resultsById, '2.1', 0, '2.0', 1, 'testallergies', 'diffsub');

        verifyContent(resultsById, '0.1', 0, '0.0', 2, 'testprocedures', 'partialsub');
        verifyDropped(resultsById, '1.1', 0, 'testprocedures');
        verifyContent(resultsById, '1.1', 1, '1.0', 3, 'testprocedures', 'diff');
        verifyContent(resultsById, '1.2', 0, '1.0', 2, 'testprocedures', 'partialsub');
        verifyContent(resultsById, '1.2', 1, '1.0', 4, 'testprocedures', 'diffsub');

        done();
      }
    });
  });

  it('accept (wrong patient)', function (done) {
    refmodel.acceptMatch(context, 'testallergies', 'wrongpatient', '2.1', 0, function (err) {
      expect(err).toBeDefined();
      done();
    });
  });

  it('accept', function (done) {
    async.parallel([

      function (callback) {
        refmodel.acceptMatch(context, 'testallergies', 'pat2', '2.1', 0, callback);
      },
      function (callback) {
        refmodel.acceptMatch(context, 'testprocedures', 'pat1', '1.2', 1, callback);
      }
    ],
      function (err) {
        done(err);
      }
    );
  });

  verifyCount(' (some accepted)', [2, 1, 0, 2, 0, 0])();

  it('getAll (some accepted)', function (done) {
    callGetAll(function (err, totalCount, resultsById) {
      if (err) {
        done(err);
      } else {
        expect(totalCount).toBe(5);

        verifyContent(resultsById, '0.1', 0, '0.0', 4, 'testallergies', 'diff');
        verifyContent(resultsById, '0.1', 1, '0.0', 0, 'testallergies', 'partial');
        verifyDropped(resultsById, '0.1', 2, 'testallergies');
        verifyDropped(resultsById, '2.1', 0, 'testallergies');

        verifyContent(resultsById, '0.1', 0, '0.0', 2, 'testprocedures', 'partialsub');
        verifyDropped(resultsById, '1.1', 0, 'testprocedures');
        verifyContent(resultsById, '1.1', 1, '1.0', 3, 'testprocedures', 'diff');
        verifyContent(resultsById, '1.2', 0, '1.0', 2, 'testprocedures', 'partialsub');
        verifyDropped(resultsById, '1.2', 1, 'testprocedures');

        done();
      }
    });
  });

  var callGet = function (secName, ptKey, sourceIndex, index, callback) {
    var key = refmodel.partialEntriesContextKey(secName, sourceIndex);
    var id = context[key][index]._id;
    match.get(context.dbinfo, secName, ptKey, id, callback);
  };

  var verifyGetContent = function (result, sourceIndex, index, destsourceIndex, destIndex, secName, diffType, reason) {
    expect(result).toBeDefined();

    var suffix = '_' + sourceIndex + '.' + index;
    var entry = refmodel.testObjectInstance[secName](suffix);
    var resultEntry = modelutil.mongooseToBBModelDocument(result.entry);

    expect(resultEntry).toEqual(entry);

    var destSuffix = '_' + destsourceIndex + '.' + destIndex;
    var destEntry = refmodel.testObjectInstance[secName](destSuffix);

    var destResultEntry = modelutil.mongooseToBBModelDocument(result.matches[0].match_entry);
    expect(destResultEntry).toEqual(destEntry);

    if (reason) {
      expect(result.determination).toBe(reason + suffix);
    } else {
      expect(result.determination).toBeFalsy();
    }

    ['_id', 'entry_type', 'entry', 'match_entry', 'determination'].forEach(function (p) {
      delete result[p];
    });

    var diffSuffix = '_' + sourceIndex + '.' + destIndex;
    var diffExpect = refmodel.matchObjectInstance[diffType](diffSuffix, destIndex);
    expect(result.matches[0].match_object).toEqual(diffExpect);
  };

  it('get', function (done) {

    async.parallel([

      function (callback) {
        callGet('testallergies', 'pat0', '0.1', 0, callback);
      },
      function (callback) {
        callGet('testallergies', 'pat0', '0.1', 1, callback);
      },
      function (callback) {
        callGet('testallergies', 'pat0', '0.1', 2, callback);
      },
      function (callback) {
        callGet('testallergies', 'pat2', '2.1', 0, callback);
      },
      function (callback) {
        callGet('testprocedures', 'pat0', '0.1', 0, callback);
      },
      function (callback) {
        callGet('testprocedures', 'pat1', '1.1', 0, callback);
      },
      function (callback) {
        callGet('testprocedures', 'pat1', '1.1', 1, callback);
      },
      function (callback) {
        callGet('testprocedures', 'pat1', '1.2', 0, callback);
      },
      function (callback) {
        callGet('testprocedures', 'pat1', '1.2', 1, callback);
      },
    ],
      function (err, results) {
        if (err) {
          done(err);
        } else {

          verifyGetContent(results[0], '0.1', 0, '0.0', 4, 'testallergies', 'diff');
          verifyGetContent(results[1], '0.1', 1, '0.0', 0, 'testallergies', 'partial');
          verifyGetContent(results[2], '0.1', 2, '0.0', 2, 'testallergies', 'diffsub', 'cancel');
          verifyGetContent(results[3], '2.1', 0, '2.0', 1, 'testallergies', 'diffsub', 'accept');
          verifyGetContent(results[4], '0.1', 0, '0.0', 2, 'testprocedures', 'partialsub');
          verifyGetContent(results[5], '1.1', 0, '1.0', 1, 'testprocedures', 'partial', 'cancel');
          verifyGetContent(results[6], '1.1', 1, '1.0', 3, 'testprocedures', 'diff');
          verifyGetContent(results[7], '1.2', 0, '1.0', 2, 'testprocedures', 'partialsub');
          verifyGetContent(results[8], '1.2', 1, '1.0', 4, 'testprocedures', 'diffsub', 'accept');

          done();
        }
      }
    );
  });

  it('get (wrong patient)', function (done) {
    callGet('testallergies', 'wrongpatient', '0.1', 0, function (err) {
      expect(err).toBeDefined();
      done();
    });
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
