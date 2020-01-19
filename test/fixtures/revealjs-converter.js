class RevealJsConverter {
  constructor() {
    this.transforms = {
      embedded(node) {
        return `<revealjs>${node.getContent()}</revealjs>`
      },
      paragraph(node) {
        return `<p>${node.getContent()}</p>`
      }
    }
  }

  convert(node, transform, _) {
    const template = this.transforms[transform || node.getNodeName()];
    return template(node);
  }
}

module.exports.register = function register () {
  Opal.Asciidoctor.ConverterFactory.register(new RevealJsConverter(), ['revealjs']);
}
