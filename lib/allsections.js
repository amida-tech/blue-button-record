"use strict";

var section = require('./section');
var async = require('async');

exports.get = function(dbinfo, ptKey, callback) {
    var secNames = dbinfo.sectionNames;
    var f = function(secName, cb) {
        section.get(dbinfo, secName, ptKey, cb);
    };
    async.map(secNames, f, function(err, sections) {
        if (err) {
            callback(err);
        } else {
            var result = secNames.reduce(function(r, secName, index) {
                r[secName] = sections[index];
                return r;
            }, {});
            callback(null, result);
        }
    });
};

exports.save = function(dbinfo, ptKey, ptRecord, sourceId, callback) {
    var f = function(name, cb) {
        section.save(dbinfo, name, ptKey, ptRecord[name], sourceId, cb);
    };
    var objectKeys = Object.keys(ptRecord);
    //remove entries that have empty objects
    for(var key in ptRecord){
        if(Object.keys(ptRecord[key]) === 0){
            var keyIndex = objectKeys.indexOf(key);
            objectKeys.splice(keyIndex, 1);
        }
    }
    var insurIndex = objectKeys.indexOf('insurance');
    objectKeys.splice(insurIndex, 1);
    var claimsIndex = objectKeys.indexOf('claims');
    objectKeys.splice(claimsIndex, 1);
    //console.log(objectKeys);
    async.map(objectKeys, f, callback);
};
