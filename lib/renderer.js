const fs = require('fs');
const ejs = require('ejs');
const path = require('path');
const configPath = path.join(process.cwd(), 'config.js');
const config = require(configPath);
const { getFilesInDir } = require('./fileOps');
const { buildCollections, getCollectionName } = require('./collections');

/**
 * Extracts the configuration and content from an EJS file.
 * @param {string} ejsContent - The content of the EJS file.
 * @param {string} pagePath - The path to the EJS file.
 * @returns {Object} - An object containing `pageConfig` and `content`.
 */
function extractConfigAndContent(ejsContent, pagePath) {
    const matches = ejsContent.match(/<%[\s\n]*const config = ([\s\S]*?);[\s\n]*%>/);
    if (matches && matches[1]) {
        const pageConfig = new Function(`return ${matches[1]}`)();
        const content = ejsContent.replace(matches[0], '').trim();
        return { pageConfig, content };
    }
    console.error("Failed to extract config from:", pagePath);
    throw new Error('Unable to extract config from EJS content.');
}

/**
 * Renders a single page based on its EJS template.
 * @param {string} pagePath - The path to the page's EJS file.
 * @param {Object} collections - Collections of page data.
 * @param {Object} paths - Paths configuration.
 */
function renderPage(pagePath, collections, paths) {
    // Dynamically import globals.js to get the latest values
    const globals = require('../globals'); 

    const ejsContent = fs.readFileSync(pagePath, 'utf-8');
    const { pageConfig, content } = extractConfigAndContent(ejsContent, pagePath);
    if (pageConfig.template) {
        const templatePath = path.join(paths.templates, `${pageConfig.template}.ejs`);
        const template = fs.readFileSync(templatePath, 'utf-8');
    
        const renderingContext = {
            content: ejs.render(content, { config: pageConfig }),
            site: globals.site, // Use the latest globals
            collections,
            ...pageConfig
        };

        try {
            const htmlOutput = ejs.render(template, renderingContext, { filename: templatePath });
            let outputDir;
            
            if (getCollectionName(pagePath) !== 'pages') {
                outputDir = path.join(paths.public, getCollectionName(pagePath), path.basename(pagePath, '.ejs'));
            } else {
                outputDir = path.basename(pagePath, '.ejs') === 'index'
                    ? paths.public
                    : path.join(paths.public, path.basename(pagePath, '.ejs'));
            }

            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            fs.writeFileSync(path.join(outputDir, 'index.html'), htmlOutput);
        } catch (error) {
            console.error(`Failed to render EJS for ${pagePath}.`, error);
        }
    }
}

/**
 * Compiles all EJS files to HTML.
 * @param {Object} paths - Paths configuration.
 * @param {boolean} [forceRebuild=false] - Whether to force a complete rebuild.
 */
function compileEJSToHTML(paths, forceRebuild = false) {
    let collections = {};
    
    const pagesDir = paths.pages;
    
    if (!fs.existsSync(pagesDir)) {
        console.warn(`The directory ${pagesDir} does not exist. Skipping EJS compilation.`);
        return;
    }

    const pageFiles = getFilesInDir(pagesDir);
    
    if (pageFiles.length === 0) {
        console.warn(`No files found in ${pagesDir}. Skipping EJS compilation.`);
        return;
    }

    // Clear EJS cache if forceRebuild is true
    if (forceRebuild) {
        ejs.clearCache();
        console.log('EJS cache cleared for a complete rebuild.');
    }

    pageFiles.forEach((pagePath) => {
        const ejsContent = fs.readFileSync(pagePath, 'utf-8');
        const { pageConfig } = extractConfigAndContent(ejsContent, pagePath);
        const newCollections = buildCollections(pagePath, pageConfig);

        Object.keys(newCollections).forEach(key => {
            if (!collections[key]) {
                collections[key] = [];
            }
            collections[key] = collections[key].concat(newCollections[key]);
        });
    });

    pageFiles.forEach((pagePath) => {
        renderPage(pagePath, collections, paths);
    });
}

module.exports = { renderPage, compileEJSToHTML };