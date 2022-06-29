"use strict";

var async = require('async');
var path = require('path');
var fs = require('fs');
var _ = require('lodash');

var bb = require('@amida-tech/blue-button');

var bbr = require('../../index');
var modelutil = require('../../lib/modelutil');

describe('API', function () {
  var ccd = null;

  var sourceIds = null;
  var allergyIds = null;
  var allergySeverities = null;
  var allergyNames = null;
  var partialAllergyIds = null;
  var allergyStatuses = null;
  var partialInput = null;
  var matchIds = null;

  beforeAll(function (done) {
    var filepath = path.join(__dirname, '../artifacts/standard/CCD_demo1.xml');
    var xml = fs.readFileSync(filepath, 'utf8');
    var result = bb.parseString(xml);
    ccd = result.data;
    done();
  });

  it('connectDatabase', function (done) {
    bbr.connectDatabase('localhost', function (err) {
      if (err) {
        done(err);
      } else {
        bbr.clearDatabase(done);
      }
    });
  });

  it('saveSource', function (done) {
    var fileInfo = [{
      name: 'ccd_0.xml',
      type: 'text/xml'
    }, {
      name: 'ccd_1.xml',
      type: 'text/xml'
    }, {
      name: 'ccd_2.xml',
      type: 'text/xml'
    }, {
      name: 'ccd_3.xml',
      type: 'text/xml'
    }, {
      name: 'ccd_4.xml',
      type: 'text/xml'
    }, {
      name: 'ccd_5.xml',
      type: 'text/xml'
    }, {
      name: 'ccd_6.xml',
      type: 'text/xml'
    }];
    async.parallel([
      function (cb) {
        bbr.saveSource('pat0', 'content0', fileInfo[0], 'ccda', cb);
      },
      function (cb) {
        bbr.saveSource('pat0', 'content1', fileInfo[1], 'ccda', cb);
      },
      function (cb) {
        bbr.saveSource('pat0', 'content2', fileInfo[2], 'ccda', cb);
      },
      function (cb) {
        bbr.saveSource('pat1', 'content3', fileInfo[3], 'ccda', cb);
      },
      function (cb) {
        bbr.saveSource('pat1', 'content4', fileInfo[4], 'ccda', cb);
      },
      function (cb) {
        bbr.saveSource('pat1', 'content5', fileInfo[5], 'ccda', cb);
      },
      function (cb) {
        bbr.saveSource('pat1', 'content6', fileInfo[6], 'ccda', cb);
      }
    ],
      function (err, results) {
        if (err) {
          done(err);
        } else {
          sourceIds = results.reduce(function (r, result) {
            var v = result.toString();
            r.push(v);
            return r;
          }, []);
          expect(sourceIds).toHaveLength(7);
          sourceIds.forEach(function (sourceId) {
            expect(sourceId).toBeDefined();
          });
          done();
        }
      }
    );
  });

  it('getSourceList', function (done) {
    bbr.getSourceList('pat0', function (err, results) {
      if (err) {
        done(err);
      } else {
        var actual = results.map(function (result) {
          return result.file_id.toString();
        });
        actual.sort();
        var expected = sourceIds.slice(0, 3);
        expected.sort();
        expect(actual).toEqual(expected);
        done();
      }
    });
  });

  it('getSource', function (done) {
    bbr.getSource('pat0', sourceIds[0], function (err, filename, content) {
      if (err) {
        done(err);
      } else {
        expect(filename).toBe('ccd_0.xml');
        expect(content).toBe('content0');
        done();
      }
    });
  });

  it('updateSource', function (done) {
    var updateInfo = {
      'metadata.parsed': new Date(),
      'metadata.archived': new Date()
    };
    bbr.updateSource('pat0', sourceIds[0], updateInfo, function (err) {
      done(err);
    });
  });

  it('sourceCount', function (done) {
    bbr.sourceCount('pat0', function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).toBe(3);
        done();
      }
    });
  });

  it('saveAllSections', function (done) {
    bbr.saveAllSections('pat0', ccd, sourceIds[0], function (err) {
      if (err) {
        done(err);
      } else {
        done();
      }
    });
  });

  it('getAllSections, cleanSection', function (done) {
    bbr.getAllSections('pat0', function (err, allSections) {
      if (err) {
        done(err);
      } else {
        Object.keys(allSections).forEach(function (secName) {
          var actual = bbr.cleanSection(allSections[secName]);
          var expected = ccd[secName];
          if (secName === 'demographics') {
            expected = [expected];

            //cleanup PIM stuff before comparing
            delete actual[0].pim;

          }
          expect(actual).toEqual(expected);
          expect(expected).toEqual(actual);

        });
        done();
      }
    });
  });

  it('saveSection', function (done) {
    bbr.saveSection('allergies', 'pat1', ccd.allergies, sourceIds[3], function (err, result) {
      if (err) {
        done(err);
      } else {
        allergyIds = result;
        done();
      }
    });
  });

  it('getSection, cleanSection', function (done) {
    bbr.getSection('allergies', 'pat1', function (err, result) {
      if (err) {
        done(err);
      } else {
        var actual = bbr.cleanSection(result);
        var expected = ccd.allergies;
        expect(actual).toEqual(expected);
        expect(expected).toEqual(actual);
        done();
      }
    });
  });

  it('getEntry', function (done) {
    async.map(allergyIds,
      function (id, cb) {
        bbr.getEntry('allergies', 'pat1', id, cb);
      },
      function (err, results) {
        if (err) {
          done(err);
        } else {
          var actual = bbr.cleanSection(results);
          modelutil.mongooseCleanSection(actual);
          actual.forEach(function (e) {
            delete e._id;
          });

          expect(actual).toEqual(ccd.allergies);
          expect(ccd.allergies).toEqual(actual);
          allergySeverities = results.map(function (result) {
            return result.observation.severity.code.name;
          });
          allergyNames = results.map(function (result) {
            return result.observation.allergen && result.observation.allergen.name;
          });
          allergyStatuses = results.map(function (result) {
            return result.observation.status.name;
          });

          [allergyNames, allergyStatuses, allergySeverities].forEach(function (arr) {
            expect(arr).toEqual(expect.not.arrayContaining([undefined]));
            expect(arr).toEqual(expect.not.arrayContaining([null]));
          });
          done();
        }
      }
    );
  });

  it('duplicateEntry', function (done) {
    bbr.duplicateEntry('allergies', 'pat1', allergyIds[0], sourceIds[4], function (err) {
      done(err);
    });
  });

  it('updateEntry', function (done) {
    bbr.updateEntry('allergies', 'pat1', allergyIds[0], sourceIds[5], {
      "observation.severity.code": {
        name: 'Severe',
        code: "24484000",
        code_sytem_name: "SNOMED CT"
      }
    }, function (err) {
      allergySeverities[0] = 'Severe';
      done(err);
    });
  });

  it('getEntry', function (done) {
    bbr.getEntry('allergies', 'pat1', allergyIds[0], function (err, result) {
      expect(result.observation.severity.code.name).toBe('Severe');
      expect(result.observation.allergen.name).toBe(allergyNames[0]);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.attribution).toBeDefined();
      var reasons = result.metadata.attribution.map(function (a) {
        return a.merge_reason;
      });
      // var sources = result.metadata.attribution.map(function (a) {
      //   return a.record._id.toString();
      // });
      expect(reasons).toEqual(['new', 'duplicate', 'update']);
      // var expectedSources = sourceIds.slice(3, 6);
      // expect(sources).toEqual(expectedSources);
      done(err);
    });
  });

  it('getMerges', function (done) {
    bbr.getMerges('allergies', 'pat1', 'observation.allergen.name observation.severity.code.name', 'filename', function (err, results) {
      if (err) {
        done(err);
      } else {
        expect(results).toHaveLength(5);
        results.forEach(function (result) {
          expect(allergyNames).toEqual(expect.arrayContaining([result.entry.observation.allergen.name]));
          expect(allergySeverities).toEqual(expect.arrayContaining([result.entry.observation.severity.code.name]));
          var filename = result.record.filename;
          if (filename === 'ccd_3.xml') {
            expect(result.merge_reason).toBe('new');
          } else if (filename === 'ccd_4.xml') {
            expect(result.merge_reason).toBe('duplicate');
          } else if (filename === 'ccd_5.xml') {
            expect(result.merge_reason).toBe('update');
          } else { // not expected
            expect(false).toBe(true);
          }
        });
        done();
      }
    });
  });

  it('mergeCount', function (done) {
    async.parallel([

      function (cb) {
        bbr.mergeCount('allergies', 'pat1', {}, cb);
      },
      function (cb) {
        bbr.mergeCount('allergies', 'pat1', {
          merge_reason: 'new'
        }, cb);
      },
      function (cb) {
        bbr.mergeCount('allergies', 'pat1', {
          merge_reason: 'duplicate'
        }, cb);
      },
      function (cb) {
        bbr.mergeCount('allergies', 'pat1', {
          merge_reason: 'update'
        }, cb);
      },
    ],
      function (err, results) {
        if (err) {
          done(err);
        } else {
          expect(results[0]).toBe(5);
          expect(results[1]).toBe(3);
          expect(results[2]).toBe(1);
          expect(results[3]).toBe(1);
          done();
        }
      }
    );
  });

  it('saveMatches', function (done) {
    var match1 = {
      diff: {
        severity: 'new'
      },
      percent: 80
    };
    var match2 = {
      diff: {
        status: 'new'
      },
      percent: 90
    };
    var allergies1 = _.clone(ccd.allergies[1]);
    expect(allergies1.observation.severity.code.name).not.toBe('Severe');
    allergies1.observation.severity.code = {
      name: 'Severe',
      code: "24484000",
      code_sytem_name: "SNOMED CT"
    };
    var allergies2 = _.clone(ccd.allergies[2]);
    expect(allergies2.observation.status.name).not.toBe('Inactive');
    allergies2.observation.status = {
      name: "Inactive",
      code: "73425007",
      code_system_name: "SNOMED CT"
    };
    partialInput = [{
      partial_entry: allergies1,
      partial_matches: [{
        match_entry: allergyIds[1],
        match_object: match1

      }],
    }, {
      partial_entry: allergies2,
      partial_matches: [{
        match_entry: allergyIds[2],
        match_object: match2
      }]
    }];
    bbr.saveMatches('allergies', 'pat1', partialInput, sourceIds[6], function (err, result) {
      done(err);
    });
  });

  it('getMatches', function (done) {

    bbr.getMatches('allergies', 'pat1', 'observation.allergen.name observation.severity.code.name observation.status.name', function (err, result) {
      if (err) {
        done(err);
      } else {

        //console.log(JSON.stringify(result, null, 10));
        expect(result).toHaveLength(2);

        if (result[0].entry.observation.allergen.name !== allergyNames[1]) {
          var temp = result[0];
          result[0] = result[1];
          result[1] = temp;
        }

        partialAllergyIds = [result[0].entry._id, result[1].entry._id];

        expect(result[0].matches[0].match_entry.observation.severity.code.name).toBe(allergySeverities[1]);
        expect(result[0].matches[0].match_entry.observation.status.name).toBe(allergyStatuses[1]);
        expect(result[0].matches[0].match_entry.observation.allergen.name).toBe(allergyNames[1]);
        expect(result[0].entry.observation.severity.code.name).toBe('Severe');
        expect(result[0].entry.observation.status.name).toBe(allergyStatuses[1]);
        expect(result[0].entry.observation.allergen.name).toBe(allergyNames[1]);

        expect(result[0].matches[0].match_object.diff.severity).toBe('new');
        expect(result[0].matches[0].match_object.percent).toBe(80);

        expect(result[1].matches[0].match_entry.observation.allergen.name).toBe(allergyNames[2]);
        expect(result[1].matches[0].match_entry.observation.severity.code.name).toBe(allergySeverities[2]);
        expect(result[1].matches[0].match_entry.observation.status.name).toBe(allergyStatuses[2]);
        expect(result[1].entry.observation.allergen.name).toBe(allergyNames[2]);
        expect(result[1].entry.observation.severity.code.name).toBe(allergySeverities[2]);
        expect(result[1].entry.observation.status.name).toBe('Inactive');

        expect(result[1].matches[0].match_object.diff.status).toBe('new');
        expect(result[1].matches[0].match_object.percent).toBe(90);

        matchIds = [result[0]._id, result[1]._id];
        done();
      }
    });
  });

  it('getMatch', function (done) {
    bbr.getMatch('allergies', 'pat1', matchIds[0], function (err, result) {
      if (err) {
        done(err);
      } else {

        expect(result.matches[0].match_entry._id.toString()).toBe(allergyIds[1].toString());
        expect(result.entry._id.toString()).toBe(partialAllergyIds[0].toString());

        expect(result.matches[0].match_entry.observation.allergen.name).toBe(allergyNames[1]);
        expect(result.matches[0].match_entry.observation.severity.code.name).toBe(allergySeverities[1]);
        expect(result.matches[0].match_entry.observation.status.name).toBe(allergyStatuses[1]);
        expect(result.entry.observation.allergen.name).toBe(allergyNames[1]);
        expect(result.entry.observation.severity.code.name).toBe('Severe');
        expect(result.entry.observation.status.name).toBe(allergyStatuses[1]);

        expect(result.matches[0].match_object.diff.severity).toBe('new');
        expect(result.matches[0].match_object.percent).toBe(80);

        done();
      }
    });
  });

  it('matchCount', function (done) {
    async.parallel([

      function (cb) {
        bbr.matchCount('allergies', 'pat1', {}, cb);
      },
      function (cb) {
        bbr.matchCount('allergies', 'pat1', {
          percent: 80
        }, cb);
      },
      function (cb) {
        bbr.matchCount('allergies', 'pat1', {
          percent: 90
        }, cb);
      },
      function (cb) {
        bbr.matchCount('allergies', 'pat1', {
          percent: 95
        }, cb);
      },
    ],
      function (err, results) {
        if (err) {
          done(err);
        } else {

          expect(results[0]).toBe(2);
          expect(results[1]).toBe(1);
          expect(results[2]).toBe(1);
          expect(results[3]).toBe(0);
          done();
        }
      }
    );
  });

  it('-- verify state', function (done) {
    async.parallel([

      function (cb) {
        bbr.matchCount('allergies', 'pat1', {}, cb);
      },
      function (cb) {
        bbr.mergeCount('allergies', 'pat1', {}, cb);
      },
      function (cb) {
        bbr.getSection('allergies', 'pat1', cb);
      },
      function (cb) {
        bbr.getMatches('allergies', 'pat1', "", cb);
      },
      function (cb) {
        bbr.getMatch('allergies', 'pat1', matchIds[0], cb);
      }
    ],
      function (err, results) {
        if (err) {
          done(err);
        } else {
          expect(results[0]).toBe(2);
          expect(results[1]).toBe(5);
          expect(results[2]).toHaveLength(3);
          expect(results[3]).toHaveLength(2);
          expect(results[4].determination).not.toBeDefined();
          done();
        }
      }
    );
  });

  it('cancelMatch', function (done) {
    bbr.cancelMatch('allergies', 'pat1', matchIds[0], 'ignored', function (err) {
      done(err);
    });
  });

  it('-- verify state', function (done) {
    async.parallel([

      function (cb) {
        bbr.matchCount('allergies', 'pat1', {}, cb);
      },
      function (cb) {
        bbr.mergeCount('allergies', 'pat1', {}, cb);
      },
      function (cb) {
        bbr.getSection('allergies', 'pat1', cb);
      },
      function (cb) {
        bbr.getMatches('allergies', 'pat1', "", cb);
      },
      function (cb) {
        bbr.getMatch('allergies', 'pat1', matchIds[0], cb);
      }
    ],
      function (err, results) {
        if (err) {
          done(err);
        } else {
          expect(results[0]).toBe(1);
          expect(results[1]).toBe(5);
          expect(results[2]).toHaveLength(3);
          expect(results[3]).toHaveLength(1);
          expect(results[4].determination).toBe('ignored');
          done();
        }
      }
    );
  });

  it('acceptMatch', function (done) {
    bbr.acceptMatch('allergies', 'pat1', matchIds[1], 'added', function (err) {
      done(err);
    });
  });

  it('-- verify state', function (done) {
    async.parallel([

      function (cb) {
        bbr.matchCount('allergies', 'pat1', {}, cb);
      },
      function (cb) {
        bbr.mergeCount('allergies', 'pat1', {}, cb);
      },
      function (cb) {
        bbr.getSection('allergies', 'pat1', cb);
      },
      function (cb) {
        bbr.getMatches('allergies', 'pat1', "", cb);
      },
      function (cb) {
        bbr.getMatch('allergies', 'pat1', matchIds[1], cb);
      }
    ],
      function (err, results) {
        if (err) {
          done(err);
        } else {
          expect(results[0]).toBe(0);
          expect(results[1]).toBe(6);
          expect(results[2]).toHaveLength(4);
          expect(results[3]).toHaveLength(0);
          expect(results[4].determination).toBe('added');
          done();
        }
      }
    );
  });

  it('clearDatabase', function (done) {
    bbr.clearDatabase(function (err) {
      done(err);
    });
  });

  afterAll(function (done) {
    bbr.disconnect(function (err) {
      done(err);
    });
  });
});
