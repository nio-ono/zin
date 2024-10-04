const fs = require('fs-extra'); // Switch to fs-extra for convenience
const path = require('path');
const config = require('../config');

// Import the modules
const { deleteDirectoryContents, getFilesInDir } = require('./fileOps');
const { buildCollections } = require('./collections');
const { renderPage, compileEJSToHTML } = require('./renderer');
const { compileSASSToCSS } = require('./styles');

// Compute Absolute Paths
const paths = {
  source: path.resolve(config.server.paths.source),
  public: path.resolve(config.server.paths.public),
  pages: path.resolve(config.server.paths.source, config.server.paths.sourcePaths.pages),
  templates: path.resolve(config.server.paths.source, config.server.paths.sourcePaths.templates),
  styles: path.resolve(config.server.paths.source, config.server.paths.sourcePaths.styles),
  scripts: path.resolve(config.server.paths.source, config.server.paths.sourcePaths.scripts),
  assets: path.resolve(config.server.paths.source, config.server.paths.sourcePaths.assets),
};

// Function to copy assets
async function copyAssets() {
    if (await fs.pathExists(paths.assets)) {
      try {
        // Ensure the target directory exists
        await fs.ensureDir(path.join(paths.public, 'assets'));
        await fs.copy(paths.assets, path.join(paths.public, 'assets'), { overwrite: true });
        console.log('Assets have been copied to the public directory.');
      } catch (err) {
        console.error('An error occurred while copying assets:', err);
      }
    } else {
      console.log('Assets directory does not exist. Skipping asset copy.');
    }
}

// Function to copy scripts
async function copyScripts() {
    if (await fs.pathExists(paths.scripts)) {
        try {
            // Ensure the target directory exists
            await fs.ensureDir(path.join(paths.public, 'scripts'));
            await fs.copy(paths.scripts, path.join(paths.public, 'scripts'), { overwrite: true });
            console.log('Scripts have been copied to the public directory.');
        } catch (err) {
            console.error('An error occurred while copying scripts:', err);
        }
    } else {
        console.log('Scripts directory does not exist. Skipping script copy.');
    }
}

/**
 * Builds the entire site by running all necessary tasks.
 */
async function buildSite() {
    try {
        console.log('Starting site build...');
        
        // Clear the require cache for globals.js to ensure updated values are used
        delete require.cache[require.resolve('../source/globals.js')];
        console.log('Cleared require cache for globals.js');

        // Delete existing files in the public directory
        await deleteDirectoryContents(paths.public);
        console.log('Deleted existing public directory contents.');

        // Ensure the styles directory exists in public
        await fs.ensureDir(path.join(paths.public, 'styles'));
        console.log('Ensured styles directory exists in public.');

        // Run build tasks
        await compileEJSToHTML(paths, true); // Force rebuild by passing true
        await compileSASSToCSS(paths);
        await copyAssets();
        await copyScripts();

        console.log('Site built successfully.');
    } catch (error) {
        console.error('An error occurred during the build process:', error);
    }
}

module.exports = buildSite;