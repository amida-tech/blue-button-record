"use strict";

describe('Usage Documentation Examples', function () {
    var bb;
    var bbr;

    it('script 1', function (done) {
        bb = require("blue-button");
        bbr = require("../../index");
        done();
    });

    it('script 2', function (done) {
        bbr.connectDatabase('localhost', function (err) {
            if (err) {
                throw err;
            }
            done();
        });
    });

    var ccdJSON;
    var xmlString;

    it('script 3', function (done) {
        var fs = require('fs');
        var path = require('path');
        var filepath = path.join(__dirname, '../artifacts/standard/CCD_demo1.xml');
        xmlString = fs.readFileSync(filepath, 'utf-8');
        var result = bb.parseString(xmlString);
        ccdJSON = result.data;
        done();
    });

    var fileId;

    it('script 4', function (done) {
        var fileInfo = {
            name: 'CCD_demo1.xml',
            type: 'text/xml'
        };
        bbr.saveSource('patientKey', xmlString, fileInfo, 'ccda', function (err, id) {
            fileId = id;
            done();
        });
    });

    it('script 4 (b)', function (done) {
        var updateInfo = {
            'metadata.parsed': new Date(),
            'metadata.archived': new Date()
        };
        bbr.updateSource('patientKey', fileId, updateInfo, function (err) {
            if (err) {
                throw err;
            }
            done();
        });
    });

    it('script 5 (a)', function (done) {
        bbr.getSourceList('patientKey', function (err, results) {
            ////console.log(results.length);
            done();
        });
    });

    it('script 5 (b)', function (done) {
        bbr.getSource('patientKey', fileId, function (err, filename, content) {
            //console.log(filename);
            done();
        });
    });

    it('script 5 (c)', function (done) {
        bbr.sourceCount('patientKey', function (err, count) {
            //console.log(count);
            done();
        });
    });

    it('script 6', function (done) {
        bbr.saveAllSections('patientKey', ccdJSON, fileId, function (err) {
            if (err) {
                throw err;
            }
            done();
        });
    });

    it('script 7', function (done) {
        bbr.saveSection('allergies', 'patientKey', ccdJSON.allergies, fileId, function (err) {
            if (err) {
                throw err;
            }
            done();
        });
    });

    it('script 8', function (done) {
        bbr.getAllSections('patientKey', function (err, result) {
            //console.log(result.allergies[0].observation.allergen.name);
            //console.log(result.procedures[0].procedure.name);
            done();
        });
    });

    var id;
    var allergies;

    it('script 9', function (done) {
        bbr.getSection('allergies', 'patientKey', function (err, result) {
            //console.log(result[0].observation.allergen.name);
            id = result[0]._id;
            allergies = result;
            done();
        });
    });

    it('script 10 (a)', function (done) {
        bbr.updateEntry('allergies', 'patientKey', id, fileId, {
            severity: 'Severe'
        }, function (err) {
            if (err) {
                throw err;
            }
            done();
        });
    });

    var allergy;

    it('script 10 (b)', function (done) {
        bbr.getEntry('allergies', 'patientKey', id, function (err, result) {
            //console.log(result.severity);
            allergy = result;
            done();
        });
    });

    it('script 11', function (done) {
        var allergiesBBOnly = bbr.cleanSection(allergies);
        //console.log(allergiesBBOnly[0]._id);
        //console.log(allergiesBBOnly[0].observation.allergen.name);
        done();
    });

    it('script 12', function (done) {
        bbr.duplicateEntry('allergies', 'patientKey', id, fileId, function (err) {
            if (err) {
                throw err;
            }
            done();
        });
    });

    it('script 13', function (done) {
        bbr.getEntry('allergies', 'patientKey', id, function (err, entry) {
            var attribution = entry.metadata.attribution;
            //console.log(attribution[0].merge_reason); // 'new'
            //console.log(attribution[0].record.filename);
            //console.log(attribution[1].merge_reason); // 'update'
            //console.log(attribution[1].record.filename);
            //console.log(attribution[2].merge_reason); // 'duplicate'
            //console.log(attribution[2].record.filename);
            done();
        });
    });

    it('script 14', function (done) {
        bbr.getMerges('allergies', 'patientKey', 'observation.allergen.name observation.severity.code.name', 'filename uploadDate', function (err, mergeList) {
            var explMerge = mergeList[0];
            //console.log(explMerge.merge_reason);
            //console.log(explMerge.entry.observation.allergen.name);
            //console.log(explMerge.entry.observation.severity.code.name);
            //console.log(explMerge.record.filename);
            //console.log(explMerge.record.uploadDate);
            done();
        });
    });

    it('script 15 (a)', function (done) {
        bbr.mergeCount('allergies', 'patientKey', {}, function (err, count) {
            //console.log(count);
            done();
        });
    });

    it('script 15 (b)', function (done) {
        bbr.mergeCount('allergies', 'patientKey', {
            merge_reason: 'new'
        }, function (err, count) {
            //console.log(count);
            done();
        });
    });

    it('script 15 (c)', function (done) {
        bbr.mergeCount('allergies', 'patientKey', {
            merge_reason: 'duplicate'
        }, function (err, count) {
            //console.log(count);
            done();
        });
    });

    var partialAllergy;

    it('script 16', function (done) {
        partialAllergy = {
            partial_entry: ccdJSON.allergies[0],
            partial_matches: [{
                match_entry: id,
                match_object: {
                    diff: {
                        severity: 'new'
                    },
                    percent: 80,
                    subelements: []
                }
            }]
        };
        done();
    });

    //console.log(partialAllergy);

    it('script 17', function (done) {
        // for simplicity use the same here, these would be different in reality
        var partialAllergies = [partialAllergy, partialAllergy];

        bbr.saveMatches('allergies', 'patientKey', partialAllergies, fileId, function (err) {
            if (err) {
                throw err;
            }
            done();
        });
    });

    var matchId0;
    var matchId1;

    it('script 19', function (done) {
        bbr.getMatches('allergies', 'patientKey', 'observation.allergen.name observation.severity.code.name', function (err, result) {
            //console.log(result[0].matches[0].match_entry.observation.allergen.name);
            //console.log(result[0].matches[0].match_entry.observation.severity.code.name);
            //console.log(result[0].entry.observation.allergen.name);
            //console.log(result[0].entry.observation.severity.code.name);
            //console.log(result[0].matches[0].match_object.diff.severity);
            //console.log(result[0].matches[0].match_object.percent);
            matchId0 = result[0]._id;
            matchId1 = result[1]._id;
            done();
        });
    });

    it('script 20', function (done) {
        bbr.getMatch('allergies', 'patientKey', matchId0, function (err, result) {
            //console.log(result.matches[0].match_entry.observation.allergen.name);
            //console.log(result.matches[0].match_entry.observation.status.name);
            //console.log(result.matches[0].match_entry.observation.allergen.name);
            //console.log(result.matches[0].match_entry.observation.status.name);
            //console.log(result.matches[0].match_object.diff.severity);
            //console.log(result.matches[0].match_object.percent);
            done();
        });
    });

    it('script 21 (a)', function (done) {
        bbr.matchCount('allergies', 'patientKey', {}, function (err, count) {
            //console.log(count);
            done();
        });
    });

    it('script 21 (b)', function (done) {
        bbr.matchCount('allergies', 'patientKey', {
            percent: 90
        }, function (err, count) {
            //console.log(count);
            done();
        });
    });

    it('script 22 (a)', function (done) {
        bbr.cancelMatch('allergies', 'patientKey', matchId0, 'ignored', function (err) {
            if (err) {
                throw err;
            }
            done();
        });
    });

    it('script 22 (b)', function (done) {
        bbr.cancelMatch('allergies', 'patientKey', matchId0, 'merged', function (err) {
            if (err) {
                throw err;
            }
            done();
        });
    });

    it('script 23', function (done) {
        bbr.acceptMatch('allergies', 'patientKey', matchId1, 'added', function (err) {
            if (err) {
                throw err;
            }
            done();
        });
    });

    it('script 24', function (done) {
        bbr.disconnect(function (err) {
            if (err) {
                throw err;
            }
            done();
        });
    });
});
