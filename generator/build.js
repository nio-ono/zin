const fs = require('fs');
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

compileEJSToHTML(paths);

function buildSite() {
  deleteDirectoryContents(paths.public);
  if (!fs.existsSync(path.join(paths.public, 'styles'))) {
    fs.mkdirSync(path.join(paths.public, 'styles'), { recursive: true });
  }
  compileEJSToHTML(paths);
  compileSASSToCSS(paths);
}

buildSite();

module.exports = buildSite;
