"use strict";

var record = require('../../index.js');

var async = require('async');

var db = require('../../lib/db');
var modelutil = require('../../lib/modelutil');

var dbinfo = {};

describe('notes.js methods', function () {

  beforeAll(function (done) {
    var options = {
      dbName: 'dre-notes-test',
      supported_sections: ['allergies', 'procedures']
    };

    dbinfo = record.connectDatabase('localhost', options, function (err) {
      //assert.ifError(err);

      done();

    });

  });

  it('add note', function (done) {
    //record.
    record.addNote("username", "section", "entry", "note", function (err, data) {

      expect(data.datetime).toBeDefined();
      expect(data._id).toBeDefined();
      expect(data.section).toBeDefined();
      expect(data.entry).toBeDefined();

      done();
    });

  });

  it('add and edit note', function (done) {
    //record.
    record.addNote("username", "section", "entry", "note", function (err, data) {

      expect(data.datetime).toBeDefined();
      expect(data._id).toBeDefined();
      expect(data.section).toBeDefined();
      expect(data.entry).toBeDefined();
      expect(data.note).toBe("note");

      var id = data._id;

      record.editNote("username", id, "note2", function (err, data) {

        expect(data.datetime).toBeDefined();
        expect(data._id).toBeDefined();
        expect(data.section).toBeDefined();
        expect(data.entry).toBeDefined();
        //console.log("note", data);
        expect(data.note).toBe("note2");

        done();
      });
    });

  });

  it('get notes ', function (done) {
    //record.
    record.getAllNotes("username", function (err, data) {

      expect(data).toBeDefined();
      expect(data).toHaveLength(2);

      done();

    });

  });

  it('star notes ', function (done) {
    //record.
    record.getAllNotes("username", function (err, data) {

      expect(data).toBeDefined();
      expect(data).toHaveLength(2);
      expect(data[0].star).toBe(false);

      record.starNote("username", data[0]._id, true, function (err, data) {

        expect(data).toBeDefined();
        expect(data.star).toBe(true);

        done();
      });

    });

  });

  it('unstar notes ', function (done) {
    //record.
    record.getAllNotes("username", function (err, data) {

      expect(data).toBeDefined();
      expect(data).toHaveLength(2);
      expect(data[0].star).toBe(true);

      record.starNote("username", data[0]._id, false, function (err, data) {

        expect(data).toBeDefined();
        expect(data.star).toBe(false);

        done();
      });

    });

  });

  it('add and delete note', function (done) {
    //record.

    record.getAllNotes("username", function (err, data) {

      expect(data).toBeDefined();
      expect(data).toHaveLength(2);

      record.addNote("username", "section", "entry", "note_to_be deleted", function (err, data) {

        expect(data.datetime).toBeDefined();
        expect(data._id).toBeDefined();
        expect(data.section).toBeDefined();
        expect(data.entry).toBeDefined();
        expect(data.note).toBe("note_to_be deleted");

        var id = data._id;

        record.getAllNotes("username", function (err, data) {

          expect(data).toBeDefined();
          expect(data).toHaveLength(3);
          //console.log(data);

          record.deleteNote("username", id, function (err, data) {
            expect(err).toBeNull();

            record.getAllNotes("username", function (err, data) {

              expect(data).toBeDefined();
              expect(data).toHaveLength(2);
              //console.log(data);

              done();
            });
          });
        });
      });

    });

  });

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
