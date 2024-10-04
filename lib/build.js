const fs = require('fs-extra'); // Switch to fs-extra for convenience
const path = require('path');

// Dynamically require the project's config.js
const configPath = path.join(process.cwd(), 'config.js');
const config = require(configPath);

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
 * Function to copy arbitrary files that aren't handled by other compile processes
 */
async function copyExtraFiles() {
    const sourceDir = paths.source;
    const destDir = paths.public;

    // Directories to exclude from copying extra files
    const excludedDirs = new Set([
        paths.pages,
        paths.templates,
        paths.styles,
        paths.scripts,
        paths.assets
    ]);

    try {
        // Retrieve all files in the source directory recursively
        const allFiles = getFilesInDir(sourceDir);
        
        // Filter out files that are within the excluded directories
        const filesToCopy = allFiles.filter(filePath => {
            for (const excludeDir of excludedDirs) {
                if (filePath.startsWith(excludeDir + path.sep)) {
                    return false;
                }
            }
            return true;
        });

        // Copy each eligible file to the public directory, maintaining the directory structure
        for (const filePath of filesToCopy) {
            // Compute the relative path from the source directory
            const relativePath = path.relative(sourceDir, filePath);
            const destinationPath = path.join(destDir, relativePath);
            
            // Ensure the destination directory exists
            await fs.ensureDir(path.dirname(destinationPath));
            
            // Copy the file
            await fs.copy(filePath, destinationPath, { overwrite: true });
            console.log(`Copied: ${relativePath}`);
        }
    } catch (err) {
        console.error('An error occurred while copying extra files:', err);
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
        
        // Copy arbitrary extra files
        await copyExtraFiles();

        console.log('Site built successfully.');
    } catch (error) {
        console.error('An error occurred during the build process:', error);
    }
}

module.exports = buildSite;