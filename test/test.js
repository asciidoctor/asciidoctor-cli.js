const chai = require('chai')
const argsParser = require('../lib/cli.js').argsParser()
const optionsConverter = require('../lib/cli.js').convertOptions
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
  it('should convert a list of default values to a list of Asciidoctor options', () => {
    const options = optionsConverter(argsParser.parse(''))
    expect(options['backend']).to.equal('html5')
    expect(options['doctype']).to.equal('article')
    expect(options['safe']).to.equal('unsafe')
    expect(options['header_footer']).to.be.true()
    expect(options['verbose']).to.equal(1)
    expect(options['timings']).to.be.false()
    expect(options['trace']).to.be.false()
    expect(options['mkdirs']).to.be.true()
    expect(options['attributes']).to.be.empty()
  })

  it('should convert a list of default attributes to a list of Asciidoctor options', () => {
    const args = argsParser.parse('one.adoc -a source-highlighter=highlight.js --attribute icons=font@ -a lang=fr')
    const options = optionsConverter(args)
    expect(options['backend']).to.equal('html5')
    expect(options['doctype']).to.equal('article')
    expect(options['safe']).to.equal('unsafe')
    expect(options['header_footer']).to.be.true()
    expect(options['verbose']).to.equal(1)
    expect(options['timings']).to.be.false()
    expect(options['trace']).to.be.false()
    expect(options['mkdirs']).to.be.true()
    expect(options['attributes']).to.have.length(3)
    expect(options['attributes']).to.include('source-highlighter=highlight.js')
    expect(options['attributes']).to.include('icons=font@')
    expect(options['attributes']).to.include('lang=fr')
  })
})
