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

    // Define the paths for template and project source directories
    const templateSourceDir = path.join(__dirname, '..', 'starter-files');
    const projectSourceDir = path.join(destinationDir, 'source');

    // Check if the project already has a source directory
    if (await fs.pathExists(projectSourceDir)) {
        const { overwrite } = await promptOverwrite();
        if (!overwrite) {
            console.log('Initialization aborted to prevent overwriting existing source directory.');
            return;
        }
        // Remove existing source directory
        await fs.remove(projectSourceDir);
    }

    // Copy all starter files from the template directory to the project directory
    try {
        await fs.copy(templateSourceDir, projectSourceDir, { overwrite: true });
        console.log('Starter files have been copied to the source directory.');
    } catch (error) {
        console.error('An error occurred while copying starter files:', error);
        return;
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
    try {
        await fs.writeFile(path.join(destinationDir, 'config.js'), configTemplate.trim());
        console.log('config.js created.');
    } catch (error) {
        console.error('Failed to create config.js:', error);
    }

    // Create default globals.js
    const globalsTemplate = `
module.exports = {
    site: {
        name: "My Zin Project",
        description: "A description of my Zin project.",
    }
};
    `;
    try {
        await fs.writeFile(path.join(destinationDir, 'globals.js'), globalsTemplate.trim());
        console.log('globals.js created.');
    } catch (error) {
        console.error('Failed to create globals.js:', error);
    }

    console.log('Starter project initialized successfully.');
}

async function promptOverwrite() {
    // Simple prompt to confirm overwriting existing source directory
    // This can be enhanced using a library like 'inquirer' for better UX
    return new Promise((resolve) => {
        process.stdout.write('source directory already exists. Overwrite? (y/N): ');
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        process.stdin.once('data', function(data) {
            data = data.toString().trim().toLowerCase();
            resolve({ overwrite: data === 'y' || data === 'yes' });
            process.stdin.pause();
        });
    });
}

main();