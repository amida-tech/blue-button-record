"use strict";

var chai = require('chai');

var modelutil = require('../../lib/modelutil');

var expect = chai.expect;

describe('modelutil.js', function() {
    it('empty array/inside object/inside object', function(done) {
        var input = [{
            "patKey": "pat1",
            "precondition": {
                "value": {
                    "translations": []
                },
                "code": {
                    "translations": []
                }
            }
        }];
        modelutil.mongooseCleanSection(input);
        expect(input.precondition).to.not.exist;
        done();
    });
});

