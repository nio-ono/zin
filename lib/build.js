const fs = require('fs-extra');
const path = require('path');
const { deleteDirectoryContents, getAllFiles } = require('./fileOps');
const { loadConfig, loadGlobals } = require('./config');
const { Renderer, resolveDirectories, isPathInside } = require('./renderer');
const {
  unregisterEntry,
  resetStyles,
  buildScssEntry,
  buildStylesIncremental: buildStylesIncrementalForFile,
  graph: scssGraph,
} = require('./styles');

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

async function ensureState() {
  if (!buildState) {
    await buildSite();
  }
  return buildState;
}

async function buildSite() {
  console.log('Starting site build...');
  const config = loadConfig();
  const globals = loadGlobals();
  validateConfig(config);

  const directories = createDirectoryMap(config.server.directories);
  const renderer = new Renderer(config.server.directories, globals);

  buildState = {
    config,
    globals,
    directories,
    renderer,
    styles: {
      entries: new Map(),
    },
    assets: new Map(),
  };

  await deleteDirectoryContents(directories.publicDir);
  await fs.ensureDir(directories.publicDir);

  await compileAllSCSS();
  await copyAllStatic();
  await renderer.initialize();

  console.log('Site built successfully.');
}

async function cleanPublic() {
  const config = loadConfig();
  validateConfig(config);
  const directories = createDirectoryMap(config.server.directories);
  await deleteDirectoryContents(directories.publicDir);
  console.log(`Cleaned: ${directories.publicDir}`);
}

async function compileAllSCSS() {
  const state = await ensureState();
  const { sourceDir, publicDir } = state.directories;

  const allFiles = await getAllFiles(sourceDir);
  const scssFiles = allFiles.filter(
    (file) => path.extname(file).toLowerCase() === '.scss' && !path.basename(file).startsWith('_'),
  );

  resetStyles();
  state.styles.entries.clear();

  for (const scssFile of scssFiles) {
    const relativePath = path.relative(sourceDir, scssFile);
    const cssPath = path.resolve(publicDir, relativePath.replace(/\.scss$/i, '.css'));
    if (!isPathInside(publicDir, cssPath)) {
      console.error(`Skipping SCSS output outside public directory: ${cssPath}`);
      continue;
    }

    const cssDir = path.dirname(cssPath);
    if (cssDir !== publicDir && !isPathInside(publicDir, cssDir)) {
      console.error(`Skipping directory creation outside public directory: ${cssDir}`);
      continue;
    }

    try {
      const result = await buildScssEntry(scssFile, cssPath);
      state.styles.entries.set(path.resolve(scssFile), cssPath);
      if (result.changed) {
        console.log(`Compiled SCSS: ${cssPath}`);
      }
    } catch (error) {
      console.error(`Failed to compile SCSS entry ${scssFile}:`, error);
    }
  }
}

function shouldCopyStatic(filePath, sourceDir, pagesDirName) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.ejs' || ext === '.scss') {
    return false;
  }
  const relative = path.relative(sourceDir, filePath);
  if (!pagesDirName) {
    return true;
  }
  const pagesPrefix = `${pagesDirName}${path.sep}`;
  return !relative.startsWith(pagesPrefix);
}

async function copyAllStatic() {
  const state = await ensureState();
  const { sourceDir, publicDir } = state.directories;
  const allFiles = await getAllFiles(sourceDir);

  state.assets.clear();

  const staticFiles = allFiles.filter((file) =>
    shouldCopyStatic(file, sourceDir, state.config.server.directories.pages),
  );

  for (const staticFile of staticFiles) {
    const relativePath = path.relative(sourceDir, staticFile);
    const destPath = path.resolve(publicDir, relativePath);
    if (!isPathInside(publicDir, destPath)) {
      console.error(`Skipping copy outside public directory: ${destPath}`);
      continue;
    }

    const destDir = path.dirname(destPath);
    if (destDir !== publicDir && !isPathInside(publicDir, destDir)) {
      console.error(`Skipping directory creation outside public directory: ${destDir}`);
      continue;
    }

    await fs.ensureDir(destDir);
    await fs.copy(staticFile, destPath);
    state.assets.set(path.resolve(staticFile), destPath);
    console.log(`Copied: ${destPath}`);
  }
}

async function buildSinglePage(pagePath) {
  const state = await ensureState();
  return state.renderer.renderPage(pagePath);
}

async function removePage(pagePath) {
  const state = await ensureState();
  await state.renderer.removePage(pagePath);
}

async function buildStylesIncremental(event, filePath) {
  const state = await ensureState();
  const absPath = path.resolve(filePath);
  const { sourceDir, publicDir } = state.directories;

  if (!isPathInside(sourceDir, absPath)) {
    return false;
  }

  const isScss = path.extname(absPath).toLowerCase() === '.scss';
  if (!isScss) {
    return false;
  }

  const relativePath = path.relative(sourceDir, absPath);
  const isEntry = !path.basename(absPath).startsWith('_');

  if (event === 'unlink') {
    if (isEntry) {
      unregisterEntry(absPath);
      state.styles.entries.delete(absPath);
      const cssPath = path.resolve(publicDir, relativePath.replace(/\.scss$/i, '.css'));
      try {
        await fs.remove(cssPath);
        await fs.remove(`${cssPath}.map`);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.error(`Failed to remove CSS for ${absPath}:`, error);
        }
      }
      return true;
    }

    scssGraph.remove(absPath);
    const outputs = await buildStylesIncrementalForFile(absPath);
    return outputs.length > 0;
  }

  if (isEntry) {
    const cssPath = path.resolve(publicDir, relativePath.replace(/\.scss$/i, '.css'));
    if (!isPathInside(publicDir, cssPath)) {
      console.error(`Skipping SCSS output outside public directory: ${cssPath}`);
      return false;
    }
    state.styles.entries.set(absPath, cssPath);
    try {
      const result = await buildScssEntry(absPath, cssPath);
      if (result.changed) {
        console.log(`Compiled SCSS: ${cssPath}`);
      }
      return result.changed;
    } catch (error) {
      console.error(`Failed to compile SCSS entry ${absPath}:`, error);
      return false;
    }
  }

  const outputs = await buildStylesIncrementalForFile(absPath);
  return outputs.length > 0;
}

async function copyAssetIncremental(filePath) {
  const state = await ensureState();
  const absPath = path.resolve(filePath);
  const { sourceDir, publicDir } = state.directories;

  if (!isPathInside(sourceDir, absPath)) {
    return null;
  }

  const relativePath = path.relative(sourceDir, absPath);
  const destPath = path.resolve(publicDir, relativePath);

  if (!isPathInside(publicDir, destPath)) {
    console.error(`Skipping copy outside public directory: ${destPath}`);
    return null;
  }

  const ext = path.extname(absPath).toLowerCase();
  if (ext === '.ejs' || ext === '.scss') {
    return null;
  }

  await fs.ensureDir(path.dirname(destPath));
  await fs.copy(absPath, destPath);
  state.assets.set(absPath, destPath);
  console.log(`Copied: ${destPath}`);
  return destPath;
}

async function removeAsset(filePath) {
  const state = await ensureState();
  const absPath = path.resolve(filePath);
  const destPath = state.assets.get(absPath);
  state.assets.delete(absPath);

  if (!destPath) {
    return;
  }

  try {
    await fs.remove(destPath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
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
