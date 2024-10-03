const fs = require('fs');
const path = require('path');

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

module.exports = { deleteDirectoryContents, getFilesInDir };
