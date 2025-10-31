const path = require('path');

let cfg;
let glb;

const loadConfig = () => (cfg ||= require(path.join(process.cwd(), 'config.js')));
const loadGlobals = () => (glb ||= require(path.join(process.cwd(), 'globals.js')));

module.exports = { loadConfig, loadGlobals };
