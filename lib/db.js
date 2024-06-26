"use strict";

var mongoose = require('mongoose');
var _ = require('lodash');
var async = require('async');
var bbm = require('@amida-tech/blue-button-meta');

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
  var dbinfo = {};
  // DeprecationWarning: Mongoose: the `strictQuery` option will be switched back to `false` by default in Mongoose 7.
  mongoose.set('strictQuery', true);
  mongoose.connect(`mongodb://${server}/${dbName}`, function (err, c) {
    if (!c.readyState) {
      callback(err);
    } else {
      dbinfo.connection = c;
      dbinfo.db = c.db;
      dbinfo.GridStore = new mongoose.mongo.GridFSBucket(dbinfo.db, { bucketName: 'storage' });
      dbinfo.ObjectID = mongoose.mongo.ObjectId;

      dbinfo.storageModel = models.storageModel(c);
      dbinfo.accountHistoryModel = models.accountHistoryModel(c);
      dbinfo.notesModel = models.notesModel(c);
      dbinfo.searchModel = models.searchModel(c);
      dbinfo.searchPageModel = models.searchPageModel(c);

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
      dbinfo.maxSearch = options.maxSearch || 50;
    }
  });

  // Disconnect from database
  exports.disconnect = function disconnectDatabase(callback) {
    mongoose.disconnect().then(callback).catch(callback);
  }
};
