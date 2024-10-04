const fs = require('fs-extra');
const path = require('path');
const sass = require('sass');
const { getAllFiles } = require('./fileOps');
const { compileEJSToHTML } = require('./renderer');

/**
 * Builds the site by compiling SCSS, copying static files, and rendering EJS templates.
 */
async function buildSite() {
    try {
        console.log('Starting site build...');

        // Load project-specific config and globals
        const configPath = path.join(process.cwd(), 'config.js');
        const config = require(configPath);
        const globals = require(path.join(process.cwd(), 'globals.js'));

        // Validate config structure
        if (
            !config ||
            !config.server ||
            !config.server.directories ||
            !config.server.directories.source ||
            !config.server.directories.public ||
            !config.server.directories.pages
        ) {
            throw new TypeError("Config server directories not properly defined.");
        }

        const sourceDir = path.resolve(config.server.directories.source);
        const publicDir = path.resolve(config.server.directories.public);
        const pagesDir = path.resolve(sourceDir, config.server.directories.pages);

        console.log('Source Directory:', sourceDir);
        console.log('Public Directory:', publicDir);
        console.log('Pages Directory:', pagesDir);

        // Delete existing public directory contents
        await deleteDirectoryContents(publicDir);
        console.log('Deleted existing public directory contents.');

        // Ensure the public directory exists
        await fs.ensureDir(publicDir);

        // Compile SCSS files
        await compileSCSS(sourceDir, publicDir);

        // Copy static files (non-EJS and non-SCSS)
        await copyStaticFiles(sourceDir, publicDir, config.server.directories.pages);

        // Render EJS templates to HTML
        await compileEJSToHTML(config.server.directories, globals);

        console.log('Site built successfully.');
    } catch (error) {
        console.error('An error occurred during the build process:', error);
    }
}

/**
 * Compiles all SCSS files to CSS, excluding partials.
 * @param {string} sourceDir - The source directory path.
 * @param {string} publicDir - The public directory path.
 */
async function compileSCSS(sourceDir, publicDir) {
    try {
        const allFiles = await getAllFiles(sourceDir);
        const scssFiles = allFiles.filter(
            file => path.extname(file).toLowerCase() === '.scss' && !path.basename(file).startsWith('_')
        );

        for (const scssFile of scssFiles) {
            const relativePath = path.relative(sourceDir, scssFile);
            const cssPath = path.join(publicDir, relativePath.replace('.scss', '.css'));
            const result = sass.renderSync({ file: scssFile });
            await fs.ensureDir(path.dirname(cssPath));
            await fs.writeFile(cssPath, result.css);
            console.log(`Compiled SCSS: ${cssPath}`);
        }
    } catch (error) {
        console.error('Failed to compile SCSS files.', error);
    }
}

/**
 * Copies all non-EJS and non-SCSS files to the public directory.
 * @param {string} sourceDir - The source directory path.
 * @param {string} publicDir - The public directory path.
 * @param {string} pagesDir - The pages directory path.
 */
async function copyStaticFiles(sourceDir, publicDir, pagesDir) {
    try {
        const allFiles = await getAllFiles(sourceDir);
        const staticFiles = allFiles.filter(file => {
            const ext = path.extname(file).toLowerCase();
            const relative = path.relative(sourceDir, file);
            const isInPages = relative.startsWith(path.join(pagesDir, path.sep));
            return ext !== '.ejs' && ext !== '.scss' && !isInPages;
        });

        for (const staticFile of staticFiles) {
            const relativePath = path.relative(sourceDir, staticFile);
            const destPath = path.join(publicDir, relativePath);
            await fs.ensureDir(path.dirname(destPath));
            await fs.copy(staticFile, destPath);
            console.log(`Copied: ${destPath}`);
        }
    } catch (error) {
        console.error('Failed to copy static files.', error);
    }
}

/**
 * Deletes all contents within a directory without removing the directory itself.
 * @param {string} dirPath - The directory path to clear.
 */
async function deleteDirectoryContents(dirPath) {
    try {
        const files = await fs.readdir(dirPath);
        for (const file of files) {
            await fs.remove(path.join(dirPath, file));
        }
    } catch (error) {
        // If the directory does not exist, it's already "deleted"
        if (error.code !== 'ENOENT') {
            throw error;
        }
    }
}

module.exports = { buildSite };