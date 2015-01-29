"use strict";

var hist = require('../../lib/history.js');

var chai = require('chai');
var async = require('async');

var db = require('../../lib/db');
var modelutil = require('../../lib/modelutil');

var expect = chai.expect;
chai.config.includeStack = true;

describe('history.js methods', function () {

    it('add account history', function (done) {
        hist.saveEvent("loggedIn", "username", "note", "file", function () {
            console.log("test save Event");
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

        after(function (done) {
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

    */

});
