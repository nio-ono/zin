const fs = require('fs-extra');
const path = require('path');
const ejs = require('ejs');
const sass = require('sass');
const { deleteDirectoryContents, getFilesInDir } = require('./fileOps');
const { buildCollections, getCollectionName } = require('./collections');
const { compileEJSToHTML } = require('./renderer');
const { compileSASSToCSS } = require('./styles');

async function buildSite() {
    try {
        console.log('Starting site build...');
        
        // Load project-specific config and globals
        const configPath = path.join(process.cwd(), 'config.js');
        const config = require(configPath);
        const globals = require(path.join(process.cwd(), 'globals.js'));

        const paths = {
            source: path.resolve(config.server.paths.source),
            public: path.resolve(config.server.paths.public),
            pages: path.resolve(config.server.paths.source, config.server.paths.sourcePaths.pages),
            templates: path.resolve(config.server.paths.source, config.server.paths.sourcePaths.templates),
            styles: path.resolve(config.server.paths.source, config.server.paths.sourcePaths.styles),
            scripts: path.resolve(config.server.paths.source, config.server.paths.sourcePaths.scripts),
            assets: path.resolve(config.server.paths.source, config.server.paths.sourcePaths.assets),
        };

        // Delete existing public directory contents
        await deleteDirectoryContents(paths.public);
        console.log('Deleted existing public directory contents.');

        // Ensure necessary public directories exist
        await fs.ensureDir(path.join(paths.public, 'styles'));
        await fs.ensureDir(path.join(paths.public, 'scripts'));
        await fs.ensureDir(path.join(paths.public, 'assets'));

        // Compile EJS to HTML
        await compileEJSToHTML(paths, globals);

        // Compile SASS to CSS
        await compileSASSToCSS(paths);

        // Copy Scripts and Assets
        await copyScripts(paths);
        await copyAssets(paths);

        console.log('Site built successfully.');
    } catch (error) {
        console.error('An error occurred during the build process:', error);
    }
}

async function copyScripts(paths) {
    if (await fs.pathExists(paths.scripts)) {
        try {
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

async function copyAssets(paths) {
    if (await fs.pathExists(paths.assets)) {
        try {
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

module.exports = buildSite;