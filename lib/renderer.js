const fs = require('fs-extra');
const path = require('path');
const ejs = require('ejs');

/**
 * Checks if a childPath is inside parentPath.
 * @param {string} parentPath - The parent directory path.
 * @param {string} childPath - The child path to check.
 * @returns {boolean} - True if childPath is inside parentPath, else false.
 */
function isPathInside(parentPath, childPath) {
    const relative = path.relative(parentPath, childPath);
    return !!relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

/**
 * Compiles all EJS files to HTML, mirroring the directory structure in the public directory.
 * Supports collections by aggregating data from all processed EJS files.
 * @param {object} directories - The directories configuration.
 * @param {object} globals - Global site data.
 */
async function compileEJSToHTML(directories, globals) {
    try {
        console.log('Starting EJS compilation...');
        const sourceDir = path.resolve(directories.source);
        const publicDir = path.resolve(directories.public);
        const pagesDir = path.resolve(sourceDir, directories.pages);

        // Initialize collections
        const collections = {};

        // Process the root source directory
        await processDirectory(sourceDir, sourceDir, publicDir, directories, globals, collections);

        // Process the user-specified pages directory if it exists and is different from the source directory
        if (pagesDir !== sourceDir && await fs.pathExists(pagesDir)) {
            // Pass pagesDir as the new sourceDir when processing pagesDir
            await processDirectory(pagesDir, pagesDir, publicDir, directories, globals, collections);
        }

        console.log('EJS compilation completed successfully.');
    } catch (error) {
        console.error('An error occurred during EJS compilation:', error);
    }
}

/**
 * Recursively processes a directory, compiling EJS files and building collections.
 * @param {string} currentDir - The current directory being processed.
 * @param {string} sourceDir - The root source directory for this recursion.
 * @param {string} publicDir - The root public directory.
 * @param {object} directories - The directories configuration.
 * @param {object} globals - Global site data.
 * @param {object} collections - The collections data.
 */
async function processDirectory(currentDir, sourceDir, publicDir, directories, globals, collections) {
    const items = await fs.readdir(currentDir);
    const pagesDir = path.resolve(sourceDir, directories.pages);

    for (const item of items) {
        const itemPath = path.join(currentDir, item);
        const stat = await fs.stat(itemPath);

        if (stat.isDirectory()) {
            // Skip templates and partials directories
            if (
                item.toLowerCase() === 'templates' ||
                item.toLowerCase() === 'partials'
            ) {
                console.log(`Skipping directory: ${itemPath}`);
                continue;
            }

            // Determine the new sourceDir based on whether currentDir is inside pagesDir
            const newSourceDir = isPathInside(pagesDir, currentDir) ? pagesDir : sourceDir;

            // Recursively process subdirectories
            await processDirectory(itemPath, newSourceDir, publicDir, directories, globals, collections);
        } else if (stat.isFile() && path.extname(item).toLowerCase() === '.ejs') {
            const baseName = path.basename(itemPath);
            const isPartial = baseName.startsWith('_');
            const isTemplate = isPathInside(path.join(sourceDir, 'templates'), itemPath) || isPartial;

            if (isTemplate || isPartial) {
                console.log(`Skipping EJS file: ${itemPath}`);
                continue;
            }

            // Process the EJS file
            await processEJSFile(itemPath, sourceDir, publicDir, directories, globals, collections, pagesDir);
        }
    }
}

/**
 * Processes a single EJS file: renders it to HTML and writes to the public directory.
 * @param {string} itemPath - The path to the EJS file.
 * @param {string} sourceDir - The root source directory.
 * @param {string} publicDir - The root public directory.
 * @param {object} directories - The directories configuration.
 * @param {object} globals - Global site data.
 * @param {object} collections - The collections data.
 * @param {string} pagesDir - The pages directory path.
 */
async function processEJSFile(itemPath, sourceDir, publicDir, directories, globals, collections, pagesDir) {
    // Read EJS file content
    const ejsContent = await fs.readFile(itemPath, 'utf-8');

    // Extract config and content
    let pageConfig, content;
    try {
        const extracted = extractConfigAndContent(ejsContent, itemPath);
        pageConfig = extracted.pageConfig;
        content = extracted.content;
    } catch (error) {
        console.error(`Failed to extract config from ${itemPath}:`, error);
        return; // Skip rendering this file
    }

    // Determine collection name based on directory
    const collectionName = path.basename(path.dirname(itemPath));
    if (!collections[collectionName]) {
        collections[collectionName] = [];
    }
    collections[collectionName].push({
        config: pageConfig,
        path: deriveCollectionPath(itemPath, sourceDir, pagesDir)
    });

    // Prepare rendering context
    const renderingContext = {
        content: content,
        site: globals.site,
        collections,
        ...pageConfig
    };

    // Custom includeFile function
    const includeFile = (filePath, options) => {
        const fullPath = path.resolve(sourceDir, filePath);
        if (!fs.existsSync(fullPath)) {
            throw new Error(`Could not find the include file "${filePath}" (resolved to "${fullPath}")`);
        }
        return fs.readFileSync(fullPath, 'utf8');
    };

    // Render HTML
    let htmlOutput;
    try {
        const renderOptions = {
            filename: itemPath,
            root: sourceDir,
            include: includeFile
        };

        if (pageConfig.template) {
            const templatePath = path.join(sourceDir, 'templates', `${pageConfig.template}.ejs`);
            if (!fs.existsSync(templatePath)) {
                console.error(`Template "${pageConfig.template}.ejs" not found for ${itemPath}. Skipping.`);
                return;
            }
            const template = await fs.readFile(templatePath, 'utf-8');
            const renderedContent = ejs.render(content, renderingContext, renderOptions);
            htmlOutput = ejs.render(template, { ...renderingContext, content: renderedContent }, renderOptions);
        } else {
            htmlOutput = ejs.render(content, renderingContext, renderOptions);
        }
    } catch (error) {
        console.error(`Failed to render ${itemPath}:`, error);
        return;
    }

    // Determine output path
    let relativePath;
    if (isPathInside(pagesDir, itemPath)) {
        relativePath = path.relative(pagesDir, itemPath);
    } else {
        relativePath = path.relative(sourceDir, itemPath);
    }

    console.log(`Processing EJS file: ${itemPath}`);
    console.log(`Relative Path: ${relativePath}`);

    let outputDir, outputFilePath;

    if (path.basename(itemPath).toLowerCase() === 'index.ejs') {
        outputDir = path.join(publicDir, path.dirname(relativePath));
        outputFilePath = path.join(outputDir, 'index.html');
    } else {
        outputDir = path.join(publicDir, relativePath.replace(/\.ejs$/i, ''));
        outputFilePath = path.join(outputDir, 'index.html');
    }

    console.log(`Output Directory: ${outputDir}`);
    console.log(`Output File Path: ${outputFilePath}`);

    try {
        await fs.ensureDir(outputDir);
        await fs.writeFile(outputFilePath, htmlOutput);
        console.log(`Rendered: ${outputFilePath}`);
    } catch (error) {
        console.error(`Failed to write HTML for ${itemPath}:`, error);
    }
}

/**
 * Extracts configuration and content from EJS file content.
 * @param {string} ejsContent - The content of the EJS file.
 * @param {string} pagePath - The path to the EJS file.
 * @returns {object} - An object containing pageConfig and content.
 */
function extractConfigAndContent(ejsContent, pagePath) {
    const configRegex = /<%[\s\n]*const\s+config\s*=\s*([\s\S]*?);[\s\n]*%>/;
    const matches = ejsContent.match(configRegex);
    let pageConfig = {};

    if (matches && matches[1]) {
        try {
            pageConfig = new Function(`return ${matches[1]}`)();
        } catch (err) {
            console.error(`Error parsing config in ${pagePath}:`, err);
        }
    }

    return { pageConfig, content: ejsContent };
}

/**
 * Updates the collections object based on the page configuration.
 * @param {object} pageConfig - The configuration object extracted from the EJS file.
 * @param {object} collections - The collections data.
 * @param {string} pagePath - The path to the EJS file.
 * @param {string} sourceDir - The root source directory.
 * @param {string} pagesDir - The pages directory.
 */
function updateCollections(pageConfig, collections, pagePath, sourceDir, pagesDir) {
    if (pageConfig.tags && Array.isArray(pageConfig.tags)) {
        pageConfig.tags.forEach(tag => {
            if (!collections[tag]) {
                collections[tag] = [];
            }
            collections[tag].push({
                config: pageConfig,
                path: deriveCollectionPath(pagePath, sourceDir, pagesDir)
            });
        });
    }
    // Add more collection-building logic as needed
}

/**
 * Derives the collection path relative to the public directory.
 * @param {string} pagePath - The path to the EJS file.
 * @param {string} sourceDir - The root source directory.
 * @param {string} pagesDir - The pages directory.
 * @returns {string} - The derived path for the collection.
 */
function deriveCollectionPath(pagePath, sourceDir, pagesDir) {
    // Check if the file is in the pages directory
    const isInPagesDir = isPathInside(pagesDir, pagePath);
    
    // Convert source path to relative path
    const relativePath = isInPagesDir ? path.relative(pagesDir, pagePath) : path.relative(sourceDir, pagePath);
    const fileName = path.basename(relativePath, '.ejs');
    const dirName = path.dirname(relativePath);
    
    if (fileName.toLowerCase() === 'index') {
        // For index.ejs files, return the directory path
        return dirName === '.' ? '/' : `/${dirName}/`;
    } else {
        // For other files, return the directory path containing index.html
        return `/${dirName}/${fileName}/`;
    }
}

module.exports = { compileEJSToHTML };