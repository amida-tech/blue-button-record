'use strict';

var moment = require('moment');
var chai = require('chai');

var expect = chai.expect;

exports.verifyMoment = function (momentBefore, instantAction) {
    var momentAction = moment(instantAction);
    expect(momentAction.isValid()).to.equal(true);
    var momentNow = moment();
    expect(momentNow.isBefore(momentAction)).to.equal(false);
    expect(momentBefore.isAfter(momentAction)).to.equal(false);
};
