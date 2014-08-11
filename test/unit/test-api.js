"use strict";

var chai = require('chai');
var async = require('async');
var path = require('path');
var fs = require('fs');
var _ = require('underscore');

var bb = require('blue-button');

var bbr = require('../../index');
var modelutil = require('../../lib/modelutil');

var expect = chai.expect;
chai.config.includeStack = true;

describe('API', function () {
    var ccd = null;

    var sourceIds = null;
    var allergyIds = null;
    var allergySeverities = null;
    var allergyNames = null;
    var partialAllergyIds = null;
    var allergyStatuses = null;
    var partialInput = null;
    var matchIds = null;

    before(function (done) {
        var filepath = path.join(__dirname, '../artifacts/standard/CCD_demo1.xml');
        var xml = fs.readFileSync(filepath, 'utf-8');
        var result = bb.parseString(xml);
        ccd = result.data;
        done();
    });

    it('connectDatabase', function (done) {
        bbr.connectDatabase('localhost', function (err) {
            if (err) {
                done(err);
            } else {
                bbr.clearDatabase(done);
            }
        });
    });

    it('saveSource', function (done) {
        var fileInfo = [{
            name: 'ccd_0.xml',
            type: 'text/xml'
        }, {
            name: 'ccd_1.xml',
            type: 'text/xml'
        }, {
            name: 'ccd_2.xml',
            type: 'text/xml'
        }, {
            name: 'ccd_3.xml',
            type: 'text/xml'
        }, {
            name: 'ccd_4.xml',
            type: 'text/xml'
        }, {
            name: 'ccd_5.xml',
            type: 'text/xml'
        }, {
            name: 'ccd_6.xml',
            type: 'text/xml'
        }];
        async.parallel([

                function (cb) {
                    bbr.saveSource('pat0', 'content0', fileInfo[0], 'ccda', cb);
                },
                function (cb) {
                    bbr.saveSource('pat0', 'content1', fileInfo[1], 'ccda', cb);
                },
                function (cb) {
                    bbr.saveSource('pat0', 'content2', fileInfo[2], 'ccda', cb);
                },
                function (cb) {
                    bbr.saveSource('pat1', 'content3', fileInfo[3], 'ccda', cb);
                },
                function (cb) {
                    bbr.saveSource('pat1', 'content4', fileInfo[4], 'ccda', cb);
                },
                function (cb) {
                    bbr.saveSource('pat1', 'content5', fileInfo[5], 'ccda', cb);
                },
                function (cb) {
                    bbr.saveSource('pat1', 'content6', fileInfo[6], 'ccda', cb);
                }
            ],
            function (err, results) {
                if (err) {
                    done(err);
                } else {
                    sourceIds = results.reduce(function (r, result) {
                        var v = result.toString();
                        r.push(v);
                        return r;
                    }, []);
                    expect(sourceIds).to.have.length(7);
                    sourceIds.forEach(function (sourceId) {
                        expect(sourceId).to.exist;
                    });
                    done();
                }
            }
        );
    });

    it('getSourceList', function (done) {
        bbr.getSourceList('pat0', function (err, results) {
            if (err) {
                done(err);
            } else {
                var actual = results.map(function (result) {
                    return result.file_id.toString();
                });
                actual.sort();
                var expected = sourceIds.slice(0, 3);
                expected.sort();
                expect(actual).to.deep.equal(expected);
                done();
            }
        });
    });

    it('getSource', function (done) {
        bbr.getSource('pat0', sourceIds[0], function (err, filename, content) {
            if (err) {
                done(err);
            } else {
                expect(filename).to.equal('ccd_0.xml');
                expect(content).to.equal('content0');
                done();
            }
        });
    });

    it('updateSource', function (done) {
        var updateInfo = {
            'metadata.parsed': new Date(),
            'metadata.archived': new Date()
        };
        bbr.updateSource('pat0', sourceIds[0], updateInfo, function (err) {
            done(err);
        });
    });

    it('sourceCount', function (done) {
        bbr.sourceCount('pat0', function (err, result) {
            if (err) {
                done(err);
            } else {
                expect(result).to.equal(3);
                done();
            }
        });
    });

    it('saveAllSections', function (done) {
        bbr.saveAllSections('pat0', ccd, sourceIds[0], function (err) {
            if (err) {
                done(err);
            } else {
                done();
            }
        });
    });

    it('getAllSections, cleanSection', function (done) {
        bbr.getAllSections('pat0', function (err, allSections) {
            if (err) {
                done(err);
            } else {
                Object.keys(allSections).forEach(function (secName) {
                    var actual = bbr.cleanSection(allSections[secName]);
                    var expected = ccd[secName];
                    if (secName === 'demographics' || secName === 'social_history') {
                        expected = [expected];
                    }
                    expect(actual).to.deep.include.members(expected);
                    expect(expected).to.deep.include.members(actual);
                });
                done();
            }
        });
    });

    it('saveSection', function (done) {
        bbr.saveSection('allergies', 'pat1', ccd.allergies, sourceIds[3], function (err, result) {
            if (err) {
                done(err);
            } else {
                allergyIds = result;
                done();
            }
        });
    });

    it('getSection, cleanSection', function (done) {
        bbr.getSection('allergies', 'pat1', function (err, result) {
            if (err) {
                done(err);
            } else {
                var actual = bbr.cleanSection(result);
                var expected = ccd.allergies;
                expect(actual).to.deep.include.members(expected);
                expect(expected).to.deep.include.members(actual);
                done();
            }
        });
    });

    it('getEntry', function (done) {
        async.map(allergyIds,
            function (id, cb) {
                bbr.getEntry('allergies', 'pat1', id, cb);
            },
            function (err, results) {
                if (err) {
                    done(err);
                } else {
                    var actual = bbr.cleanSection(results);
                    modelutil.mongooseCleanSection(actual);
                    actual.forEach(function (e) {
                        delete e._id;
                    });
                    expect(actual).to.deep.include.members(ccd.allergies);
                    expect(ccd.allergies).to.deep.include.members(actual);
                    allergySeverities = results.map(function (result) {
                        return result.severity;
                    });
                    allergyNames = results.map(function (result) {
                        return result.allergen && result.allergen.name;
                    });
                    allergyStatuses = results.map(function (result) {
                        return result.status;
                    });
                    [allergyNames, allergyStatuses, allergySeverities].forEach(function (arr) {
                        expect(arr).to.not.include(undefined);
                        expect(arr).to.not.include(null);
                    });
                    done();
                }
            }
        );
    });

    it('duplicateEntry', function (done) {
        bbr.duplicateEntry('allergies', 'pat1', allergyIds[0], sourceIds[4], function (err) {
            done(err);
        });
    });

    it('updateEntry', function (done) {
        bbr.updateEntry('allergies', 'pat1', allergyIds[0], sourceIds[5], {
            severity: 'Severe'
        }, function (err) {
            allergySeverities[0] = 'Severe';
            done(err);
        });
    });

    it('getEntry', function (done) {
        bbr.getEntry('allergies', 'pat1', allergyIds[0], function (err, result) {
            expect(result.severity).to.equal('Severe');
            expect(result.allergen && result.allergen.name).to.equal(allergyNames[0]);
            expect(result.metadata).to.exist;
            expect(result.metadata.attribution).to.exist;
            var reasons = result.metadata.attribution.map(function (a) {
                return a.merge_reason;
            });
            var sources = result.metadata.attribution.map(function (a) {
                return a.record._id.toString();
            });
            expect(reasons).to.deep.equal(['new', 'duplicate', 'update']);
            var expectedSources = sourceIds.slice(3, 6);
            expect(sources).to.deep.equal(expectedSources);
            done(err);
        });
    });

    it('getMerges', function (done) {
        bbr.getMerges('allergies', 'pat1', 'allergen.name severity', 'filename', function (err, results) {
            if (err) {
                done(err);
            } else {
                expect(results).to.have.length(5);
                results.forEach(function (result) {
                    expect(allergyNames).to.include(result.entry.allergen.name);
                    expect(allergySeverities).to.include(result.entry.severity);
                    var filename = result.record.filename;
                    if (filename === 'ccd_3.xml') {
                        expect(result.merge_reason).to.equal('new');
                    } else if (filename === 'ccd_4.xml') {
                        expect(result.merge_reason).to.equal('duplicate');
                    } else if (filename === 'ccd_5.xml') {
                        expect(result.merge_reason).to.equal('update');
                    } else { // not expected
                        expect(false).to.be.true;
                    }
                });
                done();
            }
        });
    });

    it('mergeCount', function (done) {
        async.parallel([

                function (cb) {
                    bbr.mergeCount('allergies', 'pat1', {}, cb);
                },
                function (cb) {
                    bbr.mergeCount('allergies', 'pat1', {
                        merge_reason: 'new'
                    }, cb);
                },
                function (cb) {
                    bbr.mergeCount('allergies', 'pat1', {
                        merge_reason: 'duplicate'
                    }, cb);
                },
                function (cb) {
                    bbr.mergeCount('allergies', 'pat1', {
                        merge_reason: 'update'
                    }, cb);
                },
            ],
            function (err, results) {
                if (err) {
                    done(err);
                } else {
                    expect(results[0]).to.equal(5);
                    expect(results[1]).to.equal(3);
                    expect(results[2]).to.equal(1);
                    expect(results[3]).to.equal(1);
                    done();
                }
            }
        );
    });

    it('saveMatches', function (done) {
        var match1 = {
            diff: {
                severity: 'new'
            },
            percent: 80
        };
        var match2 = {
            diff: {
                status: 'new'
            },
            percent: 90
        };
        var allergies1 = _.clone(ccd.allergies[1]);
        expect(allergies1.severity).to.not.equal('Severe');
        allergies1.severity = 'Severe';
        var allergies2 = _.clone(ccd.allergies[2]);
        expect(allergies2.status).to.not.equal('Inactive');
        allergies2.status = 'Inactive';
        partialInput = [{
            partial_entry: allergies1,
            partial_match: match1,
            match_entry_id: allergyIds[1]
        }, {
            partial_entry: allergies2,
            partial_match: match2,
            match_entry_id: allergyIds[2]
        }];
        bbr.saveMatches('allergies', 'pat1', partialInput, sourceIds[6], function (err, result) {
            done(err);
        });
    });

    it('getMatches', function (done) {
        bbr.getMatches('allergies', 'pat1', 'allergen.name severity status', function (err, result) {
            if (err) {
                done(err);
            } else {
                expect(result).to.have.length(2);
                if (result[0].entry.allergen.name !== allergyNames[1]) {
                    var temp = result[0];
                    result[0] = result[1];
                    result[1] = temp;
                }
                partialAllergyIds = [result[0].match_entry._id, result[1].match_entry._id];
                expect(result[0].entry.allergen.name).to.equal(allergyNames[1]);
                expect(result[0].entry.severity).to.equal(allergySeverities[1]);
                expect(result[0].entry.status).to.equal(allergyStatuses[1]);
                expect(result[0].match_entry.allergen.name).to.equal(allergyNames[1]);
                expect(result[0].match_entry.severity).to.equal('Severe');
                expect(result[0].match_entry.status).to.equal(allergyStatuses[1]);

                expect(result[0].diff.severity).to.equal('new');
                expect(result[0].percent).to.equal(80);

                expect(result[1].entry.allergen.name).to.equal(allergyNames[2]);
                expect(result[1].entry.severity).to.equal(allergySeverities[2]);
                expect(result[1].entry.status).to.equal(allergyStatuses[2]);
                expect(result[1].match_entry.allergen.name).to.equal(allergyNames[2]);
                expect(result[1].match_entry.severity).to.equal(allergySeverities[2]);
                expect(result[1].match_entry.status).to.equal('Inactive');

                expect(result[1].diff.status).to.equal('new');
                expect(result[1].percent).to.equal(90);

                matchIds = [result[0]._id, result[1]._id];
                done();
            }
        });
    });

    it('getMatch', function (done) {
        bbr.getMatch('allergies', 'pat1', matchIds[0], function (err, result) {
            if (err) {
                done(err);
            } else {
                expect(result.entry._id.toString()).to.equal(allergyIds[1].toString());
                expect(result.match_entry._id.toString()).to.equal(partialAllergyIds[0].toString());
                expect(result.entry.allergen.name).to.equal(allergyNames[1]);
                expect(result.entry.severity).to.equal(allergySeverities[1]);
                expect(result.entry.status).to.equal(allergyStatuses[1]);
                expect(result.match_entry.allergen.name).to.equal(allergyNames[1]);
                expect(result.match_entry.severity).to.equal('Severe');
                expect(result.match_entry.status).to.equal(allergyStatuses[1]);

                expect(result.diff.severity).to.equal('new');
                expect(result.percent).to.equal(80);

                done();
            }
        });
    });

    it('matchCount', function (done) {
        async.parallel([

                function (cb) {
                    bbr.matchCount('allergies', 'pat1', {}, cb);
                },
                function (cb) {
                    bbr.matchCount('allergies', 'pat1', {
                        percent: 80
                    }, cb);
                },
                function (cb) {
                    bbr.matchCount('allergies', 'pat1', {
                        percent: 90
                    }, cb);
                },
                function (cb) {
                    bbr.matchCount('allergies', 'pat1', {
                        percent: 95
                    }, cb);
                },
            ],
            function (err, results) {
                if (err) {
                    done(err);
                } else {
                    expect(results[0]).to.equal(2);
                    expect(results[1]).to.equal(1);
                    expect(results[2]).to.equal(1);
                    expect(results[3]).to.equal(0);
                    done();
                }
            }
        );
    });

    it('-- verify state', function (done) {
        async.parallel([

                function (cb) {
                    bbr.matchCount('allergies', 'pat1', {}, cb);
                },
                function (cb) {
                    bbr.mergeCount('allergies', 'pat1', {}, cb);
                },
                function (cb) {
                    bbr.getSection('allergies', 'pat1', cb);
                },
                function (cb) {
                    bbr.getMatches('allergies', 'pat1', "", cb);
                },
                function (cb) {
                    bbr.getMatch('allergies', 'pat1', matchIds[0], cb);
                }
            ],
            function (err, results) {
                if (err) {
                    done(err);
                } else {
                    expect(results[0]).to.equal(2);
                    expect(results[1]).to.equal(5);
                    expect(results[2]).to.have.length(3);
                    expect(results[3]).to.have.length(2);
                    expect(results[4].determination).not.to.exist;
                    done();
                }
            }
        );
    });

    it('cancelMatch', function (done) {
        bbr.cancelMatch('allergies', 'pat1', matchIds[0], 'ignored', function (err) {
            done(err);
        });
    });

    it('-- verify state', function (done) {
        async.parallel([

                function (cb) {
                    bbr.matchCount('allergies', 'pat1', {}, cb);
                },
                function (cb) {
                    bbr.mergeCount('allergies', 'pat1', {}, cb);
                },
                function (cb) {
                    bbr.getSection('allergies', 'pat1', cb);
                },
                function (cb) {
                    bbr.getMatches('allergies', 'pat1', "", cb);
                },
                function (cb) {
                    bbr.getMatch('allergies', 'pat1', matchIds[0], cb);
                }
            ],
            function (err, results) {
                if (err) {
                    done(err);
                } else {
                    expect(results[0]).to.equal(1);
                    expect(results[1]).to.equal(5);
                    expect(results[2]).to.have.length(3);
                    expect(results[3]).to.have.length(1);
                    expect(results[4].determination).to.equal('ignored');
                    done();
                }
            }
        );
    });

    it('acceptMatch', function (done) {
        bbr.acceptMatch('allergies', 'pat1', matchIds[1], 'added', function (err) {
            done(err);
        });
    });

    it('-- verify state', function (done) {
        async.parallel([

                function (cb) {
                    bbr.matchCount('allergies', 'pat1', {}, cb);
                },
                function (cb) {
                    bbr.mergeCount('allergies', 'pat1', {}, cb);
                },
                function (cb) {
                    bbr.getSection('allergies', 'pat1', cb);
                },
                function (cb) {
                    bbr.getMatches('allergies', 'pat1', "", cb);
                },
                function (cb) {
                    bbr.getMatch('allergies', 'pat1', matchIds[1], cb);
                }
            ],
            function (err, results) {
                if (err) {
                    done(err);
                } else {
                    expect(results[0]).to.equal(0);
                    expect(results[1]).to.equal(6);
                    expect(results[2]).to.have.length(4);
                    expect(results[3]).to.have.length(0);
                    expect(results[4].determination).to.equal('added');
                    done();
                }
            }
        );
    });

    it('clearDatabase', function (done) {
        bbr.clearDatabase(function (err) {
            done(err);
        });
    });

    after(function (done) {
        bbr.disconnect(function (err) {
            done(err);
        });
    });
});
