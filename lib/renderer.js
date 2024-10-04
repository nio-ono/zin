const fs = require('fs-extra');
const path = require('path');
const ejs = require('ejs');

/**
 * Compiles all EJS files to HTML, mirroring the directory structure in the public directory.
 * Supports collections by aggregating data from all processed EJS files.
 * @param {object} paths - The paths configuration.
 * @param {object} globals - Global site data.
 */
async function compileEJSToHTML(paths, globals) {
    try {
        console.log('Starting EJS compilation...');
        const sourceDir = path.resolve(paths.source);
        const publicDir = path.resolve(paths.public);

        // Initialize collections
        const collections = {};

        // Recursively process all EJS files in the source directory
        await processDirectory(sourceDir, sourceDir, publicDir, paths, globals, collections);

        console.log('EJS compilation completed successfully.');
    } catch (error) {
        console.error('An error occurred during EJS compilation:', error);
    }
}

/**
 * Recursively processes a directory, compiling EJS files and building collections.
 * @param {string} currentDir - The current directory being processed.
 * @param {string} sourceDir - The root source directory.
 * @param {string} publicDir - The root public directory.
 * @param {object} paths - The paths configuration.
 * @param {object} globals - Global site data.
 * @param {object} collections - The collections data.
 */
async function processDirectory(currentDir, sourceDir, publicDir, paths, globals, collections) {
    const items = await fs.readdir(currentDir);

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

            // Recursively process subdirectories
            await processDirectory(itemPath, sourceDir, publicDir, paths, globals, collections);
        } else if (stat.isFile() && path.extname(item).toLowerCase() === '.ejs') {
            const baseName = path.basename(itemPath);
            const isPartial = baseName.startsWith('_');
            const isTemplate = currentDir.includes(`${path.sep}templates${path.sep}`) || isPartial;

            if (isTemplate || isPartial) {
                console.log(`Skipping EJS file: ${itemPath}`);
                continue;
            }

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
                continue; // Skip rendering this file
            }

            // Update collections
            updateCollections(pageConfig, collections, itemPath, sourceDir);

            // Load the template
            if (!pageConfig.template) {
                console.error(`No template specified in config of ${itemPath}. Skipping.`);
                continue;
            }

            const templatePath = path.join(sourceDir, 'templates', `${pageConfig.template}.ejs`);
            if (!fs.existsSync(templatePath)) {
                console.error(`Template "${pageConfig.template}.ejs" not found for ${itemPath}. Skipping.`);
                continue;
            }

            const template = await fs.readFile(templatePath, 'utf-8');

            // Prepare rendering context
            const renderingContext = {
                content: ejs.render(content, { config: pageConfig }),
                site: globals.site,
                collections,
                ...pageConfig
            };

            // Render HTML
            let htmlOutput;
            try {
                htmlOutput = ejs.render(template, renderingContext, { filename: templatePath });
            } catch (error) {
                console.error(`Failed to render template for ${itemPath}:`, error);
                continue;
            }

            // Determine output path
            const relativePath = path.relative(sourceDir, itemPath);
            let outputDir, outputFilePath;

            if (baseName.toLowerCase() === 'index.ejs') {
                // If the file is named "index.ejs", place it directly in the corresponding directory
                outputDir = path.join(publicDir, path.dirname(relativePath));
                outputFilePath = path.join(outputDir, 'index.html');
            } else {
                // For other files, create a directory named after the file (without .ejs) and place index.html inside
                outputDir = path.join(publicDir, relativePath.replace('.ejs', ''));
                outputFilePath = path.join(outputDir, 'index.html');
            }

            try {
                await fs.ensureDir(outputDir);
                await fs.writeFile(outputFilePath, htmlOutput);
                console.log(`Rendered: ${outputFilePath}`);
            } catch (error) {
                console.error(`Failed to write HTML for ${itemPath}:`, error);
            }
        }
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
    if (matches && matches[1]) {
        let pageConfig;
        try {
            pageConfig = new Function(`return ${matches[1]}`)();
        } catch (err) {
            console.error(`Error parsing config in ${pagePath}:`, err);
            throw new Error('Invalid config format in EJS content.');
        }

        const content = ejsContent.replace(matches[0], '').trim();
        return { pageConfig, content };
    }
    console.error("Failed to extract config from:", pagePath);
    throw new Error('Unable to extract config from EJS content.');
}

/**
 * Updates the collections object based on the page configuration.
 * @param {object} pageConfig - The configuration object extracted from the EJS file.
 * @param {object} collections - The collections data.
 * @param {string} pagePath - The path to the EJS file.
 * @param {string} sourceDir - The root source directory.
 */
function updateCollections(pageConfig, collections, pagePath, sourceDir) {
    if (pageConfig.tags && Array.isArray(pageConfig.tags)) {
        pageConfig.tags.forEach(tag => {
            if (!collections[tag]) {
                collections[tag] = [];
            }
            collections[tag].push({
                config: pageConfig,
                path: deriveCollectionPath(pagePath, sourceDir)
            });
        });
    }
    // Add more collection-building logic as needed
}

/**
 * Derives the collection path relative to the public directory.
 * @param {string} pagePath - The path to the EJS file.
 * @param {string} sourceDir - The root source directory.
 * @returns {string} - The derived path for the collection.
 */
function deriveCollectionPath(pagePath, sourceDir) {
    // Convert source path to public path by replacing 'source' with 'public' and removing '.ejs'
    const relativePath = path.relative(sourceDir, pagePath);
    const publicPath = relativePath.replace('.ejs', '.html');
    return publicPath.replace(/\\/g, '/'); // For Windows compatibility
}

module.exports = { compileEJSToHTML };