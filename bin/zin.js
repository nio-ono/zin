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
    const templateDir = path.join(__dirname, '..', 'templates');

    // Initialize necessary directories
    const directories = [
        'source/pages',
        'source/templates',
        'source/templates/partials',
        'source/styles',
        'source/scripts',
        'source/assets'
    ];

    for (const dir of directories) {
        await fs.ensureDir(path.join(destinationDir, dir));
    }

    // Copy sample files
    const sampleFiles = [
        { src: 'config.js', dest: 'config.js' },
        { src: 'globals.js', dest: 'globals.js' },
        { src: 'source/pages/index.ejs', dest: 'source/pages/index.ejs' },
        { src: 'source/pages/about.ejs', dest: 'source/pages/about.ejs' },
        { src: 'source/templates/index.ejs', dest: 'source/templates/index.ejs' },
        { src: 'source/templates/page.ejs', dest: 'source/templates/page.ejs' },
        { src: 'source/templates/partials/_head.ejs', dest: 'source/templates/partials/_head.ejs' }
    ];

    for (const file of sampleFiles) {
        await fs.copyFile(path.join(templateDir, file.src), path.join(destinationDir, file.dest));
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