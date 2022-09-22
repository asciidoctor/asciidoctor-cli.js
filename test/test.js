/* global Opal */
const chai = require('chai')
const sinon = require('sinon')
const path = require('path')
const childProcess = require('child_process')
const expect = chai.expect
const dirtyChai = require('dirty-chai')
chai.use(dirtyChai)

const stdin = require('../lib/stdin')
const { processor, Options, Invoker } = require('../lib/cli.js')
const defaultOptions = new Options()
const argsParser = defaultOptions.argsParser()

describe('Arguments parser', () => {
  it('should parse a command with a single file', () => {
    const result = argsParser.parse('file.adoc')
    expect(result.files).to.have.length(1)
    expect(result.files).to.include('file.adoc')
    expect(result.verbose).to.be.false() // default value
  })

  it('should parse a command with the verbose attribute', () => {
    const result = argsParser.parse('file.adoc --verbose')
    expect(result.files).to.have.length(1)
    expect(result.files).to.include('file.adoc')
    expect(result.verbose).to.be.true()
  })

  it('should parse a command with multiple files', () => {
    const result = argsParser.parse('one.adoc two.adoc')
    expect(result.files).to.have.length(2)
    expect(result.files).to.include('one.adoc')
    expect(result.files).to.include('two.adoc')
  })

  it('should parse a command with multiple attributes', () => {
    const result = argsParser.parse('one.adoc -a source-highlighter=highlight.js --attribute icons=font@ -a lang=fr')
    expect(result.files).to.have.length(1)
    expect(result.files).to.include('one.adoc')
    expect(result.attribute).to.have.length(3)
    expect(result.attribute).to.include('source-highlighter=highlight.js')
    expect(result.attribute).to.include('icons=font@')
    expect(result.attribute).to.include('lang=fr')
  })
})

describe('Options converter', () => {
  it('should have default options', () => {
    const options = defaultOptions.parse('').options
    expect(options.backend).to.be.undefined()
    expect(options.doctype).to.be.undefined()
    expect(options.safe).to.equal('unsafe')
    expect(options.standalone).to.be.true()
    expect(options.verbose).to.equal(1)
    expect(options.timings).to.be.false()
    expect(options.trace).to.be.false()
    expect(options.mkdirs).to.be.true()
    expect(options.attributes).to.be.empty()
    expect(options.failure_level).to.equal(4)
  })

  it('should set the attributes option', () => {
    const options = defaultOptions.parse('one.adoc -a source-highlighter=highlight.js --attribute icons=font@ -a lang=fr').options
    expect(options.attributes).to.have.length(3)
    expect(options.attributes).to.include('source-highlighter=highlight.js')
    expect(options.attributes).to.include('icons=font@')
    expect(options.attributes).to.include('lang=fr')
  })

  it('should set the standalone option to false if --embedded option is present', () => {
    const options = defaultOptions.parse('one.adoc --embedded').options
    expect(options.standalone).to.be.false()
  })

  it('should set standalone option to false if -e option is present', () => {
    const options = defaultOptions.parse('one.adoc -e').options
    expect(options.standalone).to.be.false()
  })

  it('should set standalone option to false if --no-header-footer option is present', () => {
    const options = defaultOptions.parse('one.adoc --no-header-footer').options
    expect(options.standalone).to.be.false()
  })

  it('should set standalone option to false if -s option is present', () => {
    const options = defaultOptions.parse('one.adoc -s').options
    expect(options.standalone).to.be.false()
  })

  // DEBUG: 0
  // INFO: 1
  // WARN: 2
  // ERROR: 3
  // FATAL: 4
  it('should set failure level option to INFO', () => {
    const options = defaultOptions.parse('one.adoc --failure-level info').options
    expect(options.failure_level).to.equal(1)
  })

  it('should set failure level option to WARNING', () => {
    const options = defaultOptions.parse('one.adoc --failure-level WARNING').options
    expect(options.failure_level).to.equal(2)
  })

  it('should set failure level option to WARN', () => {
    const options = defaultOptions.parse('one.adoc --failure-level WARN').options
    expect(options.failure_level).to.equal(2)
  })

  it('should set failure level option to ERROR', () => {
    const options = defaultOptions.parse('one.adoc --failure-level error').options
    expect(options.failure_level).to.equal(3)
  })
})

