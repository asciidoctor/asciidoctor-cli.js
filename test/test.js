const chai = require('chai')
const sinon = require('sinon')
const path = require('path')
const argsParser = require('../lib/cli.js').argsParser()
const optionsConverter = require('../lib/cli.js').convertOptions
const processFiles = require('../lib/cli.js').processFiles
const expect = chai.expect
const dirtyChai = require('dirty-chai')
chai.use(dirtyChai)

describe('Arguments parser', () => {
  it('should parse a command with a single file', () => {
    const result = argsParser.parse('file.adoc')
    expect(result['files']).to.have.length(1)
    expect(result['files']).to.include('file.adoc')
    expect(result['verbose']).to.be.false() // default value
  })

  it('should parse a command with the verbose attribute', () => {
    const result = argsParser.parse('file.adoc --verbose')
    expect(result['files']).to.have.length(1)
    expect(result['files']).to.include('file.adoc')
    expect(result['verbose']).to.be.true()
  })

  it('should parse a command with multiple files', () => {
    const result = argsParser.parse('one.adoc two.adoc')
    expect(result['files']).to.have.length(2)
    expect(result['files']).to.include('one.adoc')
    expect(result['files']).to.include('two.adoc')
  })

  it('should parse a command with multiple attributes', () => {
    const result = argsParser.parse('one.adoc -a source-highlighter=highlight.js --attribute icons=font@ -a lang=fr')
    expect(result['files']).to.have.length(1)
    expect(result['files']).to.include('one.adoc')
    expect(result['attribute']).to.have.length(3)
    expect(result['attribute']).to.include('source-highlighter=highlight.js')
    expect(result['attribute']).to.include('icons=font@')
    expect(result['attribute']).to.include('lang=fr')
  })
})

describe('Options converter', () => {
  it('should have default options', () => {
    const options = optionsConverter(argsParser.parse(''))
    expect(options['backend']).to.equal('html5')
    expect(options['doctype']).to.equal('article')
    expect(options['safe']).to.equal('unsafe')
    expect(options['standalone']).to.be.true()
    expect(options['verbose']).to.equal(1)
    expect(options['timings']).to.be.false()
    expect(options['trace']).to.be.false()
    expect(options['mkdirs']).to.be.true()
    expect(options['attributes']).to.be.empty()
    expect(options['failure_level']).to.equal(4)
  })

  it('should set the attributes option', () => {
    const args = argsParser.parse('one.adoc -a source-highlighter=highlight.js --attribute icons=font@ -a lang=fr')
    const options = optionsConverter(args)
    expect(options['attributes']).to.have.length(3)
    expect(options['attributes']).to.include('source-highlighter=highlight.js')
    expect(options['attributes']).to.include('icons=font@')
    expect(options['attributes']).to.include('lang=fr')
  })

  it('should set the standalone option to false if --embedded option is present', () => {
    const args = argsParser.parse('one.adoc --embedded')
    const options = optionsConverter(args)
    expect(options['standalone']).to.be.false()
  })

  it('should set standalone option to false if -e option is present', () => {
    const args = argsParser.parse('one.adoc -e')
    const options = optionsConverter(args)
    expect(options['standalone']).to.be.false()
  })

  it('should set standalone option to false if --no-header-footer option is present', () => {
    const args = argsParser.parse('one.adoc --no-header-footer')
    const options = optionsConverter(args)
    expect(options['standalone']).to.be.false()
  })

  it('should set standalone option to false if -s option is present', () => {
    const args = argsParser.parse('one.adoc -s')
    const options = optionsConverter(args)
    expect(options['standalone']).to.be.false()
  })

  // DEBUG: 0
  // INFO: 1
  // WARN: 2
  // ERROR: 3
  // FATAL: 4
  it('should set failure level option to INFO', () => {
    const args = argsParser.parse('one.adoc --failure-level info')
    const options = optionsConverter(args)
    expect(options['failure_level']).to.equal(1)
  })

  it('should set failure level option to WARNING', () => {
    const args = argsParser.parse('one.adoc --failure-level WARNING')
    const options = optionsConverter(args)
    expect(options['failure_level']).to.equal(2)
  })

  it('should set failure level option to WARN', () => {
    const args = argsParser.parse('one.adoc --failure-level WARN')
    const options = optionsConverter(args)
    expect(options['failure_level']).to.equal(2)
  })

  it('should set failure level option to ERROR', () => {
    const args = argsParser.parse('one.adoc --failure-level error')
    const options = optionsConverter(args)
    expect(options['failure_level']).to.equal(3)
  })
})

describe('Process files', () => {
  // Asciidoctor will log an ERROR when processing book.adoc:
  // asciidoctor: ERROR: book.adoc: line 8: invalid part, must have at least one section (e.g., chapter, appendix, etc.)
  const bookFilePath = path.join(__dirname, 'fixtures', 'book.adoc')
  it('should exit with code 1 when failure level is lower than the maximum logging level', () => {
    sinon.stub(process, 'exit')
    try {
      processFiles([bookFilePath], false, false, { failure_level: 3 }) // ERROR: 3
      expect(process.exit.called).to.be.true()
      expect(process.exit.calledWith(1)).to.be.true()
    } finally {
      process.exit.restore()
    }
  })
  it('should exit with code 0 when failure level is lower than the maximum logging level', () => {
    sinon.stub(process, 'exit')
    try {
      processFiles([bookFilePath], false, false, { failure_level: 4 }) // FATAL: 4
      expect(process.exit.called).to.be.true()
      expect(process.exit.calledWith(0)).to.be.true()
    } finally {
      process.exit.restore()
    }
  })
})
