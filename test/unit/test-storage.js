"use strict";

var util = require('util');
var path = require('path');
var async = require('async');
var _ = require('lodash');

var db = require('../../lib/db');
var storage = require('../../lib/storage');

describe('storage.js methods', function () {
  var dbinfo = null;
  var ids = [];

  var sizes = [5, 250000, 10, 15, 20, 25];
  var types = ['xml', 'bin', 'bin', 'xml', 'xml', 'bin'];
  var pats = ['pat1', 'pat1', 'pat1', 'pat2', 'pat2', 'pat3'];
  var classes = ['ccda', undefined, 'ccda', null, 'ccda', undefined];
  var contents = [];

  var testNow = new Date();

  var getContentType = function (index) {
    if (types[index] === 'xml') {
      return 'text/xml';
    } else {
      return 'binary/octet-stream';
    }
  };

  var getFileName = function (index) {
    return 'c' + index + '.' + types[index];
  };

  var createFileContent = function (index) {
    var content = "<root\n";
    for (var i = 0; i < sizes[index]; ++i) {
      var line = util.format('a%s=d%s\n', i, i);
      content += line;
    }
    content += '/>\n';
    return content;
  };

  beforeAll(function (done) {
    for (var i = 0; i < 6; ++i) {
      contents[i] = createFileContent(i);
    }
    var options = {
      dbName: 'storagetest',
      supportedSections: [],
      typeToSchemaDesc: {}
    };
    db.connect('localhost', options, function (err, result) {
      if (err) {
        done(err);
      } else {
        dbinfo = result;
        done();
      }
    });
  });

  afterAll(function (done) {
    dbinfo.db.dropDatabase(function (err) {
      if (err) {
        done(err);
      } else {
        dbinfo.connection.close(function (err) {
          done(err);
        });
      }
    });
  });

  it('check connection and models', function (done) {
    expect(dbinfo).toBeDefined();
    expect(dbinfo.db).toBeDefined();
    expect(dbinfo.GridStore).toBeDefined();
    expect(dbinfo.ObjectID).toBeDefined();
    expect(dbinfo.storageModel).toBeDefined();
    done();
  });

  it('saveSource', function (done) {
    var f = function (index, callback) {
      var fileinfo = {
        name: getFileName(index),
        type: getContentType(index),
        source: "test file"
      };
      storage.saveSource(dbinfo, pats[index], contents[index], fileinfo, classes[index], callback);
    };
    var r = _.range(6);
    async.map(r, f, function (err, result) {
      if (err) {
        done(err);
      } else {
        ids = result;
        done();
      }
    });
  });

  it('getSourceList', function (done) {
    var f = function (input, callback) {
      var start = input.start;
      var end = input.end;
      storage.getSourceList(dbinfo, pats[start], function (err, result) {
        if (err) {
          callback(err);
        } else {
          var n = result.length;
          expect(n).toEqual((end - start));
          for (var i = start; i < end; ++i) {
            var r = result[i - start];
            var index = -1;
            for (var j = 0; j < 6; ++j) {
              if (ids[j].equals(r.file_id)) {
                index = j;
                break;
              }
            }
            expect(index).not.toEqual(-1);
            expect(r).toBeDefined();
            expect(r.file_name).toEqual(getFileName(index));
            expect(r.file_mime_type).toEqual(getContentType(index));
            expect(r.patient_key).toEqual(pats[index]);
            expect(r.file_parsed).toBeFalsy();
            expect(r.file_archived).toBeFalsy();
            if (classes[index]) {
              expect(r.file_class).toEqual(classes[index]);
            } else {
              expect(r.file_class).toBeFalsy();
            }
          }
          callback();
        }
      });
    };
    var inputs = [
      [0, 3],
      [3, 5],
      [5, 6]
    ].map(function (v) {
      return {
        start: v[0],
        end: v[1]
      };
    });
    async.each(inputs, f, done);
  });

  it('getSource', function (done) {
    var f = function (index, callback) {
      storage.getSource(dbinfo, pats[index], ids[index].toString(), function (err, filename, content) {
        if (err) {
          callback(err);
        } else {
          expect(filename).toEqual(getFileName(index));
          var expectedContent = contents[index];
          expect(content).toEqual(expectedContent);
          callback(null);
        }
      });
    };
    var r = _.range(6);
    async.each(r, f, done);
  });

  it('updateSource', function (done) {
    var f = function (index, callback) {
      var updateInfo = {
        'metadata.parsed': testNow.toISOString(),
        'metadata.archived': testNow.toISOString()
      };
      storage.updateSource(dbinfo, pats[index], ids[index].toString(), updateInfo, function (err) {
        callback(err);
      });
    };
    var r = _.range(6);
    async.each(r, f, done);
  });

  it('getSourceList (after update)', function (done) {
    var f = function (input, callback) {
      var start = input.start;
      var end = input.end;
      storage.getSourceList(dbinfo, pats[start], function (err, result) {
        if (err) {
          callback(err);
        } else {
          var n = result.length;
          expect(n).toBe(end - start);
          for (var i = start; i < end; ++i) {
            var r = result[i - start];
            expect(r.file_parsed).toBe(testNow.toISOString());
            expect(r.file_archived).toBe(testNow.toISOString());
          }
          callback();
        }
      });
    };
    var inputs = [
      [0, 3],
      [3, 5],
      [5, 6]
    ].map(function (v) {
      return {
        start: v[0],
        end: v[1]
      };
    });
    async.each(inputs, f, done);
  });

  it('getSource (wrong patient)', function (done) {
    storage.getSource(dbinfo, 'wrongpatient', ids[0].toString(), function (err, filename, content) {
      expect(err).toBeDefined();
      done();
    });
  });

  it('sourceCount', function (done) {
    var f = function (input, callback) {
      storage.sourceCount(dbinfo, input.patient, function (err, count) {
        if (err) {
          callback(err);
        } else {
          expect(count).toBe(input.count);
          callback(null, count);
        }
      });
    };
    var inputs = [
      ['pat1', 3],
      ['pat2', 2],
      ['pat3', 1],
      ['patnone', 0]
    ].map(function (a) {
      return {
        patient: a[0],
        count: a[1]
      };
    });
    async.each(inputs, f, done);
  });
});