describe('Read from stdin', () => {
  it('should read from stdin', async () => {
    sinon.stub(stdin, 'read').resolves('An *AsciiDoc* input')
    sinon.stub(processor, 'convert')
    sinon.stub(process, 'exit')
    sinon.stub(process.stdout, 'end').callsFake(() => {
      setImmediate(() => process.stdout.emit('close'))
      return process.stdout
    })
    try {
      await new Invoker(defaultOptions.parse(['/path/to/node', '/path/to/asciidoctor', '-'])).invoke()
      expect(stdin.read.called).to.be.true()
      expect(processor.convert.called).to.be.true()
      const firstArgument = processor.convert.getCall(0).args[0]
      const secondArgument = processor.convert.getCall(0).args[1]
      expect(firstArgument).to.equal('An *AsciiDoc* input')
      expect(secondArgument.to_file).to.equal(Opal.gvars.stdout)
    } finally {
      stdin.read.restore()
      processor.convert.restore()
      process.exit.restore()
      process.stdout.end.restore()
    }
  })
})

describe('Write to stdout', () => {
  async function itShouldWriteToStdout (args) {
    sinon.stub(process.stdout, 'write')
    sinon.stub(process, 'exit')
    sinon.stub(process.stdout, 'end').callsFake(() => {
      setImmediate(() => process.stdout.emit('close'))
      return process.stdout
    })
    try {
      const file = path.join(__dirname, 'fixtures', 'sample.adoc')
      await new Invoker(new Options().parse(['node', 'asciidoctor', file, ...args])).invoke()
      expect(process.stdout.write.called).to.be.true()
      const output = process.stdout.write.getCall(0).args[0]
      expect(output).to.includes('<!DOCTYPE html>')
      expect(output).to.includes('<h1>Title</h1>')
    } finally {
      process.stdout.write.restore()
      process.exit.restore()
      process.stdout.end.restore()
    }
  }

  it('should write to stdout with -o -', async () => {
    await itShouldWriteToStdout(['-o', '-'])
  })
  it('should write to stdout with -o \'\'', async () => {
    await itShouldWriteToStdout(['-o', '\'\''])
  })
  it('should write to stdout with --out-file -', async () => {
    await itShouldWriteToStdout(['--out-file', '-'])
  })
  it('should write to stdout with --out-file \'\'', async () => {
    await itShouldWriteToStdout(['--out-file', '\'\''])
  })
  it('should write a large output to stdout', async () => {
    const file = path.join(__dirname, 'fixtures', 'large.adoc')
    const process = childProcess.spawn(path.join(__dirname, '..', 'bin', 'asciidoctor'), [file, '-o', '-'])
    let data = ''
    process.stdout.on('data', (chunk) => {
      data += chunk
    })
    await new Promise((resolve, reject) => {
      process.on('close', (code) => {
        expect(data.length).to.gte(496000, 'data is truncated')
        resolve({})
      })
    })
  })
})

describe('Help', () => {
  beforeEach(() => {
    sinon.stub(process, 'exit')
    sinon.stub(process.stdout, 'end').callsFake(() => {
      setImmediate(() => process.stdout.emit('close'))
      return process.stdout
    })
  })
  afterEach(() => {
    process.exit.restore()
    process.stdout.end.restore()
  })

  it('should show an overview of the AsciiDoc syntax', () => {
    sinon.stub(console, 'log')
    try {
      new Invoker(defaultOptions.parse(['/path/to/node', '/path/to/asciidoctor', '--help', 'syntax'])).invoke()
      expect(process.exit.called).to.be.true()
      expect(process.exit.calledWith(0)).to.be.true()
      expect(console.log.called).to.be.true()
      const asciidocSyntax = console.log.getCall(0).args[0]
      expect(asciidocSyntax).to.includes('thematic break')
      expect(asciidocSyntax).to.includes('admonition')
    } finally {
      console.log.restore()
    }
  })

  it('should show --help option on command usage', () => {
    sinon.stub(console, 'error')
    try {
      new Invoker(defaultOptions.parse(['/path/to/node', '/path/to/asciidoctor', '--help'])).invoke()
      expect(process.exit.called).to.be.true()
      expect(process.exit.calledWith(0)).to.be.true()
      expect(console.error.called).to.be.true()
      const usage = console.error.getCall(0).args[0]
      expect(usage).to.includes('--help')
      expect(usage).to.includes('show an overview of the AsciiDoc syntax if TOPIC is syntax')
    } finally {
      console.error.restore()
    }
  })

  it('should show --version option on command usage', () => {
    sinon.stub(console, 'error')
    try {
      new Invoker(defaultOptions.parse(['/path/to/node', '/path/to/asciidoctor', '--help'])).invoke()
      expect(process.exit.called).to.be.true()
      expect(process.exit.calledWith(0)).to.be.true()
      expect(console.error.called).to.be.true()
      const usage = console.error.getCall(0).args[0]
      expect(usage).to.includes('--version')
      expect(usage).to.includes('display the version and runtime environment (or -v if no other flags or arguments)')
    } finally {
      console.error.restore()
    }
  })
})

describe('Print timings report', () => {
  beforeEach(() => {
    sinon.stub(process, 'exit')
    sinon.stub(process.stdout, 'end').callsFake(() => {
      setImmediate(() => process.stdout.emit('close'))
      return process.stdout
    })
  })
  afterEach(() => {
    process.exit.restore()
    process.stdout.end.restore()
  })

  it('should print timings report', () => {
    sinon.stub(process.stdout, 'write')
    sinon.stub(process.stderr, 'write')
    try {
      const file = path.join(__dirname, 'fixtures', 'sample.adoc')
      new Invoker(defaultOptions.parse(['node', 'asciidoctor', file, '--timings', '-o', '-'])).invoke()
      expect(process.stderr.write.called).to.be.true()
      expect(process.stderr.write.getCall(0).args[0]).to.equal(`Input file: ${file}`)
      expect(process.stderr.write.getCall(1).args[0]).to.include('Time to read and parse source:')
      expect(process.stderr.write.getCall(2).args[0]).to.include('Time to convert document:')
      expect(process.stderr.write.getCall(3).args[0]).to.include('Total time (read, parse and convert):')
    } finally {
      process.stdout.write.restore()
      process.stderr.write.restore()
    }
  })
})

