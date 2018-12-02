const shoutBlock = function () {
  const self = this
  self.named('shout')
  self.onContext('paragraph')
  self.process(function (parent, reader) {
    const lines = reader.getLines().map(l => l.toUpperCase())
    return self.createBlock(parent, 'paragraph', lines)
  })
}

module.exports.register = function register (registry) {
  if (typeof registry.register === 'function') {
    registry.register(function () {
      this.block(shoutBlock)
    })
  } else if (typeof registry.block === 'function') {
    registry.block(shoutBlock)
  }
  return registry
}
