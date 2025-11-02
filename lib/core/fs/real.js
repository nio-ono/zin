const fs = require('fs-extra');

function normalizeOptions(options) {
  if (!options) {
    return { recursive: true };
  }
  if (typeof options === 'object' && options !== null) {
    return { recursive: true, ...options };
  }
  return { recursive: true };
}

module.exports = {
  readFile: (target, options) => fs.readFile(target, options),
  writeFile: (target, data, options) => fs.writeFile(target, data, options),
  mkdir: (target, options) => fs.mkdir(target, normalizeOptions(options)),
  remove: (target) => fs.remove(target),
  readdir: (target) => fs.readdir(target),
  stat: (target) => fs.stat(target),
  pathExists: (target) => fs.pathExists(target),
};
