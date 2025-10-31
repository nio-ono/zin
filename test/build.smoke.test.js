const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs-extra');
const { buildSite } = require('../lib/build');
const { loadConfig } = require('../lib/config');

/**
 * Resolves an absolute path inside the configured public directory.
 * @param {string} relativePath
 * @returns {string}
 */
function resolvePublicPath(relativePath) {
  const config = loadConfig();
  const publicDir = path.resolve(config.server.directories.public);
  return path.resolve(publicDir, relativePath);
}

test('buildSite generates expected public artifacts', async () => {
  await buildSite();

  const expected = [
    'index.html',
    'blog/bridges-to-nowhere/index.html',
    'styles/main.css',
  ].map((p) => resolvePublicPath(p));

  for (const target of expected) {
    const exists = await fs.pathExists(target);
    assert.ok(exists, `Expected ${target} to exist`);
  }
});