describe('Version', () => {
  beforeEach(() => {
    sinon.stub(process, 'exit')
    sinon.stub(process.stdout, 'end').callsFake(() => {
      setImmediate(() => process.stdout.emit('close'))
      return process.stdout
    })
  })
  afterEach(() => {
    process.exit.restore()
    process.stdout.end.restore()
  })

  it('should print version if -v is specified as sole argument', () => {
    sinon.stub(console, 'log')
    try {
      new Invoker(defaultOptions.parse(['/path/to/node', '/path/to/asciidoctor', '-v'])).invoke()
      expect(process.exit.called).to.be.true()
      expect(process.exit.calledWith(0)).to.be.true()
      expect(console.log.called).to.be.true()
      const version = console.log.getCall(0).args[0]
      expect(version).to.include('Asciidoctor.js')
      expect(version).to.include('Runtime Environment')
      expect(version).to.include('CLI version')
      expect(version).to.not.include('options {')
      expect(version).to.not.include('destination-dir')
    } finally {
      console.log.restore()
    }
  })

  it('should print a custom version if -v is specified as sole argument', () => {
    sinon.stub(console, 'log')
    try {
      class CustomInvoker extends Invoker {
        version () {
          return `Asciidoctor reveal.js 3.0.1 using ${super.version()}`
        }
      }

      new CustomInvoker(defaultOptions.parse(['/path/to/node', '/path/to/asciidoctor', '-v'])).invoke()
      expect(process.exit.called).to.be.true()
      expect(process.exit.calledWith(0)).to.be.true()
      expect(console.log.called).to.be.true()
      const version = console.log.getCall(0).args[0]
      expect(version).to.include('reveal.js 3.0.1')
      expect(version).to.include('Asciidoctor.js')
      expect(version).to.include('Runtime Environment')
      expect(version).to.include('CLI version')
      expect(version).to.not.include('options {')
      expect(version).to.not.include('destination-dir')
    } finally {
      console.log.restore()
    }
  })
})

describe('Process files', () => {
  beforeEach(() => {
    sinon.stub(process, 'exit')
    sinon.stub(process.stdout, 'end').callsFake(() => {
      setImmediate(() => process.stdout.emit('close'))
      return process.stdout
    })
  })
  afterEach(() => {
    process.exit.restore()
    process.stdout.end.restore()
  })

  // Asciidoctor will log an ERROR when processing book.adoc:
  // asciidoctor: ERROR: book.adoc: line 8: invalid part, must have at least one section (e.g., chapter, appendix, etc.)
  const bookFilePath = path.join(__dirname, 'fixtures', 'book.adoc')
  it('should exit with code 1 when failure level is lower than the maximum logging level', async () => {
    Invoker.processFiles([bookFilePath], false, false)
    await Invoker.exit(3) // ERROR: 3
    expect(process.exit.called).to.be.true()
    expect(process.exit.calledWith(1)).to.be.true()
  })

  it('should exit with code 0 when failure level is lower than the maximum logging level', async () => {
    Invoker.processFiles([bookFilePath], false, false)
    await Invoker.exit(4) // FATAL: 4
    expect(process.exit.called).to.be.true()
    expect(process.exit.calledWith(0)).to.be.true()
  })
})

describe('Require option', () => {
  it('should require an extension library', () => {
    const asciidoctor = require('@asciidoctor/core')()
    try {
      expect(Object.keys(asciidoctor.Extensions.getGroups()).length).to.equal(0)
      Invoker.prepareProcessor(argsParser.parse('one.adoc -r ./test/fixtures/shout-ext.js'), asciidoctor)
      expect(Object.keys(asciidoctor.Extensions.getGroups()).length).to.equal(1)
    } finally {
      asciidoctor.Extensions.unregisterAll()
    }
  })

  it('should require a converter library', () => {
    const asciidoctor = require('@asciidoctor/core')()
    try {
      asciidoctor.convert('Hello', { backend: 'blog' })
      expect.fail('blog backend should be missing')
    } catch (e) {
      expect(e.message).to.equal('asciidoctor: FAILED: missing converter for backend \'blog\'. Processing aborted.')
    }
    Invoker.prepareProcessor(argsParser.parse('one.adoc -r ./test/fixtures/blog-converter.js'), asciidoctor)
    const html = asciidoctor.convert('Hello', { backend: 'blog' })
    expect(html).to.equal('<blog></blog>')
  })
})

