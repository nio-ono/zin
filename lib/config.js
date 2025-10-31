const path = require('path');

let cfg;
let glb;

/**
 * Lazily loads and caches the project config.
 * @returns {import('../config')}
 */
const loadConfig = () => (cfg ||= require(path.join(process.cwd(), 'config.js')));

/**
 * Lazily loads and caches the project globals.
 * @returns {import('../globals')}
 */
const loadGlobals = () => (glb ||= require(path.join(process.cwd(), 'globals.js')));

module.exports = { loadConfig, loadGlobals };
