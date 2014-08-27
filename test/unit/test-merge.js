"use strict";

var chai = require('chai');
var util = require('util');
var path = require('path');
var async = require('async');

var db = require('../../lib/db');
var merge = require('../../lib/merge');
var section = require('../../lib/section');
var entry = require('../../lib/entry');
var storage = require('../../lib/storage');
var modelutil = require('../../lib/modelutil');

var refmodel = require('./refmodel');

var expect = chai.expect;
chai.config.includeStack = true;

describe('merge.js methods', function () {
    var context = {};

    refmodel.prepareConnection('mergetest', context)();

    var verifyCount = function (addlMessage, conditions, expected) {
        return function () {
            it('merge.count' + addlMessage, function (done) {
                async.parallel([

                        function (callback) {
                            merge.count(context.dbinfo, 'testallergies', 'pat0', conditions, callback);
                        },
                        function (callback) {
                            merge.count(context.dbinfo, 'testprocedures', 'pat0', conditions, callback);
                        },
                        function (callback) {
                            merge.count(context.dbinfo, 'testallergies', 'pat1', conditions, callback);
                        },
                        function (callback) {
                            merge.count(context.dbinfo, 'testprocedures', 'pat1', conditions, callback);
                        },
                        function (callback) {
                            merge.count(context.dbinfo, 'testallergies', 'pat2', conditions, callback);
                        },
                        function (callback) {
                            merge.count(context.dbinfo, 'testprocedures', 'pat2', conditions, callback);
                        },
                    ],
                    function (err, results) {
                        if (err) {
                            done(err);
                        } else {
                            results.forEach(function (result, index) {
                                expect(result).to.equal(expected[index]);
                            });
                            done();
                        }
                    }
                );
            });
        };
    };

    it('check merge models', function (done) {
        expect(context.dbinfo.mergeModels).to.exist;
        expect(context.dbinfo.mergeModels.testallergies).to.exist;
        expect(context.dbinfo.mergeModels.testprocedures).to.exist;
        done();
    });

    verifyCount(' (empty db)', {}, [0, 0, 0, 0, 0, 0])();
    verifyCount(' (empty db - new)', {
        merge_reason: 'new'
    }, [0, 0, 0, 0, 0, 0])();
    verifyCount(' (empty db - duplicate)', {
        merge_reason: 'duplicate'
    }, [0, 0, 0, 0, 0, 0])();
    verifyCount(' (empty db - update)', {
        merge_reason: 'update'
    }, [0, 0, 0, 0, 0, 0])();

    it('add records', function (done) {
        refmodel.addRecordsPerPatient(context, [3, 5, 1], done);
    });

    it('add sections', function (done) {
        async.parallel([

                function (callback) {
                    refmodel.saveSection(context, 'testallergies', 'pat0', '0.0', 2, callback);
                },
                function (callback) {
                    refmodel.saveSection(context, 'testallergies', 'pat2', '2.0', 3, callback);
                },
                function (callback) {
                    refmodel.saveSection(context, 'testprocedures', 'pat0', '0.0', 2, callback);
                },
                function (callback) {
                    refmodel.saveSection(context, 'testprocedures', 'pat1', '1.0', 3, callback);
                },
            ],
            function (err) {
                done(err);
            }
        );
    });

    verifyCount(' (section only)', {}, [2, 2, 0, 3, 3, 0])();
    verifyCount(' (section only - new)', {
        merge_reason: 'new'
    }, [2, 2, 0, 3, 3, 0])();
    verifyCount(' (section only - duplicate)', {
        merge_reason: 'duplicate'
    }, [0, 0, 0, 0, 0, 0])();
    verifyCount(' (section only - update)', {
        merge_reason: 'update'
    }, [0, 0, 0, 0, 0, 0])();

    it('merge.getAll (field specification)', function (done) {
        async.parallel([

                function (callback) {
                    merge.getAll(context.dbinfo, 'testallergies', 'pat0', 'name severity', 'filename', callback);
                },
                function (callback) {
                    merge.getAll(context.dbinfo, 'testallergies', 'pat1', 'name', 'filename', callback);
                },
                function (callback) {
                    merge.getAll(context.dbinfo, 'testallergies', 'pat2', 'name value.code', 'filename metadata.fileClass', callback);
                },
                function (callback) {
                    merge.getAll(context.dbinfo, 'testprocedures', 'pat0', 'name proc_type', 'filename', callback);
                },
                function (callback) {
                    merge.getAll(context.dbinfo, 'testprocedures', 'pat1', 'name proc_value.display', 'filename', callback);
                },
                function (callback) {
                    merge.getAll(context.dbinfo, 'testprocedures', 'pat2', 'name', 'filename', callback);
                },
            ],
            function (err, results) {
                if (err) {
                    done(err);
                } else {
                    var i;
                    var r0 = results[0];
                    expect(r0).to.have.length(2);
                    expect([r0[0].entry.name, r0[1].entry.name]).to.include.members(['name_0.0.0', 'name_0.0.1']);
                    expect([r0[0].entry.severity, r0[1].entry.severity]).to.include.members(['severity_0.0.0', 'severity_0.0.1']);
                    expect([r0[0].entry.value, r0[1].entry.value]).to.deep.equal([undefined, undefined]);
                    for (i = 0; i < 2; ++i) {
                        expect(r0[i].record.filename).to.equal('c00.xml');
                        expect(r0[i].entry_type).to.equal('testallergies');
                        expect(r0[i].merge_reason).to.equal('new');
                    }

                    expect(results[1]).to.have.length(0);

                    var r2 = results[2];
                    expect(r2).to.have.length(3);
                    expect([r2[0].entry.name, r2[1].entry.name, r2[2].entry.name]).to.include.members(['name_2.0.0', 'name_2.0.1', 'name_2.0.2']);
                    expect([r2[0].entry.value.code, r2[1].entry.value.code, r2[2].entry.value.code]).to.include.members(['code_2.0.0', 'code_2.0.1', 'code_2.0.2']);
                    expect([r2[0].entry.severity, r2[1].entry.severity, r2[2].entry.severity]).to.deep.equal([undefined, undefined, undefined]);
                    for (i = 0; i < 3; ++i) {
                        expect(r2[i].record.filename).to.equal('c20.xml');
                        expect(r2[i].record.metadata.fileClass).to.equal('ccda');
                        expect(r2[i].entry_type).to.equal('testallergies');
                        expect(r2[i].merge_reason).to.equal('new');
                    }

                    var r3 = results[3];
                    expect(r3).to.have.length(2);
                    expect([r3[0].entry.name, r3[1].entry.name]).to.include.members(['name_0.0.0', 'name_0.0.1']);
                    expect([r3[0].entry.proc_type, r3[1].entry.proc_type]).to.include.members(['proc_type_0.0.0', 'proc_type_0.0.1']);
                    for (i = 0; i < 2; ++i) {
                        expect(r3[i].record.filename).to.equal('c00.xml');
                        expect(r3[i].entry_type).to.equal('testprocedures');
                        expect(r3[i].merge_reason).to.equal('new');
                    }

                    var r4 = results[4];
                    expect(r4).to.have.length(3);
                    expect([r4[0].entry.name, r4[1].entry.name, r4[2].entry.name]).to.include.members(['name_1.0.0', 'name_1.0.1', 'name_1.0.2']);
                    expect([r4[0].entry.proc_value.display, r4[1].entry.proc_value.display, r4[2].entry.proc_value.display]).to.include.members(['display_1.0.0', 'display_1.0.1', 'display_1.0.2']);
                    for (i = 0; i < 3; ++i) {
                        expect(r4[i].record.filename).to.equal('c10.xml');
                        expect(r4[i].entry_type).to.equal('testprocedures');
                        expect(r4[i].merge_reason).to.equal('new');
                    }

                    expect(results[5]).to.have.length(0);

                    done();
                }
            }
        );
    });

    var verifyGetAll = function (context, resultsById, secName, recordIndex, index, sourceIndex) {
        var key = refmodel.newEntriesContextKey(secName, recordIndex);
        var id = context[key][index];
        var result = resultsById[id];
        if (!sourceIndex) {
            sourceIndex = recordIndex;
        }
        expect(result).to.exist;
        expect(result.record._id.toString()).to.equal(context.storageIds[sourceIndex].toString());
    };

    var verifyGetAllNegative = function (context, resultsById, secName, recordIndex, index) {
        var key = refmodel.newEntriesContextKey(secName, recordIndex);
        var id = context[key][index];
        var result = resultsById[id];

        expect(result).to.not.exist;
    };

    var callGetAll = function (callback) {
        async.parallel([

                function (callback) {
                    merge.getAll(context.dbinfo, 'testallergies', 'pat0', '_id', '_id', callback);
                },
                function (callback) {
                    merge.getAll(context.dbinfo, 'testallergies', 'pat1', '_id', '_id', callback);
                },
                function (callback) {
                    merge.getAll(context.dbinfo, 'testallergies', 'pat2', '_id', '_id', callback);
                },
                function (callback) {
                    merge.getAll(context.dbinfo, 'testprocedures', 'pat0', '_id', '_id', callback);
                },
                function (callback) {
                    merge.getAll(context.dbinfo, 'testprocedures', 'pat1', '_id', '_id', callback);
                },
                function (callback) {
                    merge.getAll(context.dbinfo, 'testprocedures', 'pat2', '_id', '_id', callback);
                },
            ],
            function (err, results) {
                if (err) {
                    callback(err);
                } else {
                    var allResults = results[0].concat(results[1]).concat(results[2]).concat(results[3]).concat(results[4]).concat(results[5]);
                    var resultsById = allResults.reduce(function (r, result) {
                        var mr = result.merge_reason;
                        r[mr][result.entry._id] = result;
                        return r;
                    }, {
                        new: {},
                        duplicate: {},
                        update: {}
                    });
                    callback(null, resultsById);
                }
            }
        );
    };

    it('merge.getAll (section only)', function (done) {
        callGetAll(function (err, resultsById) {
            if (err) {
                done(err);
            } else {
                verifyGetAll(context, resultsById.new, 'testallergies', '0.0', 0);
                verifyGetAllNegative(context, resultsById.duplicate, 'testallergies', '0.0', 0);
                verifyGetAll(context, resultsById.new, 'testallergies', '0.0', 1);
                verifyGetAllNegative(context, resultsById.duplicate, 'testallergies', '0.0', 1);
                verifyGetAll(context, resultsById.new, 'testallergies', '2.0', 0);
                verifyGetAll(context, resultsById.new, 'testallergies', '2.0', 1);
                verifyGetAll(context, resultsById.new, 'testallergies', '2.0', 2);
                verifyGetAll(context, resultsById.new, 'testprocedures', '0.0', 0);
                verifyGetAll(context, resultsById.new, 'testprocedures', '0.0', 1);
                verifyGetAll(context, resultsById.new, 'testprocedures', '1.0', 0);
                verifyGetAll(context, resultsById.new, 'testprocedures', '1.0', 1);
                verifyGetAll(context, resultsById.new, 'testprocedures', '1.0', 2);
                verifyGetAllNegative(context, resultsById.new, 'testprocedures', '1.0', 3);
                done();
            }
        });
    });

    var duplicateEntry = function (context, secName, ptKey, recordIndex, index, callback) {
        var key = refmodel.newEntriesContextKey(secName, recordIndex);
        var id = context[key][index];
        var rid = context.storageIds[recordIndex];
        entry.duplicate(context.dbinfo, secName, ptKey, id, rid, callback);
    };

    it('entry.duplicate (wrong patient)', function (done) {
        duplicateEntry(context, 'testallergies', 'wrongpatient', '0.0', 1, function (err) {
            expect(err).to.exist;
            done();
        });
    });

    it('entry.duplicate', function (done) {
        async.parallel([

                function (callback) {
                    duplicateEntry(context, 'testallergies', 'pat0', '0.0', 1, callback);
                },
                function (callback) {
                    duplicateEntry(context, 'testprocedures', 'pat1', '1.0', 0, callback);
                },
            ],
            function (err) {
                done(err);
            }
        );
    });

    verifyCount(' (with entry.duplicate)', {}, [3, 2, 0, 4, 3, 0])();
    verifyCount(' (with entry.duplicate - new)', {
        merge_reason: 'new'
    }, [2, 2, 0, 3, 3, 0])();
    verifyCount(' (with entry.duplicate - duplicate)', {
        merge_reason: 'duplicate'
    }, [1, 0, 0, 1, 0, 0])();
    verifyCount(' (with entry.duplicate - update)', {
        merge_reason: 'update'
    }, [0, 0, 0, 0, 0, 0])();

    var verifyWithDuplicate = function (addlMessage) {
        return function () {
            it('merge.getAll' + addlMessage, function (done) {
                callGetAll(function (err, resultsById) {
                    if (err) {
                        done(err);
                    } else {
                        verifyGetAll(context, resultsById.new, 'testallergies', '0.0', 0);
                        verifyGetAllNegative(context, resultsById.duplicate, 'testallergies', '0.0', 0);
                        verifyGetAll(context, resultsById.new, 'testallergies', '0.0', 1);
                        verifyGetAll(context, resultsById.duplicate, 'testallergies', '0.0', 1);
                        verifyGetAll(context, resultsById.new, 'testallergies', '2.0', 0);
                        verifyGetAll(context, resultsById.new, 'testallergies', '2.0', 1);
                        verifyGetAll(context, resultsById.new, 'testallergies', '2.0', 2);
                        verifyGetAll(context, resultsById.new, 'testprocedures', '0.0', 0);
                        verifyGetAll(context, resultsById.new, 'testprocedures', '0.0', 1);
                        verifyGetAll(context, resultsById.new, 'testprocedures', '1.0', 0);
                        verifyGetAll(context, resultsById.duplicate, 'testprocedures', '1.0', 0);
                        verifyGetAll(context, resultsById.new, 'testprocedures', '1.0', 1);
                        verifyGetAll(context, resultsById.new, 'testprocedures', '1.0', 2);
                        verifyGetAllNegative(context, resultsById.new, 'testprocedures', '1.0', 3);
                        done();
                    }
                });
            });
        };
    };

    verifyWithDuplicate(' (with entry.duplicate)')();

    it('add partial sections', function (done) {
        var matchInfo0 = refmodel.createMatchInformation('0.1', [0], ['diff']);
        var matchInfo1 = refmodel.createMatchInformation('0.1', [1], ['diff']);
        var matchInfo2 = refmodel.createMatchInformation('1.1', [1], ['partial']);
        var matchInfo3 = refmodel.createMatchInformation('1.2', [2], ['partial']);

        async.parallel([

                function (callback) {
                    refmodel.saveMatches(context, 'testallergies', 'pat0', '0.1', '0.0', matchInfo0, callback);
                },
                function (callback) {
                    refmodel.saveMatches(context, 'testprocedures', 'pat0', '0.1', '0.0', matchInfo1, callback);
                },
                function (callback) {
                    refmodel.saveMatches(context, 'testprocedures', 'pat1', '1.1', '1.0', matchInfo2, callback);
                },
                function (callback) {
                    refmodel.saveMatches(context, 'testprocedures', 'pat1', '1.2', '1.0', matchInfo3, callback);
                },
            ],
            function (err) {
                done(err);
            }
        );
    });

    verifyCount(' (after partial)', {}, [3, 2, 0, 4, 3, 0])();
    verifyCount(' (after partial - new)', {
        merge_reason: 'new'
    }, [2, 2, 0, 3, 3, 0])();
    verifyCount(' (after partial - duplicate)', {
        merge_reason: 'duplicate'
    }, [1, 0, 0, 1, 0, 0])();
    verifyCount(' (after partial - update)', {
        merge_reason: 'update'
    }, [0, 0, 0, 0, 0, 0])();

    verifyWithDuplicate(' (after partial)')();

    it('cancel some partials', function (done) {
        async.parallel([

                function (callback) {
                    refmodel.cancelMatch(context, 'testallergies', 'pat0', '0.1', 0, callback);
                },
                function (callback) {
                    refmodel.cancelMatch(context, 'testprocedures', 'pat1', '1.1', 0, callback);
                }
            ],
            function (err) {
                done(err);
            }
        );
    });

    verifyCount(' (after cancel)', {}, [3, 2, 0, 4, 3, 0])();
    verifyCount(' (after cancel - new)', {
        merge_reason: 'new'
    }, [2, 2, 0, 3, 3, 0])();
    verifyCount(' (after cancel - duplicate)', {
        merge_reason: 'duplicate'
    }, [1, 0, 0, 1, 0, 0])();
    verifyCount(' (after cancel - update)', {
        merge_reason: 'update'
    }, [0, 0, 0, 0, 0, 0])();

    verifyWithDuplicate(' (after cancel)')();

    it('accept some partials', function (done) {
        async.parallel([

                function (callback) {
                    refmodel.acceptMatch(context, 'testprocedures', 'pat0', '0.1', 0, callback);
                },
                function (callback) {
                    refmodel.acceptMatch(context, 'testprocedures', 'pat1', '1.2', 0, callback);
                }
            ],
            function (err) {
                done(err);
            }
        );
    });

    verifyCount(' (after accept)', {}, [3, 3, 0, 5, 3, 0])();
    verifyCount(' (after accept - new)', {
        merge_reason: 'new'
    }, [2, 3, 0, 4, 3, 0])();
    verifyCount(' (after accept - duplicate)', {
        merge_reason: 'duplicate'
    }, [1, 0, 0, 1, 0, 0])();
    verifyCount(' (after accept - update)', {
        merge_reason: 'update'
    }, [0, 0, 0, 0, 0, 0])();

    var verifyGetAllPartial = function (context, resultsById, secName, recordIndex, index, sourceIndex) {
        var key = refmodel.partialEntriesContextKey(secName, recordIndex);

        var id = context[key][index].entry;

        var result = resultsById[id];
        if (!sourceIndex) {
            sourceIndex = recordIndex;
        }

        expect(result).to.exist;
        expect(result.record._id.toString()).to.equal(context.storageIds[sourceIndex].toString());
    };

    var verifyGetAllPartialNegative = function (context, resultsById, secName, recordIndex, index) {
        var key = refmodel.partialEntriesContextKey(secName, recordIndex);
        var id = context[key][index].entry;
        var result = resultsById[id];

        expect(result).to.not.exist;
    };

    it('merge.getAll (after accept)', function (done) {
        callGetAll(function (err, resultsById) {
            if (err) {
                done(err);
            } else {

                verifyGetAll(context, resultsById.new, 'testallergies', '0.0', 0);
                verifyGetAllNegative(context, resultsById.duplicate, 'testallergies', '0.0', 0);
                verifyGetAllNegative(context, resultsById.update, 'testallergies', '0.0', 0);
                verifyGetAll(context, resultsById.new, 'testallergies', '0.0', 1);
                verifyGetAll(context, resultsById.duplicate, 'testallergies', '0.0', 1);
                verifyGetAll(context, resultsById.new, 'testallergies', '2.0', 0);
                verifyGetAll(context, resultsById.new, 'testallergies', '2.0', 1);
                verifyGetAll(context, resultsById.new, 'testallergies', '2.0', 2);
                verifyGetAll(context, resultsById.new, 'testprocedures', '0.0', 0);
                verifyGetAll(context, resultsById.new, 'testprocedures', '0.0', 1);
                verifyGetAll(context, resultsById.new, 'testprocedures', '1.0', 0);
                verifyGetAll(context, resultsById.duplicate, 'testprocedures', '1.0', 0);
                verifyGetAllNegative(context, resultsById.update, 'testprocedures', '1.0', 0);
                verifyGetAll(context, resultsById.new, 'testprocedures', '1.0', 1);
                verifyGetAll(context, resultsById.new, 'testprocedures', '1.0', 2);
                verifyGetAllNegative(context, resultsById.new, 'testprocedures', '1.0', 3);
                verifyGetAllPartialNegative(context, resultsById.new, 'testallergies', '0.1', 0);
                verifyGetAllPartialNegative(context, resultsById.new, 'testprocedures', '1.1', 0);
                verifyGetAllPartial(context, resultsById.new, 'testprocedures', '0.1', 0);
                verifyGetAllPartial(context, resultsById.new, 'testprocedures', '1.2', 0);
                verifyGetAllPartialNegative(context, resultsById.update, 'testprocedures', '1.2', 0);
                done();
            }
        });
    });

    var updateEntry = function (context, secName, ptKey, recordIndex, index, updateObject, sourceIndex, callback) {
        
        var key = refmodel.newEntriesContextKey(secName, recordIndex);

        var id = context[key][index];
        var rid = context.storageIds[sourceIndex];
        entry.update(context.dbinfo, secName, ptKey, id, rid, updateObject, callback);
    };

    var updateEntryPartial = function (context, secName, ptKey, recordIndex, index, updateObject, sourceIndex, callback) {
        var key = refmodel.partialEntriesContextKey(secName, recordIndex);
        var id = context[key][index].entry;
        var rid = context.storageIds[sourceIndex];
        entry.update(context.dbinfo, secName, ptKey, id, rid, updateObject, callback);
    };

    it('entry.dupdate (wrong patient)', function (done) {
        var updObj0 = {
            name: "name_upd_0.2.0"
        };
        updateEntry(context, 'testallergies', 'wrongpatient', '0.0', 0, updObj0, '0.2', function (err) {
            expect(err).to.exist;
            done();
        });
    });

    it('entry.update', function (done) {
        var updObj0 = {
            name: "name_upd_0.2.0"
        };
        var updObj1 = {
            name: "name_upd_1.3.0"
        };
        var updObj2 = {
            name: "name_upd_1.4.0"
        };
        async.parallel([

                function (callback) {
                    updateEntry(context, 'testallergies', 'pat0', '0.0', 0, updObj0, '0.2', callback);
                },
                function (callback) {
                    updateEntry(context, 'testprocedures', 'pat1', '1.0', 0, updObj1, '1.3', callback);
                },
                function (callback) {
                    updateEntryPartial(context, 'testprocedures', 'pat1', '1.2', 0, updObj2, '1.4', callback);
                }
            ],
            function (err) {
                done(err);
            }
        );
    });

    verifyCount(' (after entry.update)', {}, [4, 3, 0, 7, 3, 0])();
    verifyCount(' (after entry.update - new)', {
        merge_reason: 'new'
    }, [2, 3, 0, 4, 3, 0])();
    verifyCount(' (after entry.update - duplicate)', {
        merge_reason: 'duplicate'
    }, [1, 0, 0, 1, 0, 0])();
    verifyCount(' (after entry.update - update)', {
        merge_reason: 'update'
    }, [1, 0, 0, 2, 0, 0])();

    it('merge.getAll (after entry.update)', function (done) {
        callGetAll(function (err, resultsById) {
            if (err) {
                done(err);
            } else {

                verifyGetAll(context, resultsById.new, 'testallergies', '0.0', 0);
                verifyGetAllNegative(context, resultsById.duplicate, 'testallergies', '0.0', 0);
                verifyGetAll(context, resultsById.update, 'testallergies', '0.0', 0, '0.2');
                verifyGetAll(context, resultsById.new, 'testallergies', '0.0', 1);
                verifyGetAll(context, resultsById.duplicate, 'testallergies', '0.0', 1);
                verifyGetAll(context, resultsById.new, 'testallergies', '2.0', 0);
                verifyGetAll(context, resultsById.new, 'testallergies', '2.0', 1);
                verifyGetAll(context, resultsById.new, 'testallergies', '2.0', 2);
                verifyGetAll(context, resultsById.new, 'testprocedures', '0.0', 0);
                verifyGetAll(context, resultsById.new, 'testprocedures', '0.0', 1);
                verifyGetAll(context, resultsById.new, 'testprocedures', '1.0', 0);
                verifyGetAll(context, resultsById.duplicate, 'testprocedures', '1.0', 0);
                verifyGetAll(context, resultsById.update, 'testprocedures', '1.0', 0, '1.3');
                verifyGetAll(context, resultsById.new, 'testprocedures', '1.0', 1);
                verifyGetAll(context, resultsById.new, 'testprocedures', '1.0', 2);
                verifyGetAllNegative(context, resultsById.new, 'testprocedures', '1.0', 3);
                verifyGetAllPartialNegative(context, resultsById.new, 'testallergies', '0.1', 0);
                verifyGetAllPartialNegative(context, resultsById.new, 'testprocedures', '1.1', 0);
                verifyGetAllPartial(context, resultsById.new, 'testprocedures', '0.1', 0);
                verifyGetAllPartial(context, resultsById.new, 'testprocedures', '1.2', 0);
                verifyGetAllPartial(context, resultsById.update, 'testprocedures', '1.2', 0, '1.4');
                done();
            }
        });
    });

    var getEntry = function (context, secName, ptKey, recordIndex, index, callback) {
        var key = refmodel.newEntriesContextKey(secName, recordIndex);
        var id = context[key][index];
        entry.get(context.dbinfo, secName, ptKey, id, callback);
    };

    var getEntryPartial = function (context, secName, ptKey, recordIndex, index, callback) {
        var key = refmodel.partialEntriesContextKey(secName, recordIndex);
        var id = context[key][index].entry;
        entry.get(context.dbinfo, secName, ptKey, id, callback);
    };

    var verifyEntryGet = function (context, result, secName, recordIndex, index, sourceIndex) {
        var key = refmodel.newEntriesContextKey(secName, recordIndex);
        var id = context[key][index];
        if (!sourceIndex) {
            sourceIndex = recordIndex;
        }
        expect(result.record._id.toString()).to.equal(context.storageIds[sourceIndex].toString());
    };

    var verifyEntryGetPartial = function (context, result, secName, recordIndex, index, sourceIndex) {
        var key = refmodel.partialEntriesContextKey(secName, recordIndex);
        var id = context[key][index].match_entry;
        if (!sourceIndex) {
            sourceIndex = recordIndex;
        }
        expect(result.record._id.toString()).to.equal(context.storageIds[sourceIndex].toString());
    };

    var verifyMergeReason = function (attr, expectedReasons) {
        expect(attr).to.exist;
        expect(attr).to.have.length(expectedReasons.length);
        var reasons = attr.reduce(function (r, e) {
            r.push(e.merge_reason);
            return r;
        }, []);
        expect(reasons).to.deep.equal(expectedReasons);
    };

    var verifyEntryGetContent = function (context, result, secName, recordIndex, index, updRecordIndex, updIndex) {
        expect(result).to.exist;
        var r = modelutil.mongooseToBBModelDocument(result);

        var suffix = '_' + recordIndex + '.' + index;
        var expected = refmodel.testObjectInstance[secName](suffix);
        if (updRecordIndex && updIndex !== null) {
            var updSuffix = '_upd_' + updRecordIndex + '.' + updIndex;
            expected.name = 'name' + updSuffix;
        }

        expect(r).to.deep.equal(expected);
    };

    it('entry.get (wrong patient)', function (done) {
        getEntry(context, 'testallergies', 'wrongpatient', '0.0', 0, function (err) {
            expect(err).to.exist;
            done();
        });
    });

    it('entry.get', function (done) {
        async.parallel([

                function (callback) {
                    getEntry(context, 'testallergies', 'pat0', '0.0', 0, callback);
                },
                function (callback) {
                    getEntry(context, 'testprocedures', 'pat1', '1.0', 0, callback);
                },
                function (callback) {
                    getEntryPartial(context, 'testprocedures', 'pat1', '1.2', 0, callback);
                }
            ],
            function (err, results) {
                if (err) {
                    done(err);
                } else {
                    var result0 = results[0];
                    verifyEntryGetContent(context, results[0], 'testallergies', '0.0', 0, '0.2', 0);
                    expect(result0.metadata).to.exist;
                    var attr0 = result0.metadata.attribution;
                    verifyMergeReason(attr0, ['new', 'update']);
                    verifyEntryGet(context, attr0[0], 'testallergies', '0.0', 0);
                    verifyEntryGet(context, attr0[1], 'testallergies', '0.0', 0, '0.2');

                    var result1 = results[1];
                    verifyEntryGetContent(context, results[1], 'testprocedures', '1.0', 0, '1.3', 0);
                    expect(result1.metadata).to.exist;
                    var attr1 = result1.metadata.attribution;
                    verifyMergeReason(attr1, ['new', 'duplicate', 'update']);
                    verifyEntryGet(context, attr1[0], 'testprocedures', '1.0', 0);
                    verifyEntryGet(context, attr1[1], 'testprocedures', '1.0', 0);
                    verifyEntryGet(context, attr1[2], 'testprocedures', '1.0', 0, '1.3');

                    var result2 = results[2];
                    verifyEntryGetContent(context, results[2], 'testprocedures', '1.2', 0, '1.4', 0);
                    expect(result2.metadata).to.exist;
                    var attr2 = result2.metadata.attribution;
                    verifyMergeReason(attr2, ['new', 'update']);
                    verifyEntryGetPartial(context, attr2[0], 'testprocedures', '1.2', 0);
                    verifyEntryGetPartial(context, attr2[1], 'testprocedures', '1.2', 0, '1.4');

                    done();
                }
            }
        );
    });

    after(function (done) {
        context.dbinfo.db.dropDatabase(function (err) {
            if (err) {
                done(err);
            } else {
                context.dbinfo.connection.close(function (err) {
                    done(err);
                });
            }
        });
    });
});
