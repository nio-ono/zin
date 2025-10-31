const CONFIG_BLOCK_REGEX = /@config\s*([\s\S]*?)\s*@config/gm;

function extractConfigBlock(src) {
  const match = CONFIG_BLOCK_REGEX.exec(src);
  if (!match) {
    return null;
  }
  return match[1];
}

function stripComments(input) {
  return input
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function parseJsonish(source) {
  const stripped = stripComments(source);
  return JSON.parse(stripped);
}

module.exports = { extractConfigBlock, stripComments, parseJsonish };
