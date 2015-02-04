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

    it('get notes ', function (done) {
        //record.
        record.getAllNotes("username", function (err, data) {

            expect(data).to.exist;
            expect(data).to.have.length(1);

            done();

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
