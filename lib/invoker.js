/* global Opal */
const fs = require('fs')
const ospath = require('path')
const asciidoctor = require('@asciidoctor/core')()
const pkg = require('../package.json')
const stdin = require('./stdin')

const DOT_RELATIVE_RX = new RegExp(`^\\.{1,2}[/${ospath.sep.replace('/', '').replace('\\', '\\\\')}]`)

class Invoker {
  constructor (options) {
    this.options = options
  }

  invoke () {
    const processArgs = this.options.argv.slice(2)
    const args = this.options.args
    const verbose = args['verbose']
    const version = args['version']
    const files = args['files']
    if (version || (verbose && processArgs.length === 1)) {
      Invoker.printVersion()
      process.exit(0)
    }
    Invoker.prepareProcessor(args, asciidoctor)
    const options = this.options.options
    if (this.options.stdin) {
      Invoker.convertFromStdin(options, args)
    } else if (files && files.length > 0) {
      Invoker.processFiles(files, verbose, args['timings'], options)
    } else {
      this.showHelp()
    }
  }

  showHelp () {
    if (this.options.args['help'] === 'syntax') {
      console.log(fs.readFileSync(ospath.join(__dirname, '..', 'data', 'reference', 'syntax.adoc'), 'utf8'))
    } else {
      this.options.yargs.showHelp()
    }
  }

  static printVersion () {
    console.log(`Asciidoctor.js ${asciidoctor.getVersion()} (Asciidoctor ${asciidoctor.getCoreVersion()}) [https://asciidoctor.org]`)
    const releaseName = process.release ? process.release.name : 'node'
    console.log(`Runtime Environment (${releaseName} ${process.version} on ${process.platform})`)
    console.log(`CLI version ${pkg.version}`)
  }

  static convertFromStdin (options, args) {
    stdin.read((data) => {
      if (args['timings']) {
        const timings = asciidoctor.Timings.$new()
        const instanceOptions = Object.assign({}, options, { timings: timings })
        Invoker.convert(asciidoctor.convert, data, instanceOptions)
        timings.$print_report(Opal.gvars.stderr, '-')
      } else {
        Invoker.convert(asciidoctor.convert, data, options)
      }
    })
  }

  static convert (processorFn, input, options) {
    try {
      processorFn.apply(asciidoctor, [input, options])
    } catch (e) {
      if (e && e.name === 'NotImplementedError' && e.message === `asciidoctor: FAILED: missing converter for backend '${options.backend}'. Processing aborted.`) {
        console.error(`> Error: missing converter for backend '${options.backend}'. Processing aborted.`)
        console.error(`> You might want to require a Node.js package with --require option to support this backend.`)
        process.exit(1)
      }
      throw e
    }
  }

  static convertFile (file, options) {
    Invoker.convert(asciidoctor.convertFile, file, options)
  }

  static processFiles (files, verbose, timings, options) {
    files.forEach((file) => {
      if (verbose) {
        console.log(`converting file ${file}`)
      }
      if (timings) {
        const timings = asciidoctor.Timings.$new()
        const instanceOptions = Object.assign({}, options, { timings: timings })
        Invoker.convertFile(file, instanceOptions)
        timings.$print_report(Opal.gvars.stderr, file)
      } else {
        Invoker.convertFile(file, options)
      }
    })
    let code = 0
    const logger = asciidoctor.LoggerManager.getLogger()
    if (logger && typeof logger.getMaxSeverity === 'function' && logger.getMaxSeverity() && logger.getMaxSeverity() >= options['failure_level']) {
      code = 1
    }
    process.exit(code)
  }

  static requireLibrary (requirePath, cwd = process.cwd()) {
    if (requirePath.charAt(0) === '.' && DOT_RELATIVE_RX.test(requirePath)) {
      // NOTE require resolves a dot-relative path relative to current file; resolve relative to cwd instead
      requirePath = ospath.resolve(requirePath)
    } else if (!ospath.isAbsolute(requirePath)) {
      // NOTE appending node_modules prevents require from looking elsewhere before looking in these paths
      const paths = [cwd, ospath.dirname(__dirname)].map((start) => ospath.join(start, 'node_modules'))
      requirePath = require.resolve(requirePath, { paths })
    }
    return require(requirePath)
  }

  static prepareProcessor (argv, asciidoctor) {
    const requirePaths = argv['require']
    if (requirePaths) {
      requirePaths.forEach((requirePath) => {
        const lib = Invoker.requireLibrary(requirePath)
        if (lib && typeof lib.register === 'function') {
          // REMIND: it could be an extension or a converter.
          // the register function on a converter does not take any argument
          // but the register function on an extension expects one argument (the extension registry)
          // Until we revisit the API for extension and converter, we pass the registry as the first argument
          lib.register(asciidoctor.Extensions)
        }
      })
    }
  }
}

module.exports = Invoker
module.exports.asciidoctor = asciidoctor
