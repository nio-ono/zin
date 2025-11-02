const path = require('path');
const { loadConfig, loadGlobals } = require('./config');
const { Renderer, resolveDirectories, isPathInside } = require('./renderer');
const { planSite, planCleanPublic, planScssPartial, planScssRemoval, shouldCopyStatic } = require('./core/plan');
const { commit } = require('./core/commit');
const fsReal = require('./core/fs/real');
const { planScssEntry, graph: scssGraph } = require('./styles');

const DEFAULT_CONCURRENCY = 8;

let buildState = null;

function validateConfig(config) {
  if (
    !config ||
    !config.server ||
    !config.server.directories ||
    !config.server.directories.source ||
    !config.server.directories.public ||
    !config.server.directories.pages
  ) {
    throw new TypeError('Config server directories not properly defined.');
  }
}

function createDirectoryMap(dirs) {
  const resolved = resolveDirectories(dirs);
  return {
    ...resolved,
    stylesDir: path.resolve(resolved.sourceDir, 'styles'),
    assetsDir: path.resolve(resolved.sourceDir, 'assets'),
    scriptsDir: path.resolve(resolved.sourceDir, 'scripts'),
  };
}

function getConcurrency(state, key = 'render') {
  const value = state.config?.server?.concurrency?.[key];
  if (!Number.isInteger(value) || value < 1) {
    return DEFAULT_CONCURRENCY;
  }
  return value;
}

function arrayToPlan(actions) {
  return (async function* () {
    for (const action of actions) {
      yield action;
    }
  })();
}

async function runCommit(state, plan, concurrencyKey = 'render') {
  if (!plan) {
    return { changed: [] };
  }

  const iterator = typeof plan[Symbol.asyncIterator] === 'function' ? plan : arrayToPlan(plan);
  return commit(iterator, fsReal, {
    concurrency: getConcurrency(state, concurrencyKey),
    publicDir: state.directories.publicDir,
  });
}

async function createState() {
  const config = loadConfig();
  const globals = loadGlobals();
  validateConfig(config);

  const directories = createDirectoryMap(config.server.directories);
  const renderer = new Renderer(config.server.directories, globals);
  const state = {
    config,
    globals,
    directories,
    renderer,
    styles: {
      entries: new Map(),
    },
    assets: new Map(),
  };

  await renderer.initialize();
  return state;
}

async function ensureState() {
  if (!buildState) {
    buildState = await createState();
  }
  return buildState;
}

async function buildSite() {
  console.log('Starting site build...');
  const state = await createState();
  buildState = state;

  await runCommit(state, planSite(state));
  console.log('Site built successfully.');
  return state;
}

async function cleanPublic() {
  const state = await ensureState();
  await runCommit(state, planCleanPublic(state));
  console.log(`Cleaned: ${state.directories.publicDir}`);
}

async function buildSinglePage(pagePath) {
  const state = await ensureState();
  const actions = await state.renderer.planPages([pagePath]);
  const result = await runCommit(state, actions);
  return { changed: result.changed.length > 0 };
}

async function removePage(pagePath) {
  const state = await ensureState();
  const actions = await state.renderer.planPageRemoval(pagePath);
  const result = await runCommit(state, actions);
  return result.changed.length > 0;
}

async function buildStylesIncremental(event, filePath) {
  const state = await ensureState();
  const absPath = path.resolve(filePath);
  const { sourceDir, publicDir } = state.directories;

  if (!isPathInside(sourceDir, absPath)) {
    return false;
  }

  if (path.extname(absPath).toLowerCase() !== '.scss') {
    return false;
  }

  const relativePath = path.relative(sourceDir, absPath);
  const isEntry = !path.basename(absPath).startsWith('_');

  let actions = [];

  if (event === 'unlink') {
    if (isEntry) {
      state.styles.entries.delete(absPath);
      actions = planScssRemoval(absPath);
    } else {
      scssGraph.remove(absPath);
      actions = planScssPartial(absPath);
    }
  } else if (isEntry) {
    const cssPath = path.resolve(publicDir, relativePath.replace(/\.scss$/i, '.css'));
    if (!isPathInside(publicDir, cssPath)) {
      console.error(`Skipping SCSS output outside public directory: ${cssPath}`);
      return false;
    }
    state.styles.entries.set(absPath, cssPath);
    actions = planScssEntry(absPath, cssPath);
  } else {
    actions = planScssPartial(absPath);
  }

  if (!actions || actions.length === 0) {
    return false;
  }

  const result = await runCommit(state, actions, 'styles');
  return result.changed.length > 0;
}

async function copyAssetIncremental(filePath) {
  const state = await ensureState();
  const absPath = path.resolve(filePath);
  const { sourceDir, publicDir } = state.directories;

  if (!isPathInside(sourceDir, absPath)) {
    return null;
  }

  if (!shouldCopyStatic(absPath, sourceDir, state.config.server.directories.pages)) {
    return null;
  }

  const relativePath = path.relative(sourceDir, absPath);
  const destPath = path.resolve(publicDir, relativePath);

  if (!isPathInside(publicDir, destPath)) {
    console.error(`Skipping copy outside public directory: ${destPath}`);
    return null;
  }

  state.assets.set(absPath, destPath);

  const actions = [
    {
      type: 'copy',
      from: absPath,
      out: destPath,
      meta: { label: 'Copied' },
    },
  ];

  const result = await runCommit(state, actions);
  return result.changed.length > 0 ? destPath : null;
}

async function removeAsset(filePath) {
  const state = await ensureState();
  const absPath = path.resolve(filePath);
  const destPath = state.assets.get(absPath);
  state.assets.delete(absPath);

  if (!destPath) {
    return;
  }

  const actions = [{ type: 'remove', out: destPath, meta: { label: 'Removed' } }];
  await runCommit(state, actions);
}

function allPages() {
  if (!buildState) {
    return [];
  }
  return buildState.renderer.listPages();
}

function getRenderer() {
  return buildState ? buildState.renderer : null;
}

function getDirectories() {
  return buildState ? buildState.directories : null;
}

function isPage(filePath) {
  if (!buildState) {
    return false;
  }
  return buildState.renderer.isRenderablePage(filePath);
}

module.exports = {
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
  cleanPublic,
};
