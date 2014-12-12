"use strict";

var DoubleMetaphone = require('doublemetaphone');
var encoder = new DoubleMetaphone();

var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var storageColName = 'storage.files';

exports.models = function(connection, supportedSections) {
    var result = {
        merge: {},
        clinical: {},
        match: {}
    };
    supportedSections.forEach(function(secName) {
        var mergeColName = secName + 'merges';
        var mergeSchema = new Schema({
            entry_type: String,
            pat_key: String,
            entry: ObjectId,
            record: {
                type: ObjectId,
                ref: storageColName
            },
            merged: Date,
            merge_reason: String,
            archived: Boolean
        });
        result.merge[secName] = connection.model(mergeColName, mergeSchema);

        var matchColName = secName + 'matches';
        var matchSchemaDesc = {
            entry_type: String,
            pat_key: String,
            entry: ObjectId,
            matches: [],
            determination: String //Can be 1) Merged, 2) Added, 3) Ignored.
        };
        var matchSchema = new Schema(matchSchemaDesc);
        result.match[secName] = connection.model(matchColName, matchSchema);

        var desc = {};
        desc.data = {};
        desc.pat_key = String;
        desc.metadata = {
            attribution: [{
                type: ObjectId,
                ref: mergeColName
            }]
        };
        desc.reviewed = Boolean;
        desc.archived = Boolean;

        //extra metadata for demographics section for PIm purposes
        if (secName === 'demographics') {
            desc.pim = {};
        }

        var schema = new Schema(desc);

        //hook for demographics model only (to process PIM attributes)
        if (secName === 'demographics') { //TODO: disabled for now
            schema.pre('save', function(next) {
                var self = this;

                self.pim = {};

                // do stuff

                /*
                    The following is a list of blocking traits computed on entities for this matching module:
                    LNMPDOB (last name metaphone plus DOB)
                    LNMPFNPC (last name metaphone plus first name plus zip code)
                    LNFN (last name metaphone plus first name)
                    if SSN available: SMDSSN79 (sex, month of birth, day of birth, SSN digits 7-9)
                    else: SMDLASTNAME13 (sex, month of birth, day of birth, first 3 letters of last name)
                */

                //encoder.setMaxCodeLen(7);
                var lnmp = encoder.doubleMetaphone(self.data.name.last).primary;
                var fn = self.data.name.first.toUpperCase();
                var ln13 = self.data.name.last.substring(0, 3).toUpperCase(); //first 3 letters of last name

                //TODO: better handling of zip in the future
                var zip = "";
                if (self.data.addresses && self.data.addresses[0] && self.data.addresses[0].zip) {
                    zip = self.data.addresses[0].zip;
                }

                var dob = "";
                var mdb = "";
                if (self.data.dob && self.data.dob.point && self.data.dob.point.date) {
                    dob = self.data.dob.point.date.substring(0, 10);
                    mdb = self.data.dob.point.date.substring(5, 10); //month and day of birth
                }

                var gender = "UNKNOWN";
                if (self.data.gender) {
                    gender = self.data.gender.toUpperCase();
                }

                self.pim.lnmpdob = lnmp + dob;
                self.pim.lnmpfnpc = lnmp + fn + zip;
                self.pim.lnfn = lnmp + fn;
                //this.save();

                self.pim.smdlastname13 = gender + mdb + ln13;

                next();
            });
        }

        result.clinical[secName] = connection.model(secName, schema);
    });
    return result;
};

exports.storageModel = function(connection) {
    if (!connection) {
        connection = mongoose;
    }
    //GridFS will automatically make this, but a schema is needed for population/refs.
    var schema = new Schema({
        pat_key: String,
        metadata: {
            class: String
        },
        md5: String,
        uploadDate: Date,
        chunkSize: Number,
        length: Number,
        contentType: String,
        filename: String,
    });

    var model = connection.model(storageColName, schema);
    return model;
};
