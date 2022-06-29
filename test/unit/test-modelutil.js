"use strict";

var modelutil = require('../../lib/modelutil');

describe('modelutil.js', function () {
    it('empty array/inside object/inside object', function (done) {
        var input = [{
            "pat_key": "pat1",
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
        expect(input.precondition).toBeFalsy();
        done();
    });
});
