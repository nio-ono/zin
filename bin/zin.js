#!/usr/bin/env node

const path = require('path');
const fs = require('fs-extra');
const buildSite = require('../lib/build');
const runBrowserSync = require('../lib/browser-sync');
const { execSync } = require('child_process');

const args = process.argv.slice(2);

async function main() {
    try {
        const command = args[0];

        switch (command) {
            case 'init':
                await initProject();
                break;
            case 'build':
                await buildSite();
                break;
            case 'serve':
                await runBrowserSync();
                break;
            default:
                console.log('Invalid command. Use "zin init", "zin build", or "zin serve".');
        }
    } catch (err) {
        console.error('An error occurred:', err);
        process.exit(1);
    }
}

async function initProject() {
    const destinationDir = process.cwd();

    // Initialize necessary directories
    const directories = [
        'source/pages',
        'source/templates',
        'source/styles',
        'source/scripts',
        'source/assets'
    ];

    for (const dir of directories) {
        await fs.ensureDir(path.join(destinationDir, dir));
    }

    // Create default config.js
    const configTemplate = `
module.exports = {
    server: {
        port: 3000,
        paths: {
            source: "./source/",
            public: "./public/",
            sourcePaths: {
                pages: "pages/",
                templates: "templates/",
                styles: "styles/",
                scripts: "scripts/",
                assets: "assets/",
            },
        }
    }
};
    `;
    await fs.writeFile(path.join(destinationDir, 'config.js'), configTemplate.trim());
    console.log('config.js created.');

    // Create default globals.js
    const globalsTemplate = `
module.exports = {
    site: {
        name: "My Zin Project",
        description: "A description of my Zin project.",
    }
};
    `;
    await fs.writeFile(path.join(destinationDir, 'globals.js'), globalsTemplate.trim());
    console.log('globals.js created.');

    console.log('Starter project initialized successfully.');
}

main();