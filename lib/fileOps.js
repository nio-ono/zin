const fs = require('fs');
const path = require('path');
const fsExtra = require('fs-extra');

function deleteDirectoryContents(dirPath) {
    if (!fs.existsSync(dirPath)) return;
    
    fs.readdirSync(dirPath).forEach((file) => {
        const currentPath = path.join(dirPath, file);
        
        if (fs.lstatSync(currentPath).isDirectory()) {
            deleteDirectoryContents(currentPath);
            fs.rmdirSync(currentPath);
        } else {
            fs.unlinkSync(currentPath);
        }
    });
}

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
    const list = await fsExtra.readdir(dir);

    for (const file of list) {
        const filePath = path.join(dir, file);
        const stat = await fsExtra.stat(filePath);
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