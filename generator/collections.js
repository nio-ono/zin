const path = require('path');

function getCollectionName(pagePath) {
    if (!pagePath) {
        console.warn('Undefined pagePath provided to getCollectionName');
        return '';
    }
    const splitPath = pagePath.split(path.sep);
    const collectionName = splitPath[splitPath.length - 2];
    return collectionName;
}

function addPageToCollection(collections, collectionName, enrichedData) {
    if (!collections[collectionName]) {
        collections[collectionName] = [];
    }
    collections[collectionName].push(enrichedData);
}

function buildCollections(pagePath, pageConfig) {
    const collections = {};

    const collectionName = getCollectionName(pagePath);
    if (collectionName !== 'pages') {
        const enrichedData = {
            config: {
                ...pageConfig,
                slug: path.basename(pagePath, '.ejs')
            }
        };
        addPageToCollection(collections, collectionName, enrichedData, enrichedData.slug);
    }
    return collections;
}

module.exports = { buildCollections, getCollectionName };
