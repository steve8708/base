module.exports = (grunt) ->
  grunt.registerMultiTask "ractive", "Compile ractive templates", ->
    options = @options(
      namespace: "JST"
      separator: grunt.util.linefeed
      sanitize: false
      preserveWhitespace: false
    )
    grunt.verbose.writeflags options, "Options"

    @files.forEach (file) ->
      templates = [ options.namespace + ' = {};' ]

      file.src.filter((filepath) ->
        unless grunt.file.exists(filepath)
          grunt.log.warn "Source file \"" + filepath + "\" not found."
          false
        else
          true
      ).forEach (filepath) ->
        src = grunt.file.read filepath
        Ractive = require "ractive"
        try
          compiled = Ractive.parse src,
            preserveWhitespace: options.preserveWhitespace
            sanitize: options.sanitize
        catch e
          grunt.log.error e
          grunt.fail.warn "Ractive failed to compile " + filepath + "."

        templates.push options.namespace + "[" + JSON.stringify(filepath) + \
           "] = " + JSON.stringify(compiled) + ";"

      output = templates
      if output.length < 1
        grunt.log.warn "Destination not written because compiled files empty."
      else
        grunt.file.write file.dest, \
          output.join grunt.util.normalizelf options.separator
        grunt.log.writeln "File \"" + file.dest + "\" created."