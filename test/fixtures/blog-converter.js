class BlogConverter {
  convert () {
    return '<blog></blog>';
  }
}

module.exports.register = function register () {
  Opal.Asciidoctor.ConverterFactory.register(new BlogConverter(), ['blog']);
}
