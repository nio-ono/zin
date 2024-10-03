const browserSync = require('browser-sync').create();
const config = require('../config');
const buildSite = require('./build');
const path = require('path');

let isBuilding = false;

/**
 * Initializes BrowserSync and sets up file watchers with build locking.
 */
async function runBrowserSync() {
    browserSync.init({
        server: config.server.paths.public,
        port: config.server.port,
        open: false,
        notify: false,
        ui: false,
    });

    /**
     * Handles file change events by rebuilding the site and reloading the browser.
     * Ensures that only one build runs at a time.
     * @param {string} file - The path to the changed file.
     */
    const handleFileChange = async (file) => {
        if (isBuilding) {
            console.log('Build already in progress. Skipping this change.');
            return;
        }
        isBuilding = true;
        try {
            console.log(`File changed: ${file}`);
            await buildSite();
            browserSync.reload();
        } catch (err) {
            console.error('Error during build:', err);
        } finally {
            isBuilding = false;
        }
    };

    // Watch for changes in source files, config.js, and globals.js
    browserSync.watch([
        './source/**/*.*',
        path.resolve(__dirname, '../config.js'),
        path.resolve(__dirname, '../source/globals.js')
    ]).on('change', handleFileChange);
}

module.exports = runBrowserSync;