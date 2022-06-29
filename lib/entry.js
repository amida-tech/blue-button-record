"use strict";

var async = require('async');
var mongoose = require('mongoose');
var jsutil = require('./jsutil');

var merge = require('./merge');
var modelutil = require('./modelutil');

exports.remove = function (dbinfo, secName, ptKey, id, callback) {
  if (typeof id === 'string') {
    id = mongoose.Types.ObjectId(id);
  }

  var removeModel = function (callback) {
    var model = dbinfo.models[secName];
    var query = model.update({
      _id: id
    }, {
      archived: true,
      archived_on: new Date()
    });
    query.exec(callback);
  };

  var removeMerge = function (callback) {
    var model = dbinfo.mergeModels[secName];
    var query = model.update({
      entry: id
    }, {
      archived: true
    });
    query.exec(callback);
  };

  async.series([removeMerge, removeModel], callback);
};

var hide = function (dbinfo, secName, ptKey, id, callback) {
  if (typeof id === 'string') {
    id = mongoose.Types.ObjectId(id);
  }

  var hideModel = function (callback) {
    var model = dbinfo.models[secName];
    var query = model.update({
      _id: id
    }, {
      hidden: true,
    });
    query.exec(callback);
  };

  var hideMerge = function (callback) {
    var model = dbinfo.mergeModels[secName];
    var query = model.update({
      entry: id
    }, {
      hidden: true
    });
    query.exec(callback);
  };

  async.series([hideMerge, hideModel], callback);
};

exports.get = function (dbinfo, secName, ptKey, id, options, callback) {
  if (!callback) {
    callback = options;
    options = {};
  }
  if (!options) {
    options = {};
  }
  var model = dbinfo.models[secName];
  if (typeof id === 'string') {
    id = mongoose.Types.ObjectId(id);
  }
  var queryInput = {
    '_id': id,
    pat_key: ptKey
  };
  var query = model.findOne(queryInput);
  query.populate({ path: 'metadata.attribution', select: 'record merge_reason merged -_id' }).lean();
  query.exec(function (err, result) {
    if (err || !result) {
      err ? callback(err) : callback(new Error('no entry found.'));
    } else {
      dbinfo.storageModel.populate(result, {
        path: 'metadata.attribution.record',
        select: 'filename _id'
      }, function (err, doc) {
        if (err) {
          callback(err);
        } else {
          if (!options.fhir) {
            modelutil.mongooseCleanDocument(doc);
          }
          callback(null, doc);
        }
      });
    }
  });
};

exports.getOnlyHealthFields = function (dbinfo, secName, ptKey, id, fields, callback) {
  var model = dbinfo.models[secName];
  var updateFields = fields ? fields.split(' ').map(function (a) {
    return 'data.' + a;
  }).join(' ') : fields;
  var query = model.findOne({
    '_id': id,
    'pat_key': ptKey
  }, updateFields).lean();
  query.exec(function (err, result) {
    if (err || !result) {
      err ? callback(err) : callback(new Error('no entry found.'));
    } else {
      delete result.metadata;
      modelutil.mongooseCleanDocument(result);
      callback(null, result);
    }
  });
};

exports.getRawFields = function (dbinfo, secName, ptKey, id, fields, callback) {
  var model = dbinfo.models[secName];
  var updateFields = fields ? fields.split(' ').map(function (a) {
    return 'data.' + a;
  }).join(' ') + ' reviewed' : 'reviewed';
  var query = model.findOne({
    '_id': id,
    'pat_key': ptKey
  }, updateFields).lean();
  query.exec(function (err, result) {
    if (err || !result) {
      err ? callback(err) : callback(new Error('no entry found.'));
    } else {
      //delete result.metadata;
      //modelutil.mongooseCleanDocument(result);
      callback(null, result);
    }
  });
};

var updateOrReplace = (function () {
  var specialProps = {
    metadata: true,
    reviewed: true,
    archived: true,
    pat_key: true,
    _id: true,
    __v: true
  };

  var dataProp = function (prop) {
    var piece1st = prop.split('.')[0];
    return !specialProps[piece1st];
  };

  return function (dbinfo, secName, ptKey, id, sourceId, updateObject, replace, options, callback) {
    if (!callback) {
      callback = options;
      options = {};
    }
    if (!options) {
      options = {};
    }

    var model = dbinfo.models[secName];
    var queryObject = {
      '_id': id,
      pat_key: ptKey
    };
    var query = model.findOne(queryObject);
    query.exec(function (err, entry) {
      if (err || !entry) {
        err ? callback(err) : callback(new Error('no entry found.'));
      } else {
        entry.reviewed = true;
        if (replace) {
          var entryObject = entry.toObject();
          Object.keys(entryObject.data).forEach(function (key) {
            if (!updateObject.hasOwnProperty(key)) {
              entry.set('data.' + key, undefined);
              entry.markModified('data' + '.' + key);
            }
          });
        }
        Object.keys(updateObject).filter(dataProp).forEach(function (key) {
          entry.set('data' + '.' + key, updateObject[key]);
          entry.markModified('data' + '.' + key);
        });
        var mergeInfo = {
          record: sourceId,
          merge_reason: 'update'
        };
        merge.save(dbinfo, secName, entry, mergeInfo, options, callback);
      }
    });
  };
}());

