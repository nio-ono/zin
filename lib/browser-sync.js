const browserSync = require('browser-sync').create();
const config = require('../config');
const buildSite = require('./build');
const path = require('path');

function runBrowserSync() {
    browserSync.init({
        server: config.server.paths.public,
        port: config.server.port,
        open: false,
        notify: false,
        ui: false,
    });

    // Watch for changes in source files, config.js, and globals.js
    browserSync.watch([
        './source/**/*.*',
        path.resolve(__dirname, '../config.js'),
        path.resolve(__dirname, '../source/globals.js')
    ]).on('change', () => {
        buildSite();
        browserSync.reload();
    });
}

module.exports = runBrowserSync;
