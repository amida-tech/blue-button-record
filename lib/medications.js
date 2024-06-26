"use strict";

exports.addMedication = function (dbinfo, ptKey, input, callback) {
  var r = {
    data: input,
    pat_key: ptKey,
    reviewed: true
  };
  var newMedication = new dbinfo.models.medications(r);

  newMedication.save(function (err, result) {
    if (err) {
      console.log("error", err);
      callback(err);
    } else {
      callback(null, result);
    }
  });
};
//

exports.editMedication = function (dbinfo, ptKey, id, input, callback) {
  var model = dbinfo.models.medications;
  model.findOne({
    "pat_key": ptKey,
    "_id": id
  }).exec(function (err, m) {
    m.data = input;
    m.save(function (err, result) {
      if (err) {
        console.log("error", err);
        callback(err);
      } else {
        callback(null, result);
      }
    });
  });
};

exports.deleteMedication = function (dbinfo, ptKey, id, callback) {
  var model = dbinfo.models.medications;
  model.findOne({
    "pat_key": ptKey,
    "_id": id
  }).deleteOne().exec(function (err, note) {
    if (err) {
      console.log("error", err);
      callback(err);
    } else {
      callback(null);
    }
  });
};

exports.allMedicationsInOrder = function (dbinfo, ptKey, callback) {
  var model = dbinfo.models.medications;
  model.find({
    "pat_key": ptKey
  }).sort({
    date: -1
  }).exec(function (err, docs) {
    callback(err, docs);
  });
};
