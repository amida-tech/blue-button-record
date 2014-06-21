"use strict";

var mongo = require('mongodb');
var mongoose = require('mongoose');
var _ = require('underscore');
var bb = require('blue-button');

var models = require('./models');

var fillOptions = function(options) {
    if (! options.dbName) {
        options.dbName = 'dre';
    }

   if (! options.schemas) {
        options.schemas = {};
        var inputSchemas = bb.generateSchema('ccda_ccd');
        delete inputSchemas.identifiers;
        Object.keys(inputSchemas).forEach(function(name) {
            var bbd = inputSchemas[name];
            if (! bbd) {throw new Error('cannot get schema for ' + name);}
            var bbdc = (Array.isArray(bbd)) ? bbd[0] : bbd;
            options.schemas[name] = bbdc;
        });
    }

    if (! options.matchFields) {
        options.matchFields = {
            percent: "number",
            diff: 'any',
            subelements: 'any'
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
            
            var r = models.models(c, options.schemas, options.matchFields);
            if (! r) {
                callback(new Error('models cannot be generated'));
            } else {
                dbinfo.models = r.clinical;
                dbinfo.mergeModels = r.merge;
                dbinfo.matchModels = r.match;
                var mf = options.matchFields;
                dbinfo.sectionNames = Object.keys(options.schemas);
                dbinfo.matchFieldNames = function() {
                    return Object.keys(mf);
                };            
                callback(null, dbinfo);
            }
        }
    });
};
