#!/usr/bin/env node

const args = process.argv.slice(2);
const path = require('path');
const fs = require('fs-extra');

if (args[0] === 'init') {
    // Logic for setting up the starter project
    const sourceDir = path.join(__dirname, 'source');
    const destinationDir = path.join(process.cwd(), 'zin-starter');
    
    fs.copySync(sourceDir, destinationDir);
    console.log('Starter project set up successfully.');
} else {
    console.log('Invalid command');
}
