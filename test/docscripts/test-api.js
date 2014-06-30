"use strict";

describe('API Documentation Examples', function() {
    var bbr;
    var assert;

    it('connectDatabase', function(done) {
        bbr = require('../../index');
        assert = require('assert');
        var options = {
            dbName: 'test',
            schemas: {
                allergies: {
                    name: 'string',
                    severity: 'string',
                    value: {
                        code: 'string', 
                        display: 'string'
                    }
                },
                procedures : {
                    name: 'string',
                    proc_type: 'string',
                    proc_value: {
                        code: 'string',
                        display: 'string'
                    }
                }
            },
            matchFields: {
                percent: 'number',
                subelements: 'any'
            }
        };    

        bbr.connectDatabase('localhost', options, function(err) {
            assert.ifError(err);
            done();
        });
    });

    it('clearDatabase', function(done) {
        bbr.clearDatabase(function(err) {
            assert.ifError(err);
            done();
        });
    });

    var fileId1;
    var fileId2;
    var fileId3;
    var fileId4;

    it('saveRecord (1)', function(done) {
        bbr.saveRecord('testPatient1', '<content value=1 />', {type: 'text/xml', name: 'expl1.xml'}, 'ccda', function(err, id) {
            assert.ifError(err);
            fileId1 = id;
            done();
        });
    });

    it('saveRecord (2)', function(done) {
        bbr.saveRecord('testPatient1', '<content value=2 />', {type: 'application/xml', name: 'expl2.xml'}, 'c32', function(err, id) {
            assert.ifError(err);
            fileId2 = id;
            done();
        });
    });

    it('saveRecord (3)', function(done) {
        bbr.saveRecord('testPatient1', 'content 3', {type: 'text/plain', name: 'expl3.xml'}, 'ccda', function(err, id) {
            assert.ifError(err);
            fileId3 = id;
            done();
        });
    });

    it('saveRecord (4)', function(done) {
        bbr.saveRecord('testPatient2', '<content value=4 />', {type: 'text/xml', name: 'expl4.xml'}, 'ccda', function(err, id) {
            assert.ifError(err);
            fileId4 = id;
            done();
        });
    });

    it('getRecordList', function(done) {
        bbr.getRecordList('testPatient1', function(err, sources) {
            assert.ifError(err);
            assert.equal(sources.length, 3);
            var names = sources.map(function(source) {return source.file_name;});
            var index = names.indexOf('expl1.xml');
            assert.equal(sources[index].file_mime_type, 'text/xml');
            assert.equal(sources[index].file_class, 'ccda');
            done();
        });
    });

    it('getRecord', function(done) {
        bbr.getRecord('testPatient1', fileId1, function(err, name, content) {
            assert.ifError(err);
            assert.equal(name, 'expl1.xml');
            assert.equal(content, '<content value=1 />');
            done();            
        });
    });

    it('recordCount', function(done) {
        bbr.recordCount('testPatient1', function(err, count) {
            assert.ifError(err);
            assert.equal(count, 3);
            done();
        });
    });

    var aid1;
    var aid2;

    it('saveSection', function(done) {
        var inputSection = [{
            name: 'allergy1',
            severity: 'severity1',
            value: {
                code: 'code1', 
                display: 'display1'
            } 
        }, {
            name: 'allergy2',
            severity: 'severity2',
            value: {
                code: 'code2', 
                display: 'display2'
            }
        }];

        bbr.saveSection('allergies', 'testPatient1', inputSection, fileId1, function(err, ids) {
            assert.ifError(err);        
            aid1 = ids[0];
            aid2 = ids[1];
            done();
        });
    });

    it('getSection', function(done) {
        bbr.getSection('allergies', 'testPatient1', function(err, entries) {
            assert.ifError(err);  
            var i = [entries[0].name, entries[1].name].indexOf('allergy1');            
            assert.equal(entries[i].value.code, 'code1');
            var attr = entries[i].metadata.attribution[0];
            assert.equal(attr.merge_reason, 'new');
            assert.equal(attr.record.filename, 'expl1.xml');
            done();
        });
    });

    it('saveAllSections', function(done) {
        var ptRecord = {
            allergies: [{
                name: 'allergy1',
                severity: 'severity1',
            }, {
                name: 'allergy2',
                severity: 'severity2',
            }],
            procedures: [{
                name: 'procedure1',
                proc_type: 'proc_type1',
            }]
        };
        
        bbr.saveAllSections('testPatient2', ptRecord, fileId4, function(err, ids) {
            assert.ifError(err);
            assert(ids[0][0]); // id for 'allergy1'
            assert(ids[0][1]); // id for 'allergy2'
            assert(ids[1][0]); // id for 'procedure1'
            done();
        });
    });

    it('getAllSections', function(done) {
        bbr.getAllSections('testPatient2', function(err, ptRecord) {
            assert.ifError(err);
            var names = ptRecord.allergies.map(function(a) {return a.name;});
            var i = names.indexOf('allergy1');
            assert.equal(ptRecord.allergies[i].severity, 'severity1');
            assert.equal(ptRecord.procedures[0].name, 'procedure1');
            assert.equal(ptRecord.procedures[0].proc_type, 'proc_type1');
            var attr = ptRecord.procedures[0].metadata.attribution[0];
            assert.equal(attr.merge_reason, 'new');
            assert.equal(attr.record.filename, 'expl4.xml');
            done();
        });
    });

    it('cleanSection', function(done) {
        bbr.getSection('procedures', 'testPatient2', function(err, entries) {
            assert.ifError(err);
            var expectedCleanEntries = [{name: 'procedure1', proc_type: 'proc_type1',}];
            assert.notDeepEqual(entries, expectedCleanEntries);
            var cleanEntries = bbr.cleanSection(entries);
            assert.deepEqual(cleanEntries, expectedCleanEntries);
            done();
        });
    });

    it('getEntry', function(done) {
        bbr.getEntry('allergies', aid2, function(err, entry) {
            assert.ifError(err);
            assert.equal(entry.name, 'allergy2');
            assert.equal(entry.value.display, 'display2');
            var attr = entry.metadata.attribution[0];
            assert.equal(attr.merge_reason, 'new');
            assert.equal(attr.record.filename, 'expl1.xml');
            done();
        });
    });

    it('duplicateEntry', function(done) {
        bbr.duplicateEntry('allergies', aid1, fileId2, function(err) {
            assert.ifError(err);
            bbr.getEntry('allergies', aid1, function(err, entry) {
                assert.ifError(err);
                var attr = entry.metadata.attribution;
                assert.equal(attr.length, 2);
                assert.equal(attr[0].merge_reason, 'new');
                assert.equal(attr[0].record.filename, 'expl1.xml');
                assert.equal(attr[1].merge_reason, 'duplicate');
                assert.equal(attr[1].record.filename, 'expl2.xml');
                done();
            });
        });
    });

    it('updateEntry', function(done) {
        bbr.updateEntry('allergies', aid1, fileId3, {severity: 'updatedSev'}, function(err) {
            assert.ifError(err);
            bbr.getEntry('allergies', aid1, function(err, entry) {
                assert.ifError(err);
                assert.equal(entry.severity, 'updatedSev');
                var attr = entry.metadata.attribution;
                assert.equal(attr.length, 3);
                assert.equal(attr[0].merge_reason, 'new');
                assert.equal(attr[0].record.filename, 'expl1.xml');
                assert.equal(attr[1].merge_reason, 'duplicate');
                assert.equal(attr[1].record.filename, 'expl2.xml');
                assert.equal(attr[2].merge_reason, 'update');
                assert.equal(attr[2].record.filename, 'expl3.xml');
                done();
            });
        });
    });

    it('getMerges', function(done) {
        bbr.getMerges('allergies', 'testPatient1', 'name severity', 'filename', function(err, result) {
            assert.ifError(err);
            assert.equal(result.length, 4);
            result.sort(function(a, b) {
                var r = a.entry.name.localeCompare(b.entry.name);
                if (r === 0) {
                    var c = {'new': -1, 'duplicate': 0, 'update': 1};
                    return c[a.merge_reason] - c[b.merge_reason];
                }
                return r;
            });
            assert.equal(result[0].entry.severity, 'updatedSev');
            assert.equal(result[0].record.filename, 'expl1.xml');
            assert.equal(result[0].merge_reason, 'new');
            assert.equal(result[1].entry.severity, 'updatedSev');
            assert.equal(result[1].record.filename, 'expl2.xml');
            assert.equal(result[1].merge_reason, 'duplicate');
            assert.equal(result[2].entry.severity, 'updatedSev');
            assert.equal(result[2].record.filename, 'expl3.xml');
            assert.equal(result[2].merge_reason, 'update');
            assert.equal(result[3].entry.severity, 'severity2');
            assert.equal(result[3].record.filename, 'expl1.xml');
            assert.equal(result[3].merge_reason, 'new');
            done();
        });
    });

    it('mergeCount (1)', function(done) {
        bbr.mergeCount('allergies', 'testPatient1', {}, function(err, count) {
            assert.ifError(err);
            assert.equal(count, 4);
            done();
        });
    });

    it('mergeCount (2)', function(done) {
        bbr.mergeCount('allergies', 'testPatient1', {merge_reason: 'duplicate'}, function(err, count) {
            assert.ifError(err);
            assert.equal(count, 1);
            done();
        });
    });

    var paid1;
    var paid2;

    it('savePartialSection', function(done) {
        var inputSection = [{
            partial_entry : {
                name: 'allergy1',
                severity: 'severity3',
                value: {
                    code: 'code1', 
                    display: 'display1'
                }
            },
            partial_match: {
                percent: 80,
                subelements: ['severity']
            },
            match_entry_id: aid1
        },
        {
            partial_entry: {
                name: 'allergy2',
                severity: 'severity2',
                value: {
                    code: 'code5', 
                    display: 'display2'
                }
            },
            partial_match: {
                percent: 90,
                subelements: ['value.code']
            },
            match_entry_id: aid2
        }];
        bbr.savePartialSection('allergies', 'testPatient1', inputSection, fileId4, function(err, ids) {
            assert.ifError(err);
            paid1 = ids[0];
            paid2 = ids[1];
            done();
        });
    });

    it('getPartialSection', function(done) {
        bbr.getPartialSection('allergies', 'testPatient1', function(err, entries) {
            assert.ifError(err);
            var i = [entries[0].name, entries[1].name].indexOf('allergy1');
            assert.equal(entries[i].name, 'allergy1');
            assert.equal(entries[i].severity, 'severity3');
            assert.equal(entries[i+1 % 2].name, 'allergy2');
            assert.equal(entries[i+1 % 2].value.code, 'code5');
            done();
        });
    });

    it('getMatches', function(done) {
        bbr.getMatches('allergies', 'testPatient1', 'name severity value.code', function(err, entries) {
            assert.ifError(err);
            var i = [entries[0].entry.name, entries[1].entry.name].indexOf('allergy1');
            assert.equal(entries[i].entry.severity, 'updatedSev');
            assert.equal(entries[i].match_entry.severity, 'severity3');
            assert.equal(entries[i].percent, 80);
            assert.deepEqual(entries[i].subelements, ['severity']);
            assert.equal(entries[i+1 % 2].entry.value.code, 'code2');
            assert.equal(entries[i+1 % 2].match_entry.value.code, 'code5');
            assert.equal(entries[i+1 % 2].percent, 90);
            assert.deepEqual(entries[i+1 % 2].subelements, ['value.code']);            
            done();
        });
    });

    it('getMatch', function(done) {
        bbr.getMatch('allergies', paid1, function(err, matchInfo) {
            assert.ifError(err);
            assert.equal(matchInfo.entry.severity, 'updatedSev');
            assert.equal(matchInfo.match_entry.severity, 'severity3');
            assert.equal(matchInfo.percent, 80);
            assert.deepEqual(matchInfo.subelements, ['severity']);
            done();
        });
    });

    it('matchCount (1)', function(done) {
        bbr.matchCount('allergies', 'testPatient1', {}, function(err, count) {
            assert.ifError(err);
            assert.equal(count, 2);
            done();
        });
    });

    it('matchCount (2)', function(done) {
        bbr.matchCount('allergies', 'testPatient1', {percent: 80}, function(err, count) {
            assert.ifError(err);
            assert.equal(count, 1);
            done();
        });
    });

    it('acceptMatch', function(done) {
        bbr.acceptMatch('allergies', paid1, 'added', function(err) {
            assert.ifError(err);
            bbr.getSection('allergies', 'testPatient1', function(err, entries) {
                assert.ifError(err);
                assert.equal(entries.length, 3); // added to Master Health Record
                bbr.matchCount('allergies', 'testPatient1', {}, function(err, count) {
                    assert.ifError(err);
                    assert.equal(count, 1);     // removed from Partial Health Record 
                    done();
                });
            });
        });
    });

    it('cancelMatch', function(done) {
        bbr.cancelMatch('allergies', paid2, 'ignored', function(err) {
            assert.ifError(err);
            bbr.getSection('allergies', 'testPatient1', function(err, entries) {
                assert.ifError(err);
                assert.equal(entries.length, 3); // not added to Master Health Record
                bbr.matchCount('allergies', 'testPatient1', {}, function(err, count) {
                    assert.ifError(err);
                    assert.equal(count, 0);      // removed from Partial Health Record 
                    done();
                });
            });
        });
    });

    it('clearDatabase', function(done) {
        bbr.clearDatabase(function(err) {
            assert.ifError(err);
            done();
        });
    });

    it('disconnect', function(done) {
        bbr.disconnect(function(err) {
            assert.ifError(err);
            done();
        });
    });
});