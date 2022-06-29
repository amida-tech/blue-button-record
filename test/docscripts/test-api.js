"use strict";
var bbr;
bbr = require('../../index');

describe('API Documentation Examples', function () {
  it('connectDatabase', function (done) {
    var options = {
      dbName: 'test-api',
      supported_sections: ['allergies', 'procedures']
    };
    bbr.connectDatabase('localhost', options, function (err) {
      expect(err).toBeFalsy();
      done();
    });
  });

  it('clearDatabase', function (done) {
    bbr.clearDatabase(function (err) {
      expect(err).toBeFalsy();
      done();
    });
  });

  var fileId1;
  var fileId2;
  var fileId3;
  var fileId4;

  it('saveSource (1)', function (done) {
    bbr.saveSource('testPatient1', '<content value=1 />', {
      type: 'text/xml',
      name: 'expl1.xml'
    }, 'ccda', function (err, id) {
      expect(err).toBeFalsy();
      fileId1 = id;
      done();
    });
  });

  it('saveSource (2)', function (done) {
    bbr.saveSource('testPatient1', '<content value=2 />', {
      type: 'application/xml',
      name: 'expl2.xml'
    }, 'c32', function (err, id) {
      expect(err).toBeFalsy();
      fileId2 = id;
      done();
    });
  });

  it('saveSource (3)', function (done) {
    bbr.saveSource('testPatient1', 'content 3', {
      type: 'text/plain',
      name: 'expl3.xml'
    }, 'ccda', function (err, id) {
      expect(err).toBeFalsy();
      fileId3 = id;
      done();
    });
  });

  it('saveSource (4)', function (done) {
    bbr.saveSource('testPatient2', '<content value=4 />', {
      type: 'text/xml',
      name: 'expl4.xml'
    }, 'ccda', function (err, id) {
      expect(err).toBeFalsy();
      fileId4 = id;
      done();
    });
  });

  it('updateSource', function (done) {
    var updateInfo = {
      'metadata.parsed': new Date(),
      'metadata.archived': new Date()
    };
    bbr.updateSource('testPatient1', fileId1, updateInfo, function (err) {
      expect(err).toBeFalsy();
      done();
    });
  });

  it('getSourceList', function (done) {
    bbr.getSourceList('testPatient1', function (err, sources) {
      expect(err).toBeFalsy();
      expect(sources.length).toEqual(3);
      var names = sources.map(function (source) {
        return source.file_name;
      });
      var index = names.indexOf('expl1.xml');
      expect(sources[index].file_mime_type).toEqual('text/xml');
      expect(sources[index].file_class).toEqual('ccda');
      done();
    });
  });

  it('getSource', function (done) {
    bbr.getSource('testPatient1', fileId1, function (err, name, content) {
      expect(err).toBeFalsy();
      expect(name).toEqual('expl1.xml');
      expect(content).toEqual('<content value=1 />');
      done();
    });
  });

  it('sourceCount', function (done) {
    bbr.sourceCount('testPatient1', function (err, count) {
      expect(err).toBeFalsy();
      expect(count).toEqual(3);
      done();
    });
  });

  var aid1;
  var aid2;

  it('saveSection', function (done) {
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

    bbr.saveSection('allergies', 'testPatient1', inputSection, fileId1, function (err, ids) {
      expect(err).toBeFalsy();
      aid1 = ids[0];
      aid2 = ids[1];
      done();
    });
  });

  it('getSection', function (done) {
    bbr.getSection('allergies', 'testPatient1', function (err, entries) {
      expect(err).toBeFalsy();
      var i = [entries[0].name, entries[1].name].indexOf('allergy1');
      expect(entries[i].value.code).toEqual('code1');
      var attr = entries[i].metadata.attribution[0];
      expect(attr.merge_reason).toEqual('new');
      expect(attr.record.filename).toEqual('expl1.xml');
      done();
    });
  });

  it('saveAllSections', function (done) {
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

    bbr.saveAllSections('testPatient2', ptRecord, fileId4, function (err, ids) {
      expect(err).toBeFalsy();
      expect(ids[0][0]).toBeTruthy(); // id for 'allergy1'
      expect(ids[0][1]).toBeTruthy(); // id for 'allergy2'
      expect(ids[1][0]).toBeTruthy(); // id for 'procedure1'
      done();
    });
  });

  it('getAllSections', function (done) {
    bbr.getAllSections('testPatient2', function (err, ptRecord) {
      expect(err).toBeFalsy();
      var names = ptRecord.allergies.map(function (a) {
        return a.name;
      });
      var i = names.indexOf('allergy1');
      expect(ptRecord.allergies[i].severity).toEqual('severity1');
      expect(ptRecord.procedures[0].name).toEqual('procedure1');
      expect(ptRecord.procedures[0].proc_type).toEqual('proc_type1');
      var attr = ptRecord.procedures[0].metadata.attribution[0];
      expect(attr.merge_reason).toEqual('new');
      expect(attr.record.filename).toEqual('expl4.xml');
      done();
    });
  });

  it('cleanSection', function (done) {
    bbr.getSection('procedures', 'testPatient2', function (err, entries) {
      expect(err).toBeFalsy();
      var expectedCleanEntries = [{
        name: 'procedure1',
        proc_type: 'proc_type1',
      }];
      expect(entries).not.toEqual(expectedCleanEntries);
      var cleanEntries = bbr.cleanSection(entries);
      expect(cleanEntries).toEqual(expectedCleanEntries);
      done();
    });
  });

  it('getEntry', function (done) {
    bbr.getEntry('allergies', 'testPatient1', aid2, function (err, entry) {
      expect(err).toBeFalsy();
      expect(entry.name).toEqual('allergy2');
      expect(entry.value.display).toEqual('display2');
      var attr = entry.metadata.attribution[0];
      expect(attr.merge_reason).toEqual('new');
      expect(attr.record.filename).toEqual('expl1.xml');
      done();
    });
  });

  it('duplicateEntry', function (done) {
    bbr.duplicateEntry('allergies', 'testPatient1', aid1, fileId2, function (err) {
      expect(err).toBeFalsy();
      bbr.getEntry('allergies', 'testPatient1', aid1, function (err, entry) {
        expect(err).toBeFalsy();
        var attr = entry.metadata.attribution;
        expect(attr.length).toEqual(2);
        expect(attr[0].merge_reason).toEqual('new');
        expect(attr[0].record.filename).toEqual('expl1.xml');
        expect(attr[1].merge_reason).toEqual('duplicate');
        expect(attr[1].record.filename).toEqual('expl2.xml');
        done();
      });
    });
  });

  it('updateEntry', function (done) {
    bbr.updateEntry('allergies', 'testPatient1', aid1, fileId3, {
      severity: 'updatedSev'
    }, function (err) {
      expect(err).toBeFalsy();
      bbr.getEntry('allergies', 'testPatient1', aid1, function (err, entry) {
        expect(err).toBeFalsy();
        expect(entry.severity).toEqual('updatedSev');
        var attr = entry.metadata.attribution;
        expect(attr.length).toEqual(3);
        expect(attr[0].merge_reason).toEqual('new');
        expect(attr[0].record.filename).toEqual('expl1.xml');
        expect(attr[1].merge_reason).toEqual('duplicate');
        expect(attr[1].record.filename).toEqual('expl2.xml');
        expect(attr[2].merge_reason).toEqual('update');
        expect(attr[2].record.filename).toEqual('expl3.xml');
        done();
      });
    });
  });

  it('getMerges', function (done) {
    bbr.getMerges('allergies', 'testPatient1', 'name severity', 'filename', function (err, result) {
      expect(err).toBeFalsy();
      expect(result.length).toEqual(4);
      result.sort(function (a, b) {
        var r = a.entry.name.localeCompare(b.entry.name);
        if (r === 0) {
          var c = {
            'new': -1,
            'duplicate': 0,
            'update': 1
          };
          return c[a.merge_reason] - c[b.merge_reason];
        }
        return r;
      });
      expect(result[0].entry.severity).toEqual('updatedSev');
      expect(result[0].record.filename).toEqual('expl1.xml');
      expect(result[0].merge_reason).toEqual('new');
      expect(result[1].entry.severity).toEqual('updatedSev');
      expect(result[1].record.filename).toEqual('expl2.xml');
      expect(result[1].merge_reason).toEqual('duplicate');
      expect(result[2].entry.severity).toEqual('updatedSev');
      expect(result[2].record.filename).toEqual('expl3.xml');
      expect(result[2].merge_reason).toEqual('update');
      expect(result[3].entry.severity).toEqual('severity2');
      expect(result[3].record.filename).toEqual('expl1.xml');
      expect(result[3].merge_reason).toEqual('new');
      done();
    });
  });

  it('mergeCount (1)', function (done) {
    bbr.mergeCount('allergies', 'testPatient1', {}, function (err, count) {
      expect(err).toBeFalsy();
      expect(count).toEqual(4);
      done();
    });
  });

  it('mergeCount (2)', function (done) {
    bbr.mergeCount('allergies', 'testPatient1', {
      merge_reason: 'duplicate'
    }, function (err, count) {
      expect(err).toBeFalsy();
      expect(count).toEqual(1);
      done();
    });
  });

  var paid1;
  var paid2;

  it('saveMatches', function (done) {
    var inputSection = [{
      partial_entry: {
        name: 'allergy1',
        severity: 'severity3',
        value: {
          code: 'code1',
          display: 'display1'
        }
      },
      partial_matches: [{
        match_entry: aid1,
        match_object: {
          percent: 80,
          subelements: ['severity']
        }
      }]
    }, {
      partial_entry: {
        name: 'allergy2',
        severity: 'severity2',
        value: {
          code: 'code5',
          display: 'display2'
        }
      },
      partial_matches: [{
        match_entry: aid2,
        match_object: {
          percent: 90,
          subelements: ['value.code']
        }
      }]
    }];
    bbr.saveMatches('allergies', 'testPatient1', inputSection, fileId4, function (err, ids) {
      expect(err).toBeFalsy();
      paid1 = ids[0];
      paid2 = ids[1];
      done();
    });
  });

  it('getMatches', function (done) {
    bbr.getMatches('allergies', 'testPatient1', 'name severity value.code', function (err, entries) {
      expect(err).toBeFalsy();
      var i = [entries[0].entry.name, entries[1].entry.name].indexOf('allergy1');

      expect(entries[i].matches[0].match_entry.severity).toEqual('updatedSev');
      expect(entries[i].entry.severity).toEqual('severity3');
      expect(entries[i].matches[0].match_object.percent).toEqual(80);
      expect(entries[i].matches[0].match_object.subelements).toEqual(['severity']);
      expect(entries[(i + 1) % 2].matches[0].match_entry.value.code).toEqual('code2');
      expect(entries[(i + 1) % 2].entry.value.code).toEqual('code5');
      expect(entries[(i + 1) % 2].matches[0].match_object.percent).toEqual(90);
      expect(entries[(i + 1) % 2].matches[0].match_object.subelements).toEqual(['value.code']);
      done();
    });
  });

  it('getMatch', function (done) {
    bbr.getMatch('allergies', 'testPatient1', paid1, function (err, matchInfo) {
      expect(err).toBeFalsy();
      expect(matchInfo.matches[0].match_entry.severity).toEqual('updatedSev');
      expect(matchInfo.entry.severity).toEqual('severity3');
      expect(matchInfo.matches[0].match_object.percent).toEqual(80);
      expect(matchInfo.matches[0].match_object.subelements).toEqual(['severity']);
      done();
    });
  });

  it('matchCount (1)', function (done) {
    bbr.matchCount('allergies', 'testPatient1', {}, function (err, count) {
      expect(err).toBeFalsy();
      expect(count).toEqual(2);
      done();
    });
  });

  it('matchCount (2)', function (done) {
    bbr.matchCount('allergies', 'testPatient1', {
      percent: 80
    }, function (err, count) {
      expect(err).toBeFalsy();
      expect(count).toEqual(1);
      done();
    });
  });

  it('acceptMatch', function (done) {
    bbr.acceptMatch('allergies', 'testPatient1', paid1, 'added', function (err) {
      expect(err).toBeFalsy();
      bbr.getSection('allergies', 'testPatient1', function (err, entries) {
        expect(err).toBeFalsy();
        expect(entries.length).toEqual(3); // added to Master Health Record
        bbr.matchCount('allergies', 'testPatient1', {}, function (err, count) {
          expect(err).toBeFalsy();
          expect(count).toEqual(1); // removed from Partial Health Record 
          done();
        });
      });
    });
  });

  it('cancelMatch', function (done) {
    bbr.cancelMatch('allergies', 'testPatient1', paid2, 'ignored', function (err) {
      expect(err).toBeFalsy();
      bbr.getSection('allergies', 'testPatient1', function (err, entries) {
        expect(err).toBeFalsy();
        expect(entries.length).toEqual(3); // not added to Master Health Record
        bbr.matchCount('allergies', 'testPatient1', {}, function (err, count) {
          expect(err).toBeFalsy();
          expect(count).toEqual(0); // removed from Partial Health Record 
          done();
        });
      });
    });
  });

  it('clearDatabase', function (done) {
    bbr.clearDatabase(function (err) {
      expect(err).toBeFalsy();
      done();
    });
  });

  it('disconnect', function (done) {
    bbr.disconnect(function (err) {
      expect(err).toBeFalsy();
      done();
    });
  });
});