exports.update = function (dbinfo, secName, ptKey, id, sourceId, updateObject, options, callback) {
  updateOrReplace(dbinfo, secName, ptKey, id, sourceId, updateObject, false, options, callback);
};

exports.replace = function (dbinfo, secName, ptKey, id, sourceId, updateObject, options, callback) {
  updateOrReplace(dbinfo, secName, ptKey, id, sourceId, updateObject, true, options, callback);
};

exports.save = function (dbinfo, secName, input, sourceId, options, callback) {
  if (!callback) {
    callback = options;
    options = {};
  }
  if (!options) {
    options = {};
  }
  var entryModel = new dbinfo.models[secName](input);

  var saveEntry = function (cb) {
    entryModel.save(function (err, saveResult) {
      if (err || (!input._link)) {
        cb(err, saveResult);
      } else {
        hide(dbinfo, secName, input.pat_key, input._link, function (err) {
          cb(err, saveResult);
        });
      }
    });
  };

  var saveMerge = function (saveResult, cb) {
    var mergeInfo = {
      record: sourceId,
      merge_reason: 'new'
    };
    merge.save(dbinfo, secName, saveResult, mergeInfo, options, cb);
  };

  async.waterfall([saveEntry, saveMerge], callback);
};

exports.duplicate = function (dbinfo, secName, ptKey, id, sourceId, callback) {
  var model = dbinfo.models[secName];

  var query = model.findOne({
    '_id': id,
    'pat_key': ptKey
  });
  query.exec(function (err, current) {
    if (err | !current) {
      err ? callback(err) : callback(new Error('no entry found.'));
    } else {
      var mergeInfo = {
        record: sourceId,
        merge_reason: 'duplicate'
      };
      merge.save(dbinfo, secName, current, mergeInfo, callback);
    }
  });
};

exports.idToPatientKey = function (dbinfo, secName, id, callback) {
  id = jsutil.toObjectId(id);
  if (id === null) {
    callback(null, {
      invalid: true
    });
    return;
  }
  var model = dbinfo.models[secName];
  var query = model.findOne({
    '_id': id
  });
  query.exec(function (err, current) {
    if (err) {
      callback(err);
    } else if (!current) {
      callback(null, null);
    } else {
      callback(null, {
        key: current.pat_key,
        archived: current.archived,
        invalid: false
      });
    }
  });
};

var nameToDisplay = function (name) {
  if (name) {
    var display = name.last || '';
    var given = name.first || '';
    if (name.middle && name.middle.length) {
      name.middle.forEach(function (middle) {
        if (middle && middle.length) {
          if (given) {
            given += ' ';
          }
          given += middle.charAt(0);
        }
      });
    }
    if (given.length) {
      if (display) {
        display += ', ';
      }
      display += given;
    }
    return display;
  }
  return '';
};

var patientKeyToInfo = function (dbinfo, ptKey, callback) {
  var model = dbinfo.models[dbinfo.demographicsSection];
  var query = model.findOne({
    'pat_key': ptKey
  });
  query.exec(function (err, current) {
    if (err) {
      callback(err);
    } else {
      var name = current.data.name;
      var display = nameToDisplay(name);

      var patientInfo = {
        reference: current._id.toString(),
        display: display
      };
      callback(null, patientInfo);
    }
  });
};

exports.idToPatientInfo = function (dbinfo, secName, id, callback) {
  id = jsutil.toObjectId(id);
  if (id === null) {
    callback(null, null);
    return;
  }
  var model = dbinfo.models[secName];
  var query = model.findOne({
    '_id': id
  });
  query.exec(function (err, current) {
    if (!current) {
      callback(null, null);
    } else if (err) {
      callback(err);
    } else {
      patientKeyToInfo(dbinfo, current.pat_key, function (err, patientInfo) {
        if (err) {
          callback(err);
        } else {
          patientInfo.key = current.pat_key;
          callback(null, patientInfo, current.archived);
        }
      });
    }
  });
};

exports.patientKeyToId = function (dbinfo, secName, ptKey, callback) {
  var model = dbinfo.models[secName];
  var query = model.findOne({
    'pat_key': ptKey
  }, function (err, current) {
    if (err) {
      callback(err);
    } else {
      callback(null, current && current._id);
    }
  });

};
