"use strict";

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var EventSchema = new Schema({
    event_type: {
        type: String,
        enum: ['initAccount', 'loggedIn', 'loggedOut','fileUploaded', 'fileDownloaded', 'labResults', 'passwordChange', 'infoUpdate'],
        required: true
    },
    userID: String,
    note: String, 
    time: {
        type: Date,
        default: Date.now
    }, 
    fileRef: {type:String}
});

var Event = mongoose.model('Event', EventSchema);

exports.Event = Event;

exports.getFullEventName = function(typestring, callback){
	var fullEventNames = {
		initAccount:'Account created', 
		loggedIn:'Logged in',
		loggedOut:'Logged out',
		fileUploaded:'File uploaded',
		fileDownloaded:'File downloaded', //could add filename or MHR
		labResults:'Lab results received', //same as fileUploaded in API
		passwordChange:'Password changed', //not in API yet
		infoUpdate:'Personal Information updated' //not in API yet
	};
	callback(err, fullEventNames[typestring]);
}

//Used in login, storage, record
exports.saveEvent = function(eventType, username, note, file, callback){
	console.log('IN BLUE BUTTON SAVE METHOD');
	var newEvent = new Event({
        userID: username, //not necessary w/authentication?
        event_type: eventType,
        note: note, //file descriptor, IP address
        fileRef: file //MongoDB _id
    });
    console.log('new Event made');
    newEvent.save(function(err, saveResult, num){
    	console.log('right before callback');
    	callback(err, saveResult);
    });
};

exports.allEventsInOrder = function(callback){
	console.log('IN BLUE BUTTON ALL METHOD');
	Event.find({}).sort({
        date: -1
    }).exec(function(err, docs){
    	console.log('right before callback');
    	callback(err, docs);
    });
};

exports.lastLogin = function(callback){
	console.log('IN BLUE BUTTON LOGIN METHOD');
	var loginQuery = Event.find({
        'event_type': 'loggedIn'
    }).sort({
        date: -1
    });
    loginQuery.exec(function(err, logins) {
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
}

exports.lastUpdate = function(callback){
	console.log('IN BLUE BUTTON UPDATE METHOD');
	var updateQuery = Event.find({
        'event_type': 'fileUploaded'
    }).sort({
        date: -1
    });
    updateQuery.exec(function(err, updates) {
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
                var lastUpdate = Event.findOne({
                    event_type: 'initAccount'
                }, function(err, update) {
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
}
