'use strict';

var moment = require('moment');

exports.verifyMoment = function (momentBefore, instantAction) {
    var momentAction = moment(instantAction);
    expect(momentAction.isValid()).toBe(true);
    var momentNow = moment();
    expect(momentNow.isBefore(momentAction)).toBe(false);
    expect(momentBefore.isAfter(momentAction)).toBe(false);
};
