const browserSync = require('browser-sync').create();
const { buildSite } = require('./build');
const { loadConfig } = require('./config');
const path = require('path');

let isBuilding = false;

/**
 * Initializes BrowserSync and sets up file watchers with build locking.
 * @returns {Promise<void>}
 */
async function runBrowserSync() {
    const configPath = path.join(process.cwd(), 'config.js');
    const config = loadConfig();

    browserSync.init({
        server: path.resolve(config.server.directories.public),
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
        path.join(process.cwd(), 'source', '**', '*.*'),
        configPath,
        path.join(process.cwd(), 'globals.js')
    ]).on('change', handleFileChange);
}

module.exports = runBrowserSync;