describe('Template directory', () => {
  it('should parse a command with a single template directory', () => {
    const result = argsParser.parse('--template-dir /path/to/templates file.adoc')
    expect(result.files).to.have.length(1)
    expect(result.files).to.include('file.adoc')
    expect(result['template-dir']).to.have.length(1)
    expect(result['template-dir']).to.include('/path/to/templates')
  })

  it('should parse a command with a multiple template directories', () => {
    const result = argsParser.parse('--template-dir=/path/to/templates -T /path/to/others file.adoc')
    expect(result.files).to.have.length(1)
    expect(result.files).to.include('file.adoc')
    expect(result['template-dir']).to.have.length(2)
    expect(result['template-dir']).to.include('/path/to/templates')
    expect(result['template-dir']).to.include('/path/to/others')
  })
  it('should set template_dirs option when --template-dir is defined', () => {
    const opts = defaultOptions.parse('node asciidoctor --template-dir /path/to/templates -b html5 file.adoc')
    expect(opts.options.backend).to.equal('html5')
    expect(opts.options.template_dirs).to.have.length(1)
    expect(opts.options.template_dirs).to.include('/path/to/templates')
  })
})

describe('Template engine', () => {
  it('should parse a command with the --template-engine argument', () => {
    const result = argsParser.parse('--template-engine=nunjucks -a foo=bar file.adoc')
    expect(result.files).to.have.length(1)
    expect(result.files).to.include('file.adoc')
    expect(result.attribute).to.have.length(1)
    expect(result.attribute).to.include('foo=bar')
    expect(result['template-engine']).to.eq('nunjucks')
  })
  it('should parse a command with the -E argument', () => {
    const result = argsParser.parse('-E nunjucks -a foo=bar file.adoc')
    expect(result.files).to.have.length(1)
    expect(result.files).to.include('file.adoc')
    expect(result.attribute).to.have.length(1)
    expect(result.attribute).to.include('foo=bar')
    expect(result['template-engine']).to.eq('nunjucks')
  })
  it('should set the template_engine option when the -E argument is defined', () => {
    const opts = defaultOptions.parse('node asciidoctor -E pug -b html5 file.adoc')
    expect(opts.options.backend).to.equal('html5')
    expect(opts.options.template_engine).to.equal('pug')
  })
})
describe('Array option', () => {
  it('should parse a command with a list of attributes just before a positional argument', () => {
    const result = argsParser.parse('-a foo=bar -a baz=quz file.adoc')
    expect(result.files).to.have.length(1)
    expect(result.files).to.include('file.adoc')
    expect(result.attribute).to.have.length(2)
    expect(result.attribute).to.include('foo=bar')
    expect(result.attribute).to.include('baz=quz')
  })
  it('should parse a command with a list of attributes and requires just before a positional argument', () => {
    const result = argsParser.parse('--attribute foo=bar -a baz=quz -r ./ext.js --require @asciidoctor/reveal.js-converter file.adoc')
    expect(result.files).to.have.length(1)
    expect(result.files).to.include('file.adoc')
    expect(result.attribute).to.have.length(2)
    expect(result.attribute).to.include('foo=bar')
    expect(result.attribute).to.include('baz=quz')
    expect(result.require).to.have.length(2)
    expect(result.require).to.include('./ext.js')
    expect(result.require).to.include('@asciidoctor/reveal.js-converter')
  })
})

describe('Options', () => {
  it('should create options', () => {
    const opts = defaultOptions.parse('node asciidoctor -a foo=bar -b html5')
    expect(opts.options.backend).to.equal('html5')
    expect(opts.options.attributes).to.include('foo=bar')
  })
  it('should create options with a default backend', () => {
    const opts = new Options({ backend: 'pdf' }).parse('node asciidoctor -a foo=bar')
    expect(opts.options.backend).to.equal('pdf')
    expect(opts.options.attributes).to.include('foo=bar')
  })
  it('should create options with a default backend overridden by a command line argument', () => {
    const opts = new Options({ backend: 'pdf' }).parse('node asciidoctor -a foo=bar -b html5')
    expect(opts.options.backend).to.equal('html5')
    expect(opts.options.attributes).to.include('foo=bar')
  })
  it('should create options with a default list of attributes', () => {
    const opts = new Options({ attributes: { foo: 'baz', nofooter: true } }).parse('node asciidoctor -a foo=bar -b html5')
    expect(opts.options.backend).to.equal('html5')
    const attributes = opts.options.attributes
    expect(attributes).to.include('foo=bar')
    expect(attributes).to.include('nofooter=true')
    expect(attributes).to.include('foo=baz')
  })
  it('should create options with a default list of attributes', () => {
    const opts = new Options({ attributes: { foo: 'baz', nofooter: true } }).parse('node asciidoctor -a foo=bar -b html5')
    expect(opts.options.backend).to.equal('html5')
    const attributes = opts.options.attributes
    expect(attributes).to.include('foo=bar')
    expect(attributes).to.include('nofooter=true')
    expect(attributes).to.include('foo=baz')
  })
})

describe('Extend', () => {
  it('should not recognize an unknown option', () => {
    const opts = defaultOptions.parse('node asciidoctor -a foo=bar -b html5')
    expect(opts.args.watch).to.be.undefined()
    expect(opts.options.backend).to.equal('html5')
    expect(opts.options.attributes).to.include('foo=bar')
  })
  it('should add option to the command (default value)', () => {
    const opts = defaultOptions
      .addOption('watch', {
        alias: 'w',
        default: false,
        describe: 'enable watch mode',
        type: 'boolean'
      })
      .parse('node asciidoctor -a foo=bar -b html5')
    expect(opts.args.watch).to.equal(false)
    expect(opts.options.backend).to.equal('html5')
    expect(opts.options.attributes).to.include('foo=bar')
  })
  it('should add option to the command', () => {
    const opts = defaultOptions
      .addOption('watch', {
        alias: 'w',
        default: false,
        describe: 'enable watch mode',
        type: 'boolean'
      })
      .parse('node asciidoctor -a foo=bar -b html5 --watch')
    expect(opts.args.watch).to.equal(true)
    expect(opts.options.backend).to.equal('html5')
    expect(opts.options.attributes).to.include('foo=bar')
  })
})

describe('Convert', () => {
  it('should convert using a custom doctype (defined as document attribute)', () => {
    const file = path.join(__dirname, 'fixtures', 'doctype.adoc')
    const options = defaultOptions.parse(['node', 'asciidoctor', file, '-s'])
    const asciidoctor = require('@asciidoctor/core')()
    const asciidoctorOptions = options.options
    Object.assign(asciidoctorOptions, { to_file: false })
    const result = asciidoctor.convertFile(file, asciidoctorOptions)
    expect(result).to.have.string('<p>book</p>')
  })

  it('should convert using the default backend (html5)', () => {
    const asciidoctor = require('@asciidoctor/core')()
    const file = path.join(__dirname, 'fixtures', 'sample.adoc')
    const options = defaultOptions.parse(['node', 'asciidoctor', file, '-s'])
    const asciidoctorOptions = options.options
    Object.assign(asciidoctorOptions, { to_file: false })
    Invoker.prepareProcessor(argsParser.parse(file), asciidoctor)
    const html = asciidoctor.convertFile(file, asciidoctorOptions)
    expect(html).to.include(`<div class="sectionbody">
<div class="paragraph">
<p>This is a paragraph.</p>
</div>
</div>`)
  })

  it('should convert using a custom backend (defined as document attribute)', () => {
    const asciidoctor = require('@asciidoctor/core')()
    const file = path.join(__dirname, 'fixtures', 'backend.adoc')
    const options = new Options().parse(['node', 'asciidoctor', file, '-s'])
    const asciidoctorOptions = options.options
    Object.assign(asciidoctorOptions, { to_file: false })
    Invoker.prepareProcessor(argsParser.parse('one.adoc -r ./test/fixtures/revealjs-converter.js'), asciidoctor)
    const html = asciidoctor.convertFile(file, asciidoctorOptions)
    expect(html).to.equal('<revealjs><p>revealjs</p></revealjs>')
  })
})
