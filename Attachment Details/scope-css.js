const fs = require('fs');
const postcss = require('postcss');
const prefixer = require('postcss-prefix-selector');

const css = fs.readFileSync('template.css', 'utf8');

const out = postcss().use(prefixer({
  prefix: '.attachment-manager-widget',
  exclude: [':root'],
  transform: function (prefix, selector, prefixedSelector, filePath, rule) {
    if (selector === ':root') {
      return '.attachment-manager-widget'; // Map :root vars directly to parent
    }
    if (selector === 'html' || selector === 'body') {
      return '.attachment-manager-widget'; // Map global body/html styling directly to parent
    }
    return prefixedSelector;
  }
})).process(css).css;

fs.writeFileSync('template.css', out);
console.log('CSS scoped successfully.');
