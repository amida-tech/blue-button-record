module.exports = function (grunt) {

  grunt.loadNpmTasks('grunt-run');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-jsbeautifier');

  // Print a timestamp (useful for when watching)
  grunt.registerTask('timestamp', function () {
    grunt.log.subhead(Date());
  });

  grunt.initConfig({
    jshint: {
      files: ['./lib/*.js', './test/unit/*.js', './test/docscripts/*.js', 'gruntfile.js', 'package.json', 'index.js'],
      options: {
        browser: true,
        curly: true,
        eqeqeq: true,
        immed: true,
        latedef: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: false,
        boss: true,
        eqnull: true,
        node: true,
        expr: true,
        globals: {
          'xit': true,
          'xdescribe': true,
          'it': true,
          'describe': true,
          'expect': true,
          'before': true,
          'after': true,
          'done': true
        }
      }
    },
    jsbeautifier: {
      files: ['Gruntfile.js', 'index.js', 'lib/*.js', 'test/**/*.js'],
      options: {
        config: '.jsbeautifyrc'
      }
    },
    watch: {
      all: {
        files: ['./lib/*.js', './test/*/*.js', 'index.js', 'gruntfile.js'],
        tasks: ['default']
      }
    },
    run: {
      test: {
        exec: 'npx jest'
      },
      coverage: {
        exec: 'npx jest --coverage'
      }
    }
  });

  grunt.registerTask('test', ['run:test']);
  grunt.registerTask('coverage', ['run:coverage']);
  grunt.registerTask('default', ['jsbeautifier', 'jshint', 'test']);
};
