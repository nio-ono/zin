const fs = require('fs-extra');
const path = require('path');
const sass = require('sass');
const { deleteDirectoryContents, getAllFiles } = require('./fileOps');
const { loadConfig, loadGlobals } = require('./config');
const { compileEJSToHTML } = require('./renderer');

function isPathInside(parentPath, childPath) {
    const relative = path.relative(parentPath, childPath);
    return !!relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

/**
 * Builds the site by compiling SCSS, copying static files, and rendering EJS templates.
 */
async function buildSite() {
    try {
        console.log('Starting site build...');

        // Load project-specific config and globals
        const config = loadConfig();
        const globals = loadGlobals();

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
            const cssPath = path.resolve(publicDir, relativePath.replace('.scss', '.css'));
            if (!isPathInside(publicDir, cssPath)) {
                console.error(`Skipping SCSS output outside public directory: ${cssPath}`);
                continue;
            }
            const result = sass.renderSync({ file: scssFile });
            const cssDir = path.dirname(cssPath);
            if (cssDir !== publicDir && !isPathInside(publicDir, cssDir)) {
                console.error(`Skipping directory creation outside public directory: ${cssDir}`);
                continue;
            }
            await fs.ensureDir(cssDir);
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
            const destPath = path.resolve(publicDir, relativePath);
            if (!isPathInside(publicDir, destPath)) {
                console.error(`Skipping copy outside public directory: ${destPath}`);
                continue;
            }
            const destDir = path.dirname(destPath);
            if (destDir !== publicDir && !isPathInside(publicDir, destDir)) {
                console.error(`Skipping directory creation outside public directory: ${destDir}`);
                continue;
            }
            await fs.ensureDir(destDir);
            await fs.copy(staticFile, destPath);
            console.log(`Copied: ${destPath}`);
        }
    } catch (error) {
        console.error('Failed to copy static files.', error);
    }
}

module.exports = { buildSite };
