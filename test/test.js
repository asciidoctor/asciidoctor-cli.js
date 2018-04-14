const assert = require('assert')
const argsParser = require('../lib/cli.js').argsParser()
const optionsConverter = require('../lib/cli.js').convertOptions

describe('Arguments parser', () => {
  it('should parse a command with a single file', () => {
    let result = argsParser.parse('file.adoc');
    assert.equal(result['files'].length, 1)
    assert.equal(result['verbose'], false) // default value
  })

  it('should parse a command with the verbose attribute', () => {
    let result = argsParser.parse('file.adoc --verbose');
    assert.equal(result['files'].length, 1)
    assert.equal(result['verbose'], true)
  })

  it('should parse a command with multiple files', () => {
    let result = argsParser.parse('one.adoc two.adoc');
    assert.equal(result['files'].length, 2)
    assert.equal(result['files'].includes('one.adoc'), true)
    assert.equal(result['files'].includes('two.adoc'), true)
  })

  it('should parse a command with multiple attributes', () => {
    let result = argsParser.parse('one.adoc -a source-highlighter=highlight.js --attribute icons=font@ -a lang=fr');
    assert.equal(result['files'].length, 1)
    assert.equal(result['files'].includes('one.adoc'), true)
    assert.equal(result['attribute'].length, 3)
    assert.equal(result['attribute'].includes('source-highlighter=highlight.js'), true)
    assert.equal(result['attribute'].includes('icons=font@'), true)
    assert.equal(result['attribute'].includes('lang=fr'), true)
  })
})

describe('Options converter', () => {
  it('should convert a list of default values to a list of Asciidoctor options', () => {
    let arguments = argsParser.parse('');
    let options = optionsConverter(arguments);
    assert.equal(options['backend'], 'html5')
    assert.equal(options['doctype'], 'article')
    assert.equal(options['safe'], 'unsafe')
    assert.equal(options['header_footer'], true)
    assert.equal(options['verbose'], 1)
    assert.equal(options['timings'], false)
    assert.equal(options['trace'], false)
    assert.equal(options['mkdirs'], true)
    assert.equal(options['attributes'], '')
  })

  it('should convert a list of default attributes to a list of Asciidoctor options', () => {
    let arguments = argsParser.parse('one.adoc -a source-highlighter=highlight.js --attribute icons=font@ -a lang=fr');
    let options = optionsConverter(arguments);
    assert.equal(options['backend'], 'html5')
    assert.equal(options['doctype'], 'article')
    assert.equal(options['safe'], 'unsafe')
    assert.equal(options['header_footer'], true)
    assert.equal(options['verbose'], 1)
    assert.equal(options['timings'], false)
    assert.equal(options['trace'], false)
    assert.equal(options['mkdirs'], true)
    assert.equal(options['attributes'].length, 3)
    assert.equal(options['attributes'].includes('source-highlighter=highlight.js'), true)
    assert.equal(options['attributes'].includes('icons=font@'), true)
    assert.equal(options['attributes'].includes('lang=fr'), true)
  })
});
