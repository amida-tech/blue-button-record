"use strict";

var record = require('../../index.js');

var async = require('async');

var db = require('../../lib/db');
var modelutil = require('../../lib/modelutil');

var dbinfo = {};

describe('history.js methods', function () {

  beforeAll(function (done) {
    var options = {
      dbName: 'dre-record-test',
      supported_sections: ['allergies', 'procedures']
    };

    dbinfo = record.connectDatabase('localhost', options, function (err) {
      //assert.ifError(err);

      done();

    });

  });

  it('add account history - loggedIn', function (done) {
    //record.
    record.saveEvent("loggedIn", "username", "note", "file", function () {

      record.getRecentLogin("username", function (err, data) {
        //console.log("recent login: ", data);

        expect(data.time).toBeDefined();
        expect(data._id).toBeDefined();
        expect(data.event_type).toBeDefined();
        expect(data.event_type).toBe('loggedIn');

        done();

      });
    });

  });

  it('add account history - fileUploaded', function (done) {
    //record.
    record.saveEvent("fileUploaded", "username", "note", "file", function () {

      record.getRecentUpdate("username", function (err, data) {
        //console.log("recent login: ", data);

        expect(data.time).toBeDefined();
        expect(data._id).toBeDefined();
        expect(data.event_type).toBeDefined();
        expect(data.event_type).toBe('fileUploaded');

        done();

      });
    });

  });

  it('get account history ', function (done) {
    //record.
    record.getAllEvents("username", function (err, data) {

      expect(data).toBeDefined();
      expect(data).toHaveLength(2);

      done();

    });

  });
  /*
      xit('save', function (done) {
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




      xit('entry.remove', function (done) {
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


  */

  it('clearDatabase', function (done) {
    record.clearDatabase(function (err) {
      done(err);
    });
  });

  afterAll(function (done) {
    record.disconnect(function (err) {
      done(err);
    });
  });

});
