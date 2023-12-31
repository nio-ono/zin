const fs = require('fs-extra'); // Switch to fs-extra for convenience
const path = require('path');
const siteConfig = require('../config');

// Import the modules
const { deleteDirectoryContents, getFilesInDir } = require('./fileOps');
const { buildCollections } = require('./collections');
const { renderPage, compileEJSToHTML } = require('./renderer');
const { compileSASSToCSS } = require('./styles');

// Compute Absolute Paths
const paths = {
  source: siteConfig.server.paths.source,
  public: siteConfig.server.paths.public,
  pages: path.join(siteConfig.server.paths.source, siteConfig.server.paths.sourcePaths.pages),
  templates: path.join(siteConfig.server.paths.source, siteConfig.server.paths.sourcePaths.templates),
  styles: path.join(siteConfig.server.paths.source, siteConfig.server.paths.sourcePaths.styles),
  scripts: path.join(siteConfig.server.paths.source, siteConfig.server.paths.sourcePaths.scripts),
  assets: path.join(siteConfig.server.paths.source, siteConfig.server.paths.sourcePaths.assets),
};

// Function to copy assets
async function copyAssets() {
  try {
    await fs.copy(paths.assets, path.join(paths.public, 'assets'));
    console.log('Assets have been copied to the public directory.');
  } catch (err) {
    console.error('An error occurred while copying assets:', err);
  }
}

// Function to copy scripts
async function copyScripts() {
  try {
    await fs.copy(paths.scripts, path.join(paths.public, 'scripts'));
    console.log('Scripts have been copied to the public directory.');
  } catch (err) {
    console.error('An error occurred while copying scripts:', err);
  }
}

async function buildSite() {
  // Delete existing files in the public directory
  await deleteDirectoryContents(paths.public);

  // Ensure the styles directory exists in public
  if (!await fs.exists(path.join(paths.public, 'styles'))) {
    await fs.mkdirp(path.join(paths.public, 'styles'));
  }

  // Run build tasks
  await compileEJSToHTML(paths);
  await compileSASSToCSS(paths);
  await copyAssets();
  await copyScripts();
}

// Build the site
buildSite().catch(console.error);

module.exports = buildSite;
