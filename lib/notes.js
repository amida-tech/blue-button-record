"use strict";

//Save new note attached to health record entry
exports.addNote = function (dbinfo, ptKey, section, entry, note, callback) {
    var newNote = new dbinfo.notesModel({
        username: ptKey,
        section: section,
        entry: entry, //reference to entry _id in mongo
        note: note
    });

    newNote.save(function (err, result) {
        if (err) {
            callback(err);
        } else {
            callback(null, result);
        }
    });
};

//Edit note attached to health record entry
exports.editNote = function (dbinfo, ptKey, id, note, callback) {
    var model = dbinfo.notesModel;
    model.findOne({
        "username": ptKey,
        "_id": id
    }).exec(function (err, n) {
        n.note = note;
        n.datetime = Date.now(); //timestamp with current time
        n.save(function (err, result) {
            if (err) {
                console.log("error", err);
                callback(err);
            } else {
                callback(null, result);
            }
        });
    });
};

//Delete note
exports.deleteNote = function (dbinfo, ptKey, id, callback) {

    var model = dbinfo.notesModel;
    model.findOne({
        "username": ptKey,
        "_id": id
    }).remove().exec(function (err, note) {
        if (err) {
            console.log("error", err);
            callback(err);
        } else {
            callback(null);
        }
    });
};

//Stars note
exports.starNote = function (dbinfo, ptKey, id, star, callback) {

    var model = dbinfo.notesModel;
    model.findOne({
        "username": ptKey,
        "_id": id
    }).exec(function (err, note) {
        note.star = star;
        note.save(function (err, result) {
            if (err) {
                console.log("error", err);
                callback(err);
            } else {
                callback(null, result);
            }
        });
    });
};

exports.allNotesInOrder = function (dbinfo, ptKey, callback) {
    var model = dbinfo.notesModel;
    model.find({
        "username": ptKey
    }).sort({
        date: -1
    }).exec(function (err, docs) {
        callback(err, docs);
    });
};
