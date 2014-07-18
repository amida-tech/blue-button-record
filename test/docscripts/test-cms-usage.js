"use strict";
//same set of tests for cms text file
describe('Usage Documentation Examples' , function() {
    var bb;
    var bbr;

    it('script 1 - require bb and bbr', function(done) {
        bb = require("blue-button");
        bbr = require("../../index");
        done();
    });

    it('script 2 - connect to db ', function(done) {
        bbr.connectDatabase('localhost', function(err) {
            if (err) {throw err;}
            done();
        });
    });

    var cmsJSON;
    var cmsString;

    it('script 3 - parse cms sample', function(done) {
        var fs = require('fs');
        var path = require('path');
        var filepath  = path.join(__dirname, '../artifacts/standard/cms_sample.txt');
        cmsString = fs.readFileSync(filepath, 'utf-8');
        var result = bb.parseText(cmsString);
        cmsJSON = result.data;
        done();
    });

    var fileId;

    it('script 4- save cms sample', function(done) {
        var fileInfo = {
            name: 'cms_sample.txt',
            type: 'text/plain'
        };
        bbr.saveSource('patientKey', cmsString, fileInfo, 'cms', function(err, id) {
            fileId = id;
            done();
        });
    });

    it('script 5 (a) - get record list', function(done) {
        bbr.getSourceList('patientKey', function(err, results) {
            console.log(results.length);
            done();
        });
    });

    it('script 5 (b) - getSource', function(done) {
        bbr.getSource('patientKey', fileId, function(err, filename, content) {
            console.log(filename);
            done();
        });
    });

    it('script 5 (c) - count the number of records', function(done) {
        bbr.sourceCount('patientKey', function(err, count) {
            console.log(count);
            done();
        });
    });

    it('script 6 - save all sections', function(done) {
        bbr.saveAllSections('patientKey', cmsJSON, fileId, function(err) {
            if (err) {throw err;}
            done();
        });
    });

    it('script 7 - save one section(allergies)', function(done) {
        bbr.saveSection('allergies', 'patientKey', cmsJSON.allergies, fileId, function(err) {
            if (err) {throw err;}
            done();
        });
    });

    it('script 8 - get all sections ', function(done) {
        bbr.getAllSections('patientKey',function(err, result) {
            done();
        });
    });

    var id;
    var allergies;

    it('script 9 - get section, allergies', function(done) {
        bbr.getSection('allergies', 'patientKey', function(err, result) {
            console.log(result[0].allergen.name);
            id = result[0]._id;
            allergies = result;
            done();
        });
    });

    it('script 10 (a) - update an entry', function(done) {
        bbr.updateEntry('allergies', 'patientKey', id, fileId, {severity: 'Severe'}, function(err) {
            if (err) {throw err;}
            done();
        });
    });

    var allergy;

    it('script 10 (b) - get entry', function(done) {
        bbr.getEntry('allergies', 'patientKey', id, function(err, result) {
            console.log(result.severity);
            allergy = result;
            done();
        });
    });

    it('script 11 - cleanSection', function(done) {
        var allergiesBBOnly = bbr.cleanSection(allergies);
        console.log(allergiesBBOnly[0]._id);
        console.log(allergiesBBOnly[0].allergen.name);
        done();
    });

    it('script 12- duplicate entry', function(done) {
        bbr.duplicateEntry('allergies', 'patientKey', id, fileId, function(err) {
            if (err) {throw err;}
            done();
        });
    });

    it('script 13 - get entry', function(done) {
        bbr.getEntry('allergies', 'patientKey', id, function(err, entry) {
            var attribution = entry.metadata.attribution;
            console.log(attribution[0].merge_reason);     // 'new'
            console.log(attribution[0].record.filename);
            console.log(attribution[1].merge_reason);     // 'update'
            console.log(attribution[1].record.filename);
            console.log(attribution[2].merge_reason);     // 'duplicate'
            console.log(attribution[2].record.filename);
            done();
        });
    });

    it('script 14 - get merges', function(done) {
        bbr.getMerges('allergies', 'patientKey', 'allergen severity', 'filename uploadDate', function(err, mergeList) {
            var explMerge = mergeList[0];
            console.log(explMerge.merge_reason);
            console.log(explMerge.entry.allergen.name);
            console.log(explMerge.entry.severity);
            console.log(explMerge.record.filename);
            console.log(explMerge.record.uploadDate);
            done();
        });
    });

    it('script 15 (a) - merge count, with empty obj', function(done) {
        bbr.mergeCount('allergies', 'patientKey', {}, function(err, count) {
            console.log(count);
            done();
        });
    });

    it('script 15 (b) - merge count, with merge reason: new', function(done) {
        bbr.mergeCount('allergies', 'patientKey', {merge_reason: 'new'}, function(err, count) {
            console.log(count);
            done();
        });
    });

    it('script 15 (c) - merge count, with merge reason: duplicate', function(done) {
        bbr.mergeCount('allergies', 'patientKey', {merge_reason: 'duplicate'}, function(err, count) {
            console.log(count);
            done();
        });
    });

    var partialAllergy;

    it('script 16 - prepare partial allergy', function(done) {
        partialAllergy = {
            partial_entry: cmsJSON.allergies[0],
            partial_match: {
                diff: {severity: 'new'},
                percent: 80,
                subelements: []
            },
            match_entry_id: id
        };
        done();
    });

    it('script 17 - save partial', function(done) {
        // for simplicity use the same here, these would be different in reality
        var partialAllergies = [partialAllergy, partialAllergy];
        bbr.saveMatches('allergies', 'patientKey', partialAllergies, fileId, function(err) {
            if (err) {throw err;}
            done();
         });
    });

    it('script 18 - get a partial section', function(done) {
        bbr.getMatches('allergies', 'patientKey', function(err, result) {
            if (err) {throw err;}
         });
        done();
    });

    var matchId0;
    var matchId1;

    it('script 19 - get matches', function(done) {
        bbr.getMatches('allergies', 'patientKey', 'allergen severity', function(err, result) {
            console.log(result[0].entry.allergen.name);
            console.log(result[0].entry.severity);
            console.log(result[0].match_entry.allergen.name);
            console.log(result[0].match_entry.severity);
            console.log(result[0].diff.severity);
            console.log(result[0].percent);
            matchId0 = result[0]._id;
            matchId1 = result[1]._id;
            done();
        });
    });

    it('script 20- get match', function(done) {
        bbr.getMatch('allergies', 'patientKey', matchId0, function(err, result) {
            console.log(result.entry.allergen.name);
            console.log(result.entry.status);
            console.log(result.match_entry.allergen.name);
            console.log(result.match_entry.status);
            console.log(result.diff.severity);
            console.log(result.percent);
            done();
        });
    });

    it('script 21 (a) - match count', function(done) {
        bbr.matchCount('allergies', 'patientKey', {}, function(err, count) {
            console.log(count);
            done();
        });
    });

    it('script 21 (b) - match count', function(done) {
        bbr.matchCount('allergies', 'patientKey', {percent: 90}, function(err, count) {
            console.log(count);
            done();
        });
    });

    it('script 22 (a) - cancelMatch', function(done) {
        bbr.cancelMatch('allergies', 'patientKey', matchId0, 'ignored', function(err) {
            if (err) {throw err;}
            done();
        });
    });

    it('script 22 (b) - cancelMatch', function(done) {
        bbr.cancelMatch('allergies', 'patientKey', matchId0, 'merged', function(err) {
            if (err) {throw err;}
            done();
        });
    });

    it('script 23 - acceptMatch', function(done) {
        bbr.acceptMatch('allergies', 'patientKey', matchId1, 'added', function(err) {
            if (err) {throw err;}
            done();
        });
    });

    it('script 24 - disconnect', function(done) {
        bbr.disconnect(function(err) {
            if (err) {throw err;}
            done();
        });
    });
});
