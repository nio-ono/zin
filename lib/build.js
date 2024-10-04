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

        const sourceDir = path.resolve(config.server.paths.source);
        const publicDir = path.resolve(config.server.paths.public);

        // Delete existing public directory contents
        await deleteDirectoryContents(publicDir);
        console.log('Deleted existing public directory contents.');

        // Ensure the public directory exists
        await fs.ensureDir(publicDir);

        // Compile SCSS files
        await compileSCSS(sourceDir, publicDir);

        // Copy static files (non-EJS and non-SCSS)
        await copyStaticFiles(sourceDir, publicDir);

        // Render EJS templates to HTML
        await compileEJSToHTML(config.server.paths, globals);

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
 */
async function copyStaticFiles(sourceDir, publicDir) {
    try {
        const allFiles = await getAllFiles(sourceDir);
        const staticFiles = allFiles.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ext !== '.ejs' && ext !== '.scss';
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
 * Deletes all contents within the specified directory.
 * @param {string} dir - The directory to clean.
 */
async function deleteDirectoryContents(dir) {
    try {
        if (await fs.pathExists(dir)) {
            const files = await fs.readdir(dir);
            for (const file of files) {
                await fs.remove(path.join(dir, file));
            }
        }
    } catch (error) {
        console.error(`Failed to delete contents of directory ${dir}:`, error);
        throw error;
    }
}

module.exports = buildSite;