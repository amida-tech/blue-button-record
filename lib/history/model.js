var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var AccountHistorySchema = new Schema({
    event_type: {
        type: String,
        enum: ['initAccount', 'loggedIn', 'loggedOut', 'fileUploaded', 'fileDownloaded', 'labResults', 'passwordChange', 'infoUpdate'],
        required: true
    },
    userID: String,
    note: String,
    time: {
        type: Date,
        default: Date.now
    },
    fileRef: {
        type: String
    }
});

exports.AccountHistorySchema = AccountHistorySchema;