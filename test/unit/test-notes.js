"use strict";

var record = require('../../index.js');

var chai = require('chai');
var async = require('async');

var assert = require('assert');

var db = require('../../lib/db');
var modelutil = require('../../lib/modelutil');

var expect = chai.expect;
chai.config.includeStack = true;

var dbinfo = {};

describe('notes.js methods', function () {

    before(function (done) {
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

            expect(data.datetime).to.exist;
            expect(data._id).to.exist;
            expect(data.section).to.exist;
            expect(data.entry).to.exist;

            done();
        });

    });

    it('add and edit note', function (done) {
        //record.
        record.addNote("username", "section", "entry", "note", function (err, data) {

            expect(data.datetime).to.exist;
            expect(data._id).to.exist;
            expect(data.section).to.exist;
            expect(data.entry).to.exist;
            expect(data.note).to.equal("note");

            var id = data._id;

            record.editNote("username", id, "note2", function (err, data) {

                expect(data.datetime).to.exist;
                expect(data._id).to.exist;
                expect(data.section).to.exist;
                expect(data.entry).to.exist;
                //console.log("note", data);
                expect(data.note).to.equal("note2");

                done();
            });
        });

    });

    it('get notes ', function (done) {
        //record.
        record.getAllNotes("username", function (err, data) {

            expect(data).to.exist;
            expect(data).to.have.length(2);

            done();

        });

    });

    it('star notes ', function (done) {
        //record.
        record.getAllNotes("username", function (err, data) {

            expect(data).to.exist;
            expect(data).to.have.length(2);
            expect(data[0].star).to.be.false;

            record.starNote("username", data[0]._id, true, function (err, data) {

                expect(data).to.exist;
                expect(data.star).to.be.true;

                done();
            });

        });

    });

    it('unstar notes ', function (done) {
        //record.
        record.getAllNotes("username", function (err, data) {

            expect(data).to.exist;
            expect(data).to.have.length(2);
            expect(data[0].star).to.be.true;

            record.starNote("username", data[0]._id, false, function (err, data) {

                expect(data).to.exist;
                expect(data.star).to.be.false;

                done();
            });

        });

    });

    it('add and delete note', function (done) {
        //record.

        record.getAllNotes("username", function (err, data) {

            expect(data).to.exist;
            expect(data).to.have.length(2);

            record.addNote("username", "section", "entry", "note_to_be deleted", function (err, data) {

                expect(data.datetime).to.exist;
                expect(data._id).to.exist;
                expect(data.section).to.exist;
                expect(data.entry).to.exist;
                expect(data.note).to.equal("note_to_be deleted");

                var id = data._id;

                record.getAllNotes("username", function (err, data) {

                    expect(data).to.exist;
                    expect(data).to.have.length(3);
                    //console.log(data);

                    record.deleteNote("username", id, function (err, data) {
                        expect(err).to.be.null;

                        record.getAllNotes("username", function (err, data) {

                            expect(data).to.exist;
                            expect(data).to.have.length(2);
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

    after(function (done) {
        record.disconnect(function (err) {
            done(err);
        });
    });

});
