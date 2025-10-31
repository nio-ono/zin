const fs = require('fs-extra');
const path = require('path');
const ejs = require('ejs');

const TEMPLATE_DIR_NAME = 'templates';
const PARTIALS_DIR_NAME = 'partials';

function isPathInside(parentPath, childPath) {
    const relative = path.relative(parentPath, childPath);
    return !!relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function resolveDirectories(directories) {
    const sourceDir = path.resolve(directories.source);
    const publicDir = path.resolve(directories.public);
    const pagesDir = path.resolve(sourceDir, directories.pages);
    return { sourceDir, publicDir, pagesDir };
}

function shouldSkipDirectory(dirName) {
    const normalized = dirName.toLowerCase();
    return normalized === TEMPLATE_DIR_NAME || normalized === PARTIALS_DIR_NAME;
}

function isPartialFile(baseName) {
    return baseName.startsWith('_');
}

function shouldSkipEjsFile(itemPath, baseSourceDir, baseName) {
    return isPartialFile(baseName) || isPathInside(path.resolve(baseSourceDir, TEMPLATE_DIR_NAME), itemPath);
}

function addToCollections(collections, pageConfig, itemPath, sourceDir, pagesDir) {
    const collectionName = path.basename(path.dirname(itemPath));
    if (!collections[collectionName]) {
        collections[collectionName] = [];
    }
    collections[collectionName].push({
        config: pageConfig,
        path: deriveCollectionPath(itemPath, sourceDir, pagesDir),
    });
}

function createRenderingContext(pageConfig, globals, collections, content) {
    return {
        content,
        site: globals.site,
        collections,
        ...pageConfig,
    };
}

function createIncludeResolver(baseSourceDir) {
    return (filePath, options) => {
        const fullPath = path.resolve(baseSourceDir, filePath);
        if (!fs.existsSync(fullPath)) {
            throw new Error(`Could not find the include file "${filePath}" (resolved to "${fullPath}")`);
        }
        return fs.readFileSync(fullPath, 'utf8');
    };
}

function computeRelativePath(itemPath, sourceDir, pagesDir) {
    return isPathInside(pagesDir, itemPath)
        ? path.relative(pagesDir, itemPath)
        : path.relative(sourceDir, itemPath);
}

function deriveOutputTargets(relativePath, publicDir) {
    const fileName = path.basename(relativePath);
    if (fileName.toLowerCase() === 'index.ejs') {
        const outputDir = path.resolve(publicDir, path.dirname(relativePath));
        return { outputDir, outputFilePath: path.resolve(outputDir, 'index.html') };
    }
    const outputDir = path.resolve(publicDir, relativePath.replace(/\.ejs$/i, ''));
    return { outputDir, outputFilePath: path.resolve(outputDir, 'index.html') };
}

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

function deriveCollectionPath(pagePath, sourceDir, pagesDir) {
    const isInPagesDir = isPathInside(pagesDir, pagePath);
    const relativePath = isInPagesDir ? path.relative(pagesDir, pagePath) : path.relative(sourceDir, pagePath);
    const fileName = path.basename(relativePath, '.ejs');
    const dirName = path.dirname(relativePath);

    if (fileName.toLowerCase() === 'index') {
        return dirName === '.' ? '/' : `/${dirName}/`;
    }

    return `/${dirName}/${fileName}/`;
}

async function compileEJSToHTML(directories, globals) {
    try {
        console.log('Starting EJS compilation...');
        const { sourceDir, publicDir, pagesDir } = resolveDirectories(directories);
        const collections = {};

        await processDirectory(sourceDir, sourceDir, publicDir, directories, globals, collections, sourceDir);

        if (pagesDir !== sourceDir && await fs.pathExists(pagesDir)) {
            await processDirectory(pagesDir, pagesDir, publicDir, directories, globals, collections, sourceDir);
        }

        console.log('EJS compilation completed successfully.');
    } catch (error) {
        console.error('An error occurred during EJS compilation:', error);
    }
}

async function processDirectory(currentDir, sourceDir, publicDir, directories, globals, collections, baseSourceDir) {
    const items = await fs.readdir(currentDir);
    const pagesDir = path.resolve(baseSourceDir, directories.pages);

    for (const item of items) {
        const itemPath = path.resolve(currentDir, item);
        const stat = await fs.stat(itemPath);

        if (stat.isDirectory()) {
            if (shouldSkipDirectory(item)) {
                console.log(`Skipping directory: ${itemPath}`);
                continue;
            }

            await processDirectory(itemPath, sourceDir, publicDir, directories, globals, collections, baseSourceDir);
            continue;
        }

        if (!stat.isFile() || path.extname(itemPath).toLowerCase() !== '.ejs') {
            continue;
        }

        const baseName = path.basename(itemPath);

        if (shouldSkipEjsFile(itemPath, baseSourceDir, baseName)) {
            console.log(`Skipping EJS file: ${itemPath}`);
            continue;
        }

        await processEJSFile(itemPath, sourceDir, publicDir, directories, globals, collections, pagesDir, baseSourceDir);
    }
}

async function processEJSFile(itemPath, sourceDir, publicDir, directories, globals, collections, pagesDir, baseSourceDir) {
    const ejsContent = await fs.readFile(itemPath, 'utf-8');

    let pageConfig;
    let content;
    try {
        const extracted = extractConfigAndContent(ejsContent, itemPath);
        pageConfig = extracted.pageConfig;
        content = extracted.content;
    } catch (error) {
        console.error(`Failed to extract config from ${itemPath}:`, error);
        return;
    }

    addToCollections(collections, pageConfig, itemPath, sourceDir, pagesDir);

    const renderingContext = createRenderingContext(pageConfig, globals, collections, content);
    const includeFile = createIncludeResolver(baseSourceDir);

    let htmlOutput;
    try {
        const renderOptions = {
            filename: itemPath,
            root: baseSourceDir,
            include: includeFile,
        };

        if (pageConfig.template) {
            const templatePath = path.resolve(baseSourceDir, TEMPLATE_DIR_NAME, `${pageConfig.template}.ejs`);
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

    const relativePath = computeRelativePath(itemPath, sourceDir, pagesDir);
    console.log(`Processing EJS file: ${itemPath}`);
    console.log(`Relative Path: ${relativePath}`);

    const { outputDir, outputFilePath } = deriveOutputTargets(relativePath, publicDir);
    if ((outputDir !== publicDir && !isPathInside(publicDir, outputDir)) || !isPathInside(publicDir, outputFilePath)) {
        console.error(`Skipping write outside public directory: ${outputFilePath}`);
        return;
    }
    console.log(`Output File Path: ${outputFilePath}`);

    try {
        await fs.ensureDir(outputDir);
        await fs.writeFile(outputFilePath, htmlOutput);
        console.log(`Rendered: ${outputFilePath}`);
    } catch (error) {
        console.error(`Failed to write HTML for ${itemPath}:`, error);
    }
}

module.exports = { compileEJSToHTML };
