"use strict";

var db = require('./lib/db');
var storage = require('./lib/storage');
var merge = require('./lib/merge');
var match = require('./lib/match');
var section = require('./lib/section');
var entry = require('./lib/entry');
var allsections = require('./lib/allsections');
var modelutil = require('./lib/modelutil');
var search = require('./lib/search');

var account_history = require('./lib/history');
var notes = require('./lib/notes');
var medications = require('./lib/medications');

var pim = require('./lib/pim');

var dbinfo = null;

exports.connectDatabase = function connectDatabase(server, options, callback) {
    if (!callback) {
        callback = options;
        options = {};
    }
    if (!dbinfo) {
        db.connect(server, options, function (err, result) {
            if (err) {
                callback(err);
            } else {
                dbinfo = result;

                callback(null, dbinfo);
            }
        });
    } else {
        callback(new Error('Multiple database connections from same client is not supported.'));
    }
};

exports.disconnect = function (callback) {
    if (dbinfo) {
        dbinfo.connection.close(function (err) {
            dbinfo = null;
            callback(err);
        });
    } else {
        callback(new Error('No connection has been established.'));
    }
};

exports.clearDatabase = function (callback) {
    if (dbinfo) {
        dbinfo.dropCollections(callback);
    } else {
        callback(new Error('No connection has been established.'));
    }
};

// records

exports.saveSource = function (ptKey, content, sourceInfo, contentType, callback) {
    storage.saveSource(dbinfo, ptKey, content, sourceInfo, contentType, callback);
};

exports.getSourceList = function (ptKey, callback) {
    storage.getSourceList(dbinfo, ptKey, callback);
};

exports.updateSource = function (ptKey, sourceId, update, callback) {
    storage.updateSource(dbinfo, ptKey, sourceId, update, callback);
};

exports.getSource = function (ptKey, sourceId, callback) {
    storage.getSource(dbinfo, ptKey, sourceId, callback);
};

exports.sourceCount = function (ptKey, callback) {
    storage.sourceCount(dbinfo, ptKey, callback);
};

// merges

exports.getMerges = function (secName, ptKey, entryFields, recordFields, callback) {
    merge.getAll(dbinfo, secName, ptKey, entryFields, recordFields, callback);
};

exports.mergeCount = function (secName, ptKey, conditions, callback) {
    merge.count(dbinfo, secName, ptKey, conditions, callback);
};

// matches

exports.saveMatches = function (secName, ptKey, inputSection, sourceId, callback) {
    section.savePartial(dbinfo, secName, ptKey, inputSection, sourceId, callback);
};

exports.getMatches = function (secName, ptKey, fields, callback) {
    match.getAll(dbinfo, secName, ptKey, fields, callback);
};

exports.getMatch = function (secName, ptKey, id, callback) {
    match.get(dbinfo, secName, ptKey, id, callback);
};

exports.matchCount = function (secName, ptKey, conditions, callback) {
    match.count(dbinfo, secName, ptKey, conditions, callback);
};

exports.cancelMatch = function (secName, ptKey, id, reason, callback) {
    match.cancel(dbinfo, secName, ptKey, id, reason, callback);
};

exports.acceptMatch = function (secName, ptKey, id, reason, callback) {
    match.accept(dbinfo, secName, ptKey, id, reason, callback);
};

// section

exports.getSection = function (secName, ptKey, callback) {
    section.get(dbinfo, secName, ptKey, callback);
};

exports.saveSection = function (secName, ptKey, inputSection, sourceId, callback) {
    section.save(dbinfo, secName, ptKey, inputSection, sourceId, callback);
};

exports.getAllSections = function (ptKey, callback) {
    allsections.get(dbinfo, ptKey, callback);
};

exports.saveAllSections = function (ptKey, ptRecord, sourceId, callback) {
    allsections.save(dbinfo, ptKey, ptRecord, sourceId, callback);
};

// search

exports.search = function (searchSpec, callback) {
    search.search(dbinfo, searchSpec, callback);
};

// entry

exports.getEntry = function (secName, ptKey, id, callback) {
    entry.get(dbinfo, secName, ptKey, id, callback);
};

exports.updateEntry = function (secName, ptKey, id, sourceId, updateObject, callback) {
    entry.update(dbinfo, secName, ptKey, id, sourceId, updateObject, callback);
};

exports.replaceEntry = function (secName, ptKey, id, sourceId, updateObject, callback) {
    entry.replace(dbinfo, secName, ptKey, id, sourceId, updateObject, callback);
};

exports.duplicateEntry = function (secName, ptKey, id, sourceId, callback) {
    entry.duplicate(dbinfo, secName, ptKey, id, sourceId, callback);
};

exports.removeEntry = function (secName, ptKey, id, callback) {
    entry.remove(dbinfo, secName, ptKey, id, callback);
};

exports.idToPatientKey = function (secName, id, callback) {
    entry.idToPatientKey(dbinfo, secName, id, callback);
};

exports.patientKeyToId = function (secName, ptKey, callback) {
    entry.patientKeyToId(dbinfo, secName, ptKey, callback);
};

exports.idToPatientInfo = function (secName, id, callback) {
    entry.idToPatientInfo(dbinfo, secName, id, callback);
};

// utility

exports.cleanSection = function (input) {
    return modelutil.mongooseToBBModelSection(input);
};

// PIM query
exports.getCandidates = function (ptInfo, callback) {
    pim.get(dbinfo, ptInfo, callback);
};

//Account History Methods
exports.saveEvent = function (eventName, ptKey, note, file, callback) {
    account_history.saveEvent(dbinfo, eventName, ptKey, note, file, callback);
};

exports.getFullEventName = function (eventName, callback) {
    account_history.getFullEventName(dbinfo, eventName, callback);
};

exports.getAllEvents = function (ptKey, callback) {
    account_history.allEventsInOrder(dbinfo, ptKey, callback);
};

exports.getRecentLogin = function (ptKey, callback) {
    account_history.lastLogin(dbinfo, ptKey, callback);
};

exports.getRecentUpdate = function (ptKey, callback) {
    account_history.lastUpdate(dbinfo, ptKey, callback);
};

exports.addNote = function (ptKey, section, entry, note, callback) {
    notes.addNote(dbinfo, ptKey, section, entry, note, callback);
};

exports.editNote = function (ptKey, id, note, callback) {
    notes.editNote(dbinfo, ptKey, id, note, callback);
};

exports.starNote = function (ptKey, id, star, callback) {
    notes.starNote(dbinfo, ptKey, id, star, callback);
};

exports.deleteNote = function (ptKey, id, callback) {
    notes.deleteNote(dbinfo, ptKey, id, callback);
};

exports.getAllNotes = function (ptKey, callback) {
    notes.allNotesInOrder(dbinfo, ptKey, callback);
};

exports.addMedication = function (ptKey, medication, callback) {
    medications.addMedication(dbinfo, ptKey, medication, callback);
};

exports.editMedication = function (ptKey, id, medication, callback) {
    medications.editMedication(dbinfo, ptKey, id, medication, callback);
};

exports.deleteMedication = function (ptKey, id, callback) {
    medications.deleteMedication(dbinfo, ptKey, id, callback);
};

exports.getAllMedications = function (ptKey, callback) {
    medications.allMedicationsInOrder(dbinfo, ptKey, callback);
};
