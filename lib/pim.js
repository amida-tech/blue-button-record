"use strict";

var _ = require('lodash');
var async = require('async');

var merge = require('./merge');
var modelutil = require('./modelutil');
var match = require('./match');
var entry = require('./entry');

var DoubleMetaphone = require('doublemetaphone');
var encoder = new DoubleMetaphone();

var localGet = function (dbinfo, ptInfo, callback) {

    //console.log(">>ptInfo: ", JSON.stringify(ptInfo, null, 4));

    var pim = {};

    /*
        The following is a list of blocking traits computed on entities for this matching module:
        LNMPDOB (last name metaphone plus DOB)
        LNMPFNPC (last name metaphone plus first name plus zip code)
        LNFN (last name metaphone plus first name)
        if SSN available: SMDSSN79 (sex, month of birth, day of birth, SSN digits 7-9)
        else: SMDLASTNAME13 (sex, month of birth, day of birth, first 3 letters of last name)
    */

    //encoder.setMaxCodeLen(7);
    var lnmp = encoder.doubleMetaphone(ptInfo.data.name.last).primary;
    var fn = ptInfo.data.name.first.toUpperCase();
    var ln13 = ptInfo.data.name.last.substring(0, 3).toUpperCase(); //first 3 letters of last name

    //TODO: better handling of zip in the future
    var zip = "";
    if (ptInfo.data.addresses && ptInfo.data.addresses[0] && ptInfo.data.addresses[0].zip) {
        zip = ptInfo.data.addresses[0].zip;
    }

    var dob = "";
    var mdb = "";
    if (ptInfo.data.dob && ptInfo.data.dob.point && ptInfo.data.dob.point.date) {
        dob = ptInfo.data.dob.point.date.substring(0, 10);
        mdb = ptInfo.data.dob.point.date.substring(5, 10); //month and day of birth
    }

    var gender = ptInfo.data.gender.toUpperCase();

    pim.lnmpdob = lnmp + dob;
    pim.lnmpfnpc = lnmp + fn + zip;
    pim.lnfn = lnmp + fn;
    //this.save();

    pim.smdlastname13 = gender + mdb + ln13;

    var secName = "demographics";
    var reviewed = true; //(only actual/current MHR records)
    var model = dbinfo.models[secName];

    var query = model.find({
        $or: [{
            "pim.lnmpdob": pim.lnmpdob
        }, {
            "pim.lnmpfnpc": pim.lnmpfnpc
        }, {
            "pim.lnfn": pim.lnfn
        }, {
            "pim.smdlastname13": pim.smdlastname13
        }]
    });
    query.where('archived').in([null, false]);
    query.where('reviewed', reviewed);
    query.lean();
    //query.populate('metadata.attribution', 'record merge_reason merged -_id');

    query.exec(function (err, results) {
        if (err) {
            callback(err);
        } else {
            //dbinfo.storageModel.populate(results, {
            //    path: 'metadata.attribution.record',
            //    select: 'filename'
            //}, function (err, docs) {
            if (err) {
                callback(err);
            } else {
                //modelutil.mongooseCleanSection(docs);
                //callback(null, docs);
                callback(null, results);
            }
            //});
        }
    });
};

exports.get = function (dbinfo, ptInfo, callback) {
    //TODO: ignore patient info for PIM query for now
    localGet(dbinfo, ptInfo, callback);
};
