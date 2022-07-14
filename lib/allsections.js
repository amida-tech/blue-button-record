"use strict";

var section = require('./section');
var async = require('async');

exports.get = function (dbinfo, ptKey, callback) {
  var secNames = dbinfo.sectionNames;
  var f = function (secName, cb) {
    section.get(dbinfo, secName, ptKey, cb);
  };
  async.mapSeries(secNames, f, function (err, sections) {
    if (err) {
      callback(err);
    } else {
      var result = secNames.reduce(function (r, secName, index) {
        if (sections[index].length > 0) {
          r[secName] = sections[index];
        }
        return r;
      }, {});

      callback(null, result);
    }
  });
};

exports.save = function (dbinfo, ptKey, ptRecord, sourceId, callback) {
  var f = function (name, cb) {
    if (ptRecord[name]) {
      section.save(dbinfo, name, ptKey, ptRecord[name], sourceId, cb);
    } else {
      cb();
    }
  };

  async.mapSeries(dbinfo.sectionNames, f, callback);
};
