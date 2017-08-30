'use strict';

var cli = require('cli').enable('status');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var asciidoctor = require('asciidoctor.js')();

var convert_options = function (cliOptions) {
  var backend = cliOptions['backend'];
  var doctype = cliOptions['doctype'];
  var safeMode = cliOptions['safe-mode'];
  var noHeaderFooter = cliOptions['no-header-footer']
  var sectionNumbers = cliOptions['section-numbers'];
  var baseDir = cliOptions['base-dir'];
  var destinationDir = cliOptions['destination-dir'];
  var quiet = cliOptions['quiet'];
  var verbose = cliOptions['verbose'];
  var timings = cliOptions['timings'];
  var trace = cliOptions['trace'];
  var requireLib = cliOptions['require'];
  cli.debug('require ' + requireLib);
  cli.debug('backend ' + backend);
  cli.debug('doctype ' + doctype);
  cli.debug('header_footer ' + !noHeaderFooter);
  cli.debug('section-numbers ' + sectionNumbers);
  cli.debug('quiet ' + quiet);
  cli.debug('verbose ' + verbose);
  cli.debug('timings ' + timings);
  cli.debug('trace ' + trace);
  cli.debug('baseDir ' + baseDir);
  cli.debug('destinationDir ' + destinationDir);
  if (requireLib) {
    require(requireLib);
  }
  var verboseMode = quiet ? 0 : verbose ? 2 : 1;
  var attributes = '';
  if (noHeaderFooter) {
    attributes = 'showtitle ';
  }
  if (sectionNumbers) {
    attributes = attributes.concat('sectnums ');
  }
  var cliAttributes = cliOptions['attribute'];
  if (cliAttributes) {
    attributes = attributes.concat(cliAttributes);
  }
  cli.debug('verboseMode ' + verboseMode);
  cli.debug('attributes ' + attributes);
  var options = {
    backend: backend,
    doctype: doctype,
    safe: safeMode,
    header_footer: !noHeaderFooter,
    verbose: verboseMode,
    // FIXME 22/12/2014, exception is thrown at runtime
    //timings: timings,
    trace: trace
  };
  if (baseDir != null) {
    options.base_dir = baseDir
  }/*
  if (destinationDir != null) {
    options.to_dir = destinationDir;
  }*/
  options.attributes = attributes;
  cli.debug('options ' + JSON.stringify(options));
  return options;
}

var convert_file = function (file, options) {
  cli.debug('convert file ' + file + ' with options ' + options);
  var data = fs.readFileSync(file, 'utf8');
  return asciidoctor.convert(data, options);
};

var output_result = function (data, file, cliOptions) {
  var backend = cliOptions['backend'];
  var outFile = cliOptions['out-file'];
  var destinationDir = cliOptions['destination-dir'];
  cli.debug('out-file ' + outFile);
  if (outFile == '') {
    console.log(data);
  } else {
    if (destinationDir != null) {
      var outDir = destinationDir;
      mkdirp.sync(outDir);
    } else {
      var outDir = path.dirname(file);
    }
    if (outFile == null) {
      var extname = path.extname(file);
      if (backend == 'docbook45' || backend == 'docbook5') {
        var outputExtname = '.xml';
      } else {
        var outputExtname = '.html';
      }
      var outputFile = outDir + path.sep + path.basename(file, extname) + outputExtname;
    } else {
      var outputFile = outDir + path.sep + outFile;
    }
    fs.writeFileSync(outputFile, data);
    cli.debug(file + ' converted to ' + backend + ' in ' + outputFile);
  }
};

cli.parse({
  'backend':          ['b', 'set output format backend (default: html5)', 'string', 'html5'],
  'doctype':          ['d', 'document type to use when converting document: [article, book, manpage, inline] (default: article)', 'string', 'article'],
  'out-file':         ['o', 'output file (default: based on path of input file); use \'\' to output to STDOUT', 'file'],
  'safe-mode':        ['S', 'set safe mode level explicitly: [unsafe, safe, server, secure] (default: unsafe)), disables potentially dangerous macros in source files, such as include::[]', 'string', 'unsafe'],
  'no-header-footer': ['s', 'suppress output of header and footer (default: false)', 'boolean', false],
  'section-numbers':  ['n', 'auto-number section titles in the HTML backend; disabled by default', 'boolean', false],
  'base-dir':         ['B', 'base directory containing the document and resources (default: directory of source file)', 'path'],
  'destination-dir':  ['D', 'destination output directory (default: directory of source file)', 'path'],
  'quiet':            ['q', 'suppress warnings (default: false)', 'boolean', 'false'],
  'trace':            [false, 'include backtrace information on errors (default: false)', 'boolean', false],
  'verbose':          ['v', 'enable verbose mode (default: false)', 'boolean', false],
  'timings':          ['t', 'enable timings mode (default: false)', 'boolean', false],
  'attribute':        ['a', 'a document attribute to set in the form of key, key! or key=value pair', 'string', ''],
  'require':          ['r', 'require the specified library before executing the processor, using the standard Node require', 'string', ''],
  'version':          ['V', 'display the version and runtime environment (or -v if no other flags or arguments)', 'boolean', false]
});

cli.main(function (cliArgs, cliOptions) {
  var options = convert_options(cliOptions);
  var verbose = cliOptions['verbose'];
  var version = cliOptions['version'];
  var displayVersion = version || (verbose && cliArgs.length == 0);
  if (displayVersion) {
    cli.info("Asciidoctor " + asciidoctor.getCoreVersion() + " [http://asciidoctor.org]");
    var releaseName = process.release ? process.release.name : 'node';
    cli.info("Runtime Environment (" + releaseName + " " + process.version + " on " + process.platform + ")");
  } else {
    cliArgs.forEach(function (file) {
      var data = convert_file(file, options);
      output_result(data, file, cliOptions);
    });
  }
});
