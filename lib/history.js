"use strict";

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
mongoose.connect('mongodb://localhost:27017/dre');

exports.getFullEventName = function (typestring, callback) {
    var fullEventNames = {
        initAccount: 'Account created',
        loggedIn: 'Logged in',
        loggedOut: 'Logged out',
        fileUploaded: 'File uploaded',
        fileDownloaded: 'File downloaded', //could add filename or MHR
        labResults: 'Lab results received', //same as fileUploaded in API
        passwordChange: 'Password changed', //not in API yet
        infoUpdate: 'Personal Information updated' //not in API yet
    };
    callback(null, fullEventNames[typestring]);
};

//Used in login, storage, record
exports.saveEvent = function (dbinfo, eventType, ptKey, note, file, callback) {
    var newEvent = new dbinfo.accountHistoryModel({
        username: ptKey,
        event_type: eventType,
        note: note, //file descriptor, IP address
        fileRef: file //MongoDB _id
    });

    newEvent.save(function (err, result) { //removed ,num
        if (err) {
            console.log("error", err);
            callback(err);
        } else {
            callback(null, result);

        }
    });
};

exports.allEventsInOrder = function (dbinfo, ptKey, callback) {
    var model = dbinfo.accountHistoryModel;
    model.find({
        "username": ptKey
    }).sort({
        date: -1
    }).exec(function (err, docs) {
        callback(err, docs);
    });
};

exports.lastLogin = function (dbinfo, ptKey, callback) {
    var model = dbinfo.accountHistoryModel;
    var loginQuery = model.find({
        'event_type': 'loggedIn',
        "username": ptKey

    }).sort({
        date: -1
    });
    loginQuery.exec(function (err, logins) {
        if (err) {
            console.log(err);
            callback(err);
        } else {
            if (logins.length === 1) {
                //this is first login
                callback(null, logins[0]);
            } else if (logins.length === 0) {
                //no logins (e.g. in registered state)
                callback(null, null);
            } else {
                //multiple logins
                callback(null, logins[1]);
            }
        }
    });
};

exports.lastUpdate = function (dbinfo, ptKey, callback) {
    var model = dbinfo.accountHistoryModel;

    var updateQuery = model.find({
        'event_type': 'fileUploaded',
        "username": ptKey

    }).sort({
        date: -1
    });
    updateQuery.exec(function (err, updates) {
        if (err) {
            console.log(err);
            callback(err);
        } else {
            if (updates) {
                callback(null, updates[0]);
            } else {
                //no files uploaded, so return account initialized
                var lastUpdate = model.findOne({
                    event_type: 'initAccount'
                }, function (err, update) {
                    if (err) {
                        console.log(err);
                        callback(err);
                    } else {
                        callback(null, update);
                    }
                });
            }
        }
    });
};
