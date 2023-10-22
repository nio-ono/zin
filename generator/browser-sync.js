const browserSync = require('browser-sync').create();
const config = require('../config');
const buildSite = require('./build');

function runBrowserSync() {
    browserSync.init({
        server: './public',
        port: config.server.port,
        open: false,
        notify: false,
        ui: false,
    });

    // When source files change, rebuild the site and then reload
    browserSync.watch('./source/**/*.*').on('change', () => {
        buildSite();
        browserSync.reload();
    });
}

module.exports = runBrowserSync;
