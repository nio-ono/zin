const fs = require('fs-extra');
const path = require('path');

/**
 * Recursively deletes the contents of a directory while preserving the root.
 * @param {string} dirPath
 * @returns {Promise<void>}
 */
async function deleteDirectoryContents(dirPath) {
    if (!(await fs.pathExists(dirPath))) {
        return;
    }

    const entries = await fs.readdir(dirPath);
    for (const entry of entries) {
        const currentPath = path.join(dirPath, entry);
        await fs.remove(currentPath);
    }
}

/**
 * Synchronously gathers all file paths in a directory subtree.
 * @param {string} directory
 * @returns {string[]}
 */
function getFilesInDir(directory) {
    let results = [];
    const files = fs.readdirSync(directory);

    files.forEach(file => {
        const fullPath = path.join(directory, file);
        if (fs.statSync(fullPath).isFile()) {
            results.push(fullPath);
        } else if (fs.statSync(fullPath).isDirectory()) {
            results = results.concat(getFilesInDir(fullPath));  // Recursive call
        }
    });

    return results;
}

/**
 * Recursively retrieves all file paths within a directory.
 * @param {string} dir - The directory to traverse.
 * @returns {Promise<string[]>} - An array of file paths.
 */
async function getAllFiles(dir) {
    let results = [];
    const list = await fs.readdir(dir);

    for (const file of list) {
        const filePath = path.join(dir, file);
        const stat = await fs.stat(filePath);
        if (stat && stat.isDirectory()) {
            const res = await getAllFiles(filePath);
            results = results.concat(res);
        } else {
            results.push(filePath);
        }
    }

    return results;
}

module.exports = { deleteDirectoryContents, getFilesInDir, getAllFiles };
