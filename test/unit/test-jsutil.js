"use strict";

var _ = require('lodash');
var jsutil = require('../../lib/jsutil');

describe('lodash sanity checks', function () {
  it('isEmpty', function (done) {
    expect(_.isEmpty({})).toBeTruthy();
    expect(_.isEmpty({
      x: 1
    })).toBeFalsy();
    expect(_.isEmpty({
      x: false
    })).toBeFalsy();
    expect(_.isEmpty([])).toBeTruthy();
    expect(_.isEmpty([{},
    [], {}
    ])).toBeFalsy();
    expect(_.isEmpty([undefined, undefined, undefined])).toBeFalsy();
    expect(_.isEmpty(['a'])).toBeFalsy();
    expect(_.isEmpty(new Date())).toBeTruthy(); // since date has no enumerable property

    var a = [0, 1, 2];
    for (var i = 0; i < 3; ++i) {
      delete a[i];
    }
    expect(_.isEmpty(a)).toBeFalsy();

    done();
  });

  it('isObject', function (done) {
    expect(_.isObject({})).toBeTruthy();
    expect(_.isObject({
      x: 1
    })).toBeTruthy();
    expect(_.isObject({
      x: false
    })).toBeTruthy();
    expect(_.isObject([])).toBeTruthy();
    expect(_.isObject(['a'])).toBeTruthy();
    expect(_.isObject(new Date())).toBeTruthy();
    expect(_.isObject(1)).toBeFalsy();
    expect(_.isObject('a')).toBeFalsy();
    expect(_.isObject(false)).toBeFalsy();
    done();
  });
});

describe('jest sanity checks', function () {
  it('shufled array deep equal', function () {
    var f = function (r, index) {
      var v = {
        a: index,
        b: {
          c: index + 1
        }
      };
      r.push(v);
      return r;
    };
    var a0 = [0, 1, 2, 3].reduce(f, []);
    var a1 = [2, 0, 1, 3].reduce(f, []);
    expect(a0).toEqual(a1);
    expect(a1).toEqual(a0);
    a0[2].b.c = -1;
    expect(a0).not.toEqual(a1);
    a1[0].b.c = -1;
    expect(a0).toEqual(a1);
  });
});

describe('deep delete named property', function () {
  it('level 1', function (done) {
    var input = {
      rem: true,
      re: true,
      remark: true
    };
    expect(input.rem).toBeDefined();
    expect(input.re).toBe(true);
    expect(input.remark).toBe(true);
    jsutil.deepDelete(input, 'rem');
    expect(input.rem).toBeFalsy();
    expect(input.re).toBe(true);
    expect(input.remark).toBe(true);
    done();
  });

  it('level 2, 3', function (done) {
    var input = {
      rem: true,
      re: {
        rem: true,
        re1: {
          rem: true,
          re2: true
        }
      },
      remark: {
        remark1: true,
        rem: true
      },
      rema: {
        rema10: true,
        rema11: {
          rema2: true,
          rem: true
        }
      }
    };
    expect(input.rem).toBeDefined();
    expect(input.re.rem).toBeDefined();
    expect(input.re.re1.rem).toBeDefined();
    expect(input.re.re1.re2).toBeDefined();
    expect(input.remark.remark1).toBeDefined();
    expect(input.remark.rem).toBeDefined();
    expect(input.rema.rema10).toBeDefined();
    expect(input.rema.rema11.rema2).toBeDefined();
    expect(input.rema.rema11.rem).toBeDefined();
    jsutil.deepDelete(input, 'rem');
    expect(input.rem).toBeFalsy();
    expect(input.re.rem).toBeFalsy();
    expect(input.re.re1.rem).toBeFalsy();
    expect(input.re.re1.re2).toBeDefined();
    expect(input.remark.remark1).toBeDefined();
    expect(input.remark.rem).not.toBeDefined();
    expect(input.rema.rema10).toBeDefined();
    expect(input.rema.rema11.rema2).toBeDefined();
    expect(input.rema.rema11.rem).toBeFalsy();
    done();
  });
});

describe('deep clean empty', function () {
  it('object/objects/arrays', function (done) {
    var input = [{
      "remain": "remain",
      "remove": {
        "key0": {
          "arr": []
        },
        "key1": {
          "arr": []
        }
      }
    }];
    expect(input[0].remove).toBeDefined();
    jsutil.deepDeleteEmpty(input);
    expect(input[0].remove).toBeFalsy();
    expect(input[0].remain).toBeDefined();
    done();
  });

  it('array/objects/arrays', function (done) {
    var input = [{
      "remain": "remain",
      "remove": [{
        "key0": {
          "arr": []
        },
        "key1": {
          "arr": []
        }
      }]
    }];
    expect(input[0].remove).toBeDefined();
    jsutil.deepDeleteEmpty(input);
    expect(input[0].remove).toBeFalsy();
    expect(input[0].remain).toBeDefined();
    done();
  });

  it('array/objects/objects', function (done) {
    var input = [{
      "remain": "remain",
      "remove": [{
        "key0": {
          "obj": {},
        },
        "key1": {
          "obj": {}
        }
      }]
    }];
    expect(input[0].remove).toBeDefined();
    jsutil.deepDeleteEmpty(input);
    expect(input[0].remove).toBeFalsy();
    expect(input[0].remain).toBeDefined();
    done();
  });

  it('array/objects/mixed', function (done) {
    var input = [{
      "remain": "remain",
      "remove": [{
        "key0": {
          "obj": {},
        },
        "key1": {
          "arr": []
        },
        "key2": {
          "arr": [],
          "obj": {}
        }
      }]
    }];
    expect(input[0].remove).toBeDefined();
    jsutil.deepDeleteEmpty(input);
    expect(input[0].remove).toBeFalsy();
    expect(input[0].remain).toBeDefined();
    done();
  });

  it('array/array/mixed partial', function (done) {
    var input = [{
      "remain": "remain",
      "partial": [{
        "obj": {},
      }, {
        "v": true
      }, {
        "arr": [],
        "obj": {}
      }]
    }];
    expect(input[0].partial).toBeDefined();
    jsutil.deepDeleteEmpty(input);
    expect(input[0].partial).toBeDefined();
    expect(input[0].partial).toHaveLength(1);
    expect(input[0].partial[0].v).toBe(true);
    done();
  });
});

describe('movePropUp', function () {
  it('basic', function (done) {
    var data = {
      a: 'a',
      b: {
        string: 'string',
        array: [1, 2, 3, 4]
      },
      c: 'c'
    };

    var obj = {
      x: 'x',
      data: data,
      y: {
        y1: 1,
        y2: 2
      },
      z: 'z'
    };

    jsutil.movePropUp(obj, 'data');

    var expected = {
      x: 'x',
      a: 'a',
      b: {
        string: 'string',
        array: [1, 2, 3, 4]
      },
      c: 'c',
      y: {
        y1: 1,
        y2: 2
      },
      z: 'z'
    };

    expect(obj).toEqual(expected);
    done();
  });
});
