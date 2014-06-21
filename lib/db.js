"use strict";

var mongo = require('mongodb');
var mongoose = require('mongoose');
var _ = require('underscore');
var bb = require('blue-button');

var models = require('./models');

var supportedSections = [
    'allergies',
    'procedures',
    'medications',
    'encounters',
    'vitals',
    'results',
    'social_history',
    'immunizations',
    'demographics',
    'problems'
];

var fillOptions = function(options) {
    if (! options.dbName) {
        options.dbName = 'dre';
    }

    if (! options.supportedSections) {
        options.supportedSections = supportedSections;
    }

   if (! options.schemas) {
        options.schemas = {};
        supportedSections.forEach(function(name) {
            var bbd = bb.generateSchema('ccda_' + name);
            var bbdc = (name === 'demographics' || name === 'social_history') ? bbd : bbd[0];
            if (! bbdc) {throw new Error('cannot get schema for ' + name);}
            options.schemas[name] = bbdc;
        });
    }

    if (! options.matchFields) {
        options.matchFields = {
            percent: "number",
            diff: null,
            subelements: null
        };
    }
};

exports.connect = function connectDatabase(server, inputOptions, callback) {
    var options = _.clone(inputOptions);
    fillOptions(options);

    var dbName = options.dbName;
    mongo.Db.connect('mongodb://' + server + '/' + dbName, function(err, dbase) {
        if (err) {
            callback(err);
        } else {
            var dbinfo = {};
            dbinfo.db = dbase;
            dbinfo.grid = new mongo.Grid(dbase, 'storage');
            var c = mongoose.createConnection('mongodb://' + server + '/'+ dbName);
            dbinfo.connection = c;
            dbinfo.storageModel = models.storageModel(c);
            
            var r = models.models(c, options.supportedSections, options.schemas, options.matchFields);
            if (! r) {
                callback(new Error('models cannot be generated'));
            } else {
                dbinfo.models = r.clinical;
                dbinfo.mergeModels = r.merge;
                dbinfo.matchModels = r.match;
                var mf = options.matchFields;
                dbinfo.sectionNames = options.supportedSections;
                dbinfo.matchFieldNames = function() {
                    return Object.keys(mf);
                };            
                callback(null, dbinfo);
            }
        }
    });
};
