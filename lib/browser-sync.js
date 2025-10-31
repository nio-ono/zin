const browserSync = require('browser-sync').create();
const chokidar = require('chokidar');
const path = require('path');
const {
  buildSite,
  buildSinglePage,
  buildStylesIncremental,
  copyAssetIncremental,
  removeAsset,
  removePage,
  allPages,
  getRenderer,
  getDirectories,
  isPage,
  ensureState,
} = require('./build');
const { loadConfig } = require('./config');

const CONFIG_PATH = path.join(process.cwd(), 'config.js');
const GLOBALS_PATH = path.join(process.cwd(), 'globals.js');

let isBuilding = false;
let activeWatcher = null;

function isConfigFile(filePath) {
  const absPath = path.resolve(filePath);
  return absPath === CONFIG_PATH;
}

function isGlobalsFile(filePath) {
  const absPath = path.resolve(filePath);
  return absPath === GLOBALS_PATH;
}

function isEjsFile(filePath) {
  return path.extname(filePath).toLowerCase() === '.ejs';
}

function isScssFile(filePath) {
  return path.extname(filePath).toLowerCase() === '.scss';
}

function uniquePaths(list) {
  return Array.from(new Set(list.map((item) => path.resolve(item))));
}

async function handleEjsChange(event, absPath) {
  await ensureState();
  const renderer = getRenderer();
  const graph = renderer.graph;

  if (isPage(absPath)) {
    const beforeEntry = renderer.getEntry(absPath);
    const collectionKeys = beforeEntry && beforeEntry.collectionKey ? [beforeEntry.collectionKey] : [];
    const dependentsBefore = graph.pagesAffectedBy(absPath);

    if (event === 'unlink') {
      const collectionDependents = collectionKeys.flatMap((key) => graph.pagesAffectedBy(key));
      const targets = uniquePaths([...dependentsBefore, ...collectionDependents]);
      await removePage(absPath);
      for (const target of targets) {
        await buildSinglePage(target);
      }
      return targets.length > 0;
    }

    await buildSinglePage(absPath);
    const entryAfter = renderer.getEntry(absPath);
    const activeCollectionKeys =
      entryAfter && entryAfter.collectionKey ? [entryAfter.collectionKey] : collectionKeys;

    const collectionDependents = activeCollectionKeys.flatMap((key) => graph.pagesAffectedBy(key));
    const targets = uniquePaths([...dependentsBefore, ...collectionDependents]);
    targets.splice(targets.indexOf(path.resolve(absPath)), 1);

    for (const target of targets) {
      await buildSinglePage(target);
    }
    return true;
  }

  const dependents = graph.pagesAffectedBy(absPath);
  const targets = dependents.length ? dependents : allPages();
  const uniqueTargets = uniquePaths(targets);

  for (const target of uniqueTargets) {
    await buildSinglePage(target);
  }

  if (event === 'unlink') {
    graph.removeDependencyKey(absPath);
  }

  return uniqueTargets.length > 0;
}

async function handleAssetChange(event, absPath) {
  if (event === 'unlink') {
    await removeAsset(absPath);
    return true;
  }

  const result = await copyAssetIncremental(absPath);
  return Boolean(result);
}

async function handleChange(event, filePath) {
  const absPath = path.resolve(filePath);

  if (isConfigFile(absPath) || isGlobalsFile(absPath)) {
    await buildSite();
    if (activeWatcher) {
      const dirs = getDirectories();
      const extraTargets = [dirs.sourceDir, dirs.stylesDir, dirs.assetsDir].filter(Boolean);
      activeWatcher.add(extraTargets);
    }
    return true;
  }

  if (isEjsFile(absPath)) {
    return handleEjsChange(event, absPath);
  }

  if (isScssFile(absPath)) {
    const changed = await buildStylesIncremental(event, absPath);
    return changed;
  }

  return handleAssetChange(event, absPath);
}

async function serve(options = {}) {
  await buildSite();
  const config = loadConfig();
  const dirs = getDirectories();

  browserSync.init({
    server: path.resolve(dirs.publicDir),
    port: options.port || config.server.port,
    open: false,
    notify: false,
    ui: false,
  });

  const watchTargets = [
    dirs.sourceDir,
    dirs.stylesDir,
    dirs.assetsDir,
    CONFIG_PATH,
    GLOBALS_PATH,
  ].filter(Boolean);

  const watcher = chokidar.watch(watchTargets, {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 50,
      pollInterval: 10,
    },
  });

  activeWatcher = watcher;

  watcher.on('all', async (event, file) => {
    const absPath = path.resolve(file);
    if (isBuilding) {
      return;
    }
    isBuilding = true;
    try {
      const shouldReload = await handleChange(event, absPath);
      if (shouldReload) {
        browserSync.reload();
      }
    } catch (error) {
      console.error('Error during incremental build:', error);
    } finally {
      isBuilding = false;
    }
  });
}

module.exports = serve;
module.exports.serve = serve;
