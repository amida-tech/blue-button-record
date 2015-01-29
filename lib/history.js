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
exports.saveEvent = function (dbinfo, eventType, username, note, file, callback) {
    console.log('IN BLUE BUTTON SAVE METHOD');

    console.log("dbinfo: ", dbinfo);

    var newEvent = new dbinfo.otherModels.other.account_history({
        userID: username, //not necessary w/authentication?
        event_type: eventType,
        note: note, //file descriptor, IP address
        fileRef: file //MongoDB _id
    });

    console.log('new Event made', newEvent);

    newEvent.save(function (err, result) { //removed ,num
        console.log('right before callback');
        if (err) {
            console.log("error", err);
            callback(err);
        } else {
            console.log(result);
            callback(null, result);

        }
    });
};

exports.allEventsInOrder = function (dbinfo, callback) {
    var model = dbinfo.otherModels.account_history;

    console.log('IN BLUE BUTTON ALL METHOD');
    model.find({}).sort({
        date: -1
    }).exec(function (err, docs) {
        console.log('right before callback');
        callback(err, docs);
    });
};

exports.lastLogin = function (dbinfo, callback) {
    var model = dbinfo.otherModels.account_history;

    console.log('IN BLUE BUTTON LOGIN METHOD');
    var loginQuery = model.find({
        'event_type': 'loggedIn'
    }).sort({
        date: -1
    });
    loginQuery.exec(function (err, logins) {
        if (err) {
            console.log(err);
            callback(err);
        } else {
            console.log('found logins');
            if (logins.length === 1) {
                //this is first login
                console.log('right before callback');
                callback(null, logins[0]);
            } else if (logins.length === 0) {
                //no logins (e.g. in registered state)
                console.log('right before callback');
                callback(null, null);
            } else {
                //multiple logins
                console.log('right before callback');
                callback(null, logins[1]);
            }
        }
    });
};

exports.lastUpdate = function (dbinfo, callback) {
    var model = dbinfo.otherModels.account_history;

    console.log('IN BLUE BUTTON UPDATE METHOD');
    var updateQuery = model.find({
        'event_type': 'fileUploaded'
    }).sort({
        date: -1
    });
    updateQuery.exec(function (err, updates) {
        if (err) {
            console.log(err);
            callback(err);
        } else {
            if (updates) {
                //console.log('UPDATES\n', updates);
                console.log('right before callback');
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
                        console.log('right before callback');
                        callback(null, update);
                    }
                });
            }
        }
    });
};
