const path = require('path');

// Error handling for JSON files
function requireJson(filePath) {
    const extname = path.extname(filePath);
    // Check to make sure it's actually a JSON file.
    if (extname !== '.json') {
        console.error(`Attempted to load non-JSON file: ${filePath}`);
        return null;
    }
    
    try {
        return require(filePath);
    } catch (error) {
        console.error(`Failed to parse JSON from ${filePath}.`, error);
        return null;
    }
}

module.exports = { requireJson };