const assert = require('assert')
const argsParser = require('../lib/cli.js').argsParser()
const optionsConverter = require('../lib/cli.js').convertOptions

describe('Arguments parser', () => {
  it('should parse a command with a single file', () => {
    const result = argsParser.parse('file.adoc')
    assert.strictEqual(result['files'].length, 1)
    assert.strictEqual(result['verbose'], false) // default value
  })

  it('should parse a command with the verbose attribute', () => {
    const result = argsParser.parse('file.adoc --verbose')
    assert.strictEqual(result['files'].length, 1)
    assert.strictEqual(result['verbose'], true)
  })

  it('should parse a command with multiple files', () => {
    const result = argsParser.parse('one.adoc two.adoc')
    assert.strictEqual(result['files'].length, 2)
    assert.strictEqual(result['files'].includes('one.adoc'), true)
    assert.strictEqual(result['files'].includes('two.adoc'), true)
  })

  it('should parse a command with multiple attributes', () => {
    const result = argsParser.parse('one.adoc -a source-highlighter=highlight.js --attribute icons=font@ -a lang=fr')
    assert.strictEqual(result['files'].length, 1)
    assert.strictEqual(result['files'].includes('one.adoc'), true)
    assert.strictEqual(result['attribute'].length, 3)
    assert.strictEqual(result['attribute'].includes('source-highlighter=highlight.js'), true)
    assert.strictEqual(result['attribute'].includes('icons=font@'), true)
    assert.strictEqual(result['attribute'].includes('lang=fr'), true)
  })
})

describe('Options converter', () => {
  it('should convert a list of default values to a list of Asciidoctor options', () => {
    const options = optionsConverter(argsParser.parse(''))
    assert.strictEqual(options['backend'], 'html5')
    assert.strictEqual(options['doctype'], 'article')
    assert.strictEqual(options['safe'], 'unsafe')
    assert.strictEqual(options['header_footer'], true)
    assert.strictEqual(options['verbose'], 1)
    assert.strictEqual(options['timings'], false)
    assert.strictEqual(options['trace'], false)
    assert.strictEqual(options['mkdirs'], true)
    assert.strictEqual(options['attributes'], '')
  })

  it('should convert a list of default attributes to a list of Asciidoctor options', () => {
    const args = argsParser.parse('one.adoc -a source-highlighter=highlight.js --attribute icons=font@ -a lang=fr')
    const options = optionsConverter(args)
    assert.strictEqual(options['backend'], 'html5')
    assert.strictEqual(options['doctype'], 'article')
    assert.strictEqual(options['safe'], 'unsafe')
    assert.strictEqual(options['header_footer'], true)
    assert.strictEqual(options['verbose'], 1)
    assert.strictEqual(options['timings'], false)
    assert.strictEqual(options['trace'], false)
    assert.strictEqual(options['mkdirs'], true)
    assert.strictEqual(options['attributes'].length, 3)
    assert.strictEqual(options['attributes'].includes('source-highlighter=highlight.js'), true)
    assert.strictEqual(options['attributes'].includes('icons=font@'), true)
    assert.strictEqual(options['attributes'].includes('lang=fr'), true)
  })
})
