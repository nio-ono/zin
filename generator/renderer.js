const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const siteConfig = require('../config');
const { getFilesInDir } = require('./fileOps');
const { buildCollections, getCollectionName } = require('./collections');

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

function renderPage(pagePath, collections, paths) {
    const ejsContent = fs.readFileSync(pagePath, 'utf-8');
    const { pageConfig, content } = extractConfigAndContent(ejsContent, pagePath);
    if (pageConfig.template) {
        const templatePath = path.join(paths.templates, `${pageConfig.template}.ejs`);
        const template = fs.readFileSync(templatePath, 'utf-8');
    
        const renderingContext = {
            content: ejs.render(content, { config: pageConfig }),
            site: siteConfig.site,
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

function compileEJSToHTML(paths) {
    let collections = {};
    
    getFilesInDir(paths.pages).forEach((pagePath) => {
        // const pagePath = path.join(paths.pages, pageFilename); // Join directory with filename
        const ejsContent = fs.readFileSync(pagePath, 'utf-8');
        const { pageConfig } = extractConfigAndContent(ejsContent, pagePath);
        // console.log("Extracted pageConfig for", pagePath, ":", pageConfig);
        const newCollections = buildCollections(pagePath, pageConfig);
        // console.log("New collections for", pagePath, ":", newCollections);

        Object.keys(newCollections).forEach(key => {
            if (!collections[key]) {
                collections[key] = [];
            }
            collections[key] = collections[key].concat(newCollections[key]);
        });
        // console.log("Merged collections after", pagePath, ":", collections);
    });
    
    // console.log("Collections after processing all pages:", collections);


    getFilesInDir(paths.pages).forEach((pagePath) => {
        renderPage(pagePath, collections, paths);
    });
}

module.exports = { renderPage, compileEJSToHTML };

