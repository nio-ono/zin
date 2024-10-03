#!/usr/bin/env node

const path = require('path');
const fs = require('fs-extra');
const buildSite = require('../lib/build');
const { execSync } = require('child_process');

const args = process.argv.slice(2);

async function main() {
    try {
        if (args[0] === 'init') {
            const sourceDir = path.join(__dirname, '..', 'source');
            const configFile = path.join(__dirname, '..', 'config.js');
            const packageFile = path.join(__dirname, '..', 'package.json');
            const startFile = path.join(__dirname, '..', 'start.js');
            const libDir = path.join(__dirname, '..', 'lib');
            const destinationDir = process.cwd();
            
            // Copy 'source/' directory
            await fs.copy(sourceDir, path.join(destinationDir, 'source'));
            console.log('Source directory copied.');
            
            // Copy 'config.js'
            await fs.copy(configFile, path.join(destinationDir, 'config.js'));
            console.log('config.js copied.');
            
            // Copy 'package.json'
            await fs.copy(packageFile, path.join(destinationDir, 'package.json'));
            console.log('package.json copied.');
            
            // Copy 'start.js'
            await fs.copy(startFile, path.join(destinationDir, 'start.js'));
            console.log('start.js copied.');
            
            // Copy 'lib/' directory
            await fs.copy(libDir, path.join(destinationDir, 'lib'));
            console.log('lib directory copied successfully.');
            
            // Ensure necessary directories exist within 'source/'
            await fs.ensureDir(path.join(destinationDir, 'source', 'pages'));
            await fs.ensureDir(path.join(destinationDir, 'source', 'templates'));
            await fs.ensureDir(path.join(destinationDir, 'source', 'styles'));
            await fs.ensureDir(path.join(destinationDir, 'source', 'scripts'));
            await fs.ensureDir(path.join(destinationDir, 'source', 'assets'));

            console.log('Directory structure created successfully.');
            
            console.log('Starter project set up successfully.');
            console.log('Installing dependencies...');
            
            try {
                execSync('npm install', { stdio: 'inherit' });
                console.log('Dependencies installed successfully.');
            } catch (error) {
                console.error('Failed to install dependencies:', error);
            }
        } else if (args[0] === 'build') {
            await buildSite();
            console.log('Site built successfully.');
        } else {
            console.log('Invalid command. Use "zin init" or "zin build".');
        }
    } catch (err) {
        console.error('An error occurred:', err);
        process.exit(1);
    }
}

main();