"use strict";

var mongo = require('mongodb');
var mongoose = require('mongoose');
var _ = require('lodash');
var async = require('async');
var bbm = require('blue-button-meta');

var models = require('./models');

//set defaults for database name and list of suported sections in BB JSON model
//(to create corresponding collections for all sections)
var fillOptions = function (options) {
    if (!options.dbName) {
        options.dbName = process.env.DBname || 'dre';
    }

    if (!options.supported_sections) {
        options.supported_sections = bbm.supported_sections;
    }

    if (!options.demographicsSection) {
        options.demographicsSection = 'demographics';
    }
};

//drop all collections
var dropCollections = function (callback) {
    var collections = Object.keys(this.connection.collections);
    var that = this;
    async.forEach(collections, function (collectionName, cb) {
        var collection = that.connection.collections[collectionName];
        collection.drop(function (err) {
            if (err && err.message !== 'ns not found') {
                cb(err);
            } else {
                cb(null);
            }
        });
    }, callback);
};

//establish connection to database and initialize all needed models
exports.connect = function connectDatabase(server, inputOptions, callback) {
    var options = _.clone(inputOptions);
    fillOptions(options);

    var dbName = options.dbName;
    var db = new mongo.Db(dbName, new mongo.Server(server, 27017));
    db.open(function (err, dbase) {
        if (err) {
            callback(err);
        } else {
            var dbinfo = {};
            dbinfo.db = dbase;
            dbinfo.GridStore = mongo.GridStore;
            dbinfo.ObjectID = mongo.ObjectID;
            //dbinfo.grid = new mongo.Grid(dbase, 'storage');
            var c = mongoose.createConnection('mongodb://' + server + '/' + dbName);
            dbinfo.connection = c;

            dbinfo.storageModel = models.storageModel(c);
            dbinfo.accountHistoryModel = models.accountHistoryModel(c);
            dbinfo.notesModel = models.notesModel(c);

            dbinfo.dropCollections = dropCollections;

            var r = models.models(c, options.supported_sections);
            if (!r) {
                callback(new Error('models cannot be generated'));
            } else {
                dbinfo.models = r.clinical;
                dbinfo.mergeModels = r.merge;
                dbinfo.matchModels = r.match;
                dbinfo.sectionNames = options.supported_sections;
                dbinfo.sectionNames.sort();

                callback(null, dbinfo);
            }
            if (options.demographicsSection) {
                dbinfo.demographicsSection = options.demographicsSection;
            }
            dbinfo.fhir = options.fhir;
        }
    });
};
