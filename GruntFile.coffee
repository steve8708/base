###
  TODO:
    karma testing in test page
###


config =
  useLocalIp: true

module.exports = (grunt) ->

  # Load our our dustom grunt tasks  - - - - - - - - - - - -

  grunt.loadTasks    'tasks'
  grunt.loadNpmTasks 'grunt-git'
  grunt.loadNpmTasks 'grunt-bump'
  grunt.loadNpmTasks 'grunt-karma'
  grunt.loadNpmTasks 'grunt-shell'
  grunt.loadNpmTasks 'grunt-prompt'
  grunt.loadNpmTasks 'grunt-lodash'
  grunt.loadNpmTasks 'grunt-rename'
  grunt.loadNpmTasks 'grunt-contrib'
  grunt.loadNpmTasks 'grunt-coffeelint'
  grunt.loadNpmTasks 'grunt-text-replace'


  # Main config - - - - - - - - - - - - - - - - - - - - - -

  hostname = if config.useLocalIp then getLocalIp() else 'localhost'

  grunt.initConfig
    connect:
      server:
        options:
          port: 5020
          hostname: hostname
          base: 'build'

    lodash:
      target:
        dest: 'build/lodash.build.js'

      options:
        modifier: 'backbone'
        plus: [
          'debounce'
          'delay'
          'throttle'
          'defer'
          'compact'
        ]

    concat:
      dist:
        dest: 'build/base.js'
        src: [
          'src/js/ractive-backbone-associated-model-adaptor.js'
          'build/base.coffee.js'
        ]

    copy:
      main:
        files: [
          expand: true
          flatten: true
          src: 'assets/images/non-sprite/*'
          dest: 'build/'
        ]

    coffee:
      compile:
        files:
          'build/base.coffee.js': [
            'src/coffee/base.coffee'
          ]

    coffeelint:
      options:
        # We need backticks in pre-config.coffee
        no_backticks:
          level: 'ignore'
      src: [ 'src/coffee/**/*.coffee', 'GruntFile.coffee', 'tasks/*.coffee' ]

    jade:
      main:
        files:
          'build/index.html': 'src/jade/index.jade'

    watch:
      jade:
        files: [ 'src/jade/**/*.jade' ]
        tasks: [ 'jade' ]

      lint:
        files: [
          'tasks/*.coffee'
          'GruntFile.coffee'
          'tasks/**/*.coffee'
          'test/**/*.coffee'
        ]
        tasks: [ 'coffeelint' ]

      coffee:
        files: [ 'src/coffee/**/*.coffee' ]
        tasks: [ 'coffeelint', 'coffee', 'concat' ]

      ractive:
        files: [ 'src/templates/**/*.html' ]
        tasks: [ 'ractive', 'concat' ]

      js:
        files: [ 'src/**/*.js' ]
        tasks: [ 'concat' ]

      livereload:
        options:
          livereload: true
        files: [ 'build/**/*' ]

    uglify:
      main:
        files:
          'dist/base.js': [ 'build/base.js' ]

    cssmin:
      main:
        files: 'dist/base.css': [ 'build/output.css' ]

    clean:
      build: [ 'build' ]
      dist: [ 'dist/*' ]

    ractive:
      compile:
        options:
          namespace: 'pict.templates'
        files:
          'build/templates.js': [ 'src/templates/**/*.html' ]

    karma:
      options:
        browsers: [ 'PhantomJS' ]
        frameworks: [ 'mocha', 'chai' ]
        files: [
          'build/base.js'
          'test/setup.coffee'
          'test/**/*.coffee'
        ]

      single:
        singleRun: true

      watch:
        autoWatch: true

    compress:
      options:
        mode: 'gzip'
      main:
        src: ['dist/*']
        dest: 'dist/'
        expand: true
        flatten: true

    imagemin:
      main:
        files: [
          src: [ 'build/*.{png,jpg}' ]
          dest: 'dist/'
          expand: true
          flatten: true
        ]

    replace:
      distJS:
        src: [ 'dist/base.js' ]
        overwrite: true
        replacements: [
          from: /^/
          to: -> "/* base.js v#{packageVersion()} */ \n"
        ]

    bump:
      options:
        files: [ 'package.json', 'src/coffee/config.coffee' ]
        commitFiles: [ '-a' ]
        pushTo: 'origin'

    shell:
      checkUnstaged:
        command: 'git status'
        options:
          callback: (err, stdout, stderr, done) ->
            if /modified:|deleted:|untracked:/.test stdout
              grunt.fail.warn(
                'You have unstaged files, please commit or stash ' +
                'them before proceeding'
              )
            done()

    prompt:
      release:
        options:
          questions: [
            type: 'input'
            name: 'Confirm'
            message:
              'This is LIVE deployment, are you sure you want to continue? y/n'
            validate: (input) -> validatePrompt input
          ,
            type: 'input'
            name: 'Check committed'
            message:
              "And you are 100,000% certain you have commited all files?? y/n"
            validate: (input) ->
              validatePrompt input
              grunt.log.writeln 'OK, proceeding to release. Cross your fingers!'
              true
          ]


  # Task Groups - - - - - - - - - - - - - - - - - - - - - -

  grunt.registerTask 'build', [
    'clean:build'
    'copy'
    'coffeelint'
    'coffee'
    'concat'
    # 'test'
  ]

  grunt.registerTask 'build:release', [
    'clean:dist'
    'build'
    'uglify'
    'replace:distCSS'
    'replace:distJS'
  ]

  grunt.registerTask 'release:patch',   [
    'release:confirm'
    'bump-only:patch'
    'release:build'
    'bump-commit'
  ]

  grunt.registerTask 'release:minor',   [
    'release:confirm'
    'bump-only:minor'
    'release:build'
    'bump-commit'
  ]

  grunt.registerTask 'release:major',   [
    'release:confirm'
    'bump-only:major'
    'release:build'
    'bump-commit'
  ]

  grunt.registerTask 'test-watch',      [ 'karma:watch' ]
  grunt.registerTask 'test',            [ 'karma:single' ]
  grunt.registerTask 'release:build',   [ 'build:release' ]
  grunt.registerTask 'watch-serve',     [ 'connect', 'watch' ]
  grunt.registerTask 'release:confirm', [ 'prompt', 'shell:checkUnstaged']


  # Grunt Helpers - - - - - - - - - - - - - - - - - - - - - - - - -

  packageVersion = ->
    grunt.file.readJSON('package.json').version

  validatePrompt = (input) ->
    if input.toLowerCase() is 'y'
      true
    else
      grunt.fail.warn 'Aborted by user'

# Helpers  - - - - - - - - - - - - - - - - - - - - - - - - -

os = require 'os'

getLocalIp = ->
  interfaces = os.networkInterfaces()
  for name, value of interfaces
    for details in value
      if details.family is 'IPv4' and name is 'en1'
        return details.address
