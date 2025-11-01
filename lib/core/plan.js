const fs = require('fs-extra');
const path = require('path');
const { getAllFiles } = require('../fileOps');
const { isPathInside } = require('../renderer');
const {
  resetStyles,
  planScssEntry,
  planEntryRemoval,
  planStylesIncremental,
} = require('../styles');

function createCopyAction(from, out, meta) {
  return { type: 'copy', from, out, meta };
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

async function* planCleanPublic(ctx, fsImpl = fs) {
  const { publicDir } = ctx.directories;
  if (!(await fsImpl.pathExists(publicDir))) {
    return;
  }
  const entries = await fsImpl.readdir(publicDir);
  entries.sort();
  for (const entry of entries) {
    const target = path.resolve(publicDir, entry);
    yield { type: 'remove', out: target };
  }
}

async function* planStyles(ctx) {
  const { sourceDir, publicDir } = ctx.directories;
  const allFiles = await getAllFiles(sourceDir);
  const scssFiles = allFiles.filter(
    (file) => path.extname(file).toLowerCase() === '.scss' && !path.basename(file).startsWith('_'),
  );

  resetStyles();
  if (ctx.styles && ctx.styles.entries) {
    ctx.styles.entries.clear();
  }

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

    if (ctx.styles && ctx.styles.entries) {
      ctx.styles.entries.set(path.resolve(scssFile), cssPath);
    }

    const actions = planScssEntry(scssFile, cssPath);
    for (const action of actions) {
      yield action;
    }
  }
}

async function* planAssets(ctx) {
  const { sourceDir, publicDir } = ctx.directories;
  const allFiles = await getAllFiles(sourceDir);

  if (ctx.assets) {
    ctx.assets.clear();
  }

  const staticFiles = allFiles.filter((file) =>
    shouldCopyStatic(file, sourceDir, ctx.config.server.directories.pages),
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

    if (ctx.assets) {
      ctx.assets.set(path.resolve(staticFile), destPath);
    }

    yield createCopyAction(staticFile, destPath, { label: 'Copied' });
  }
}

async function* planPages(ctx, pages) {
  const actions = await ctx.renderer.planPages(pages);
  for (const action of actions) {
    yield action;
  }
}

async function* planSite(ctx, options = {}) {
  const { clean = true, fs: fsImpl = fs } = options;
  if (clean) {
    yield* planCleanPublic(ctx, fsImpl);
  }
  yield* planStyles(ctx);
  yield* planAssets(ctx);
  const pages = options.pages || ctx.renderer.listPages();
  yield* planPages(ctx, pages);
}

function planScssPartial(filePath) {
  return planStylesIncremental(filePath);
}

function planScssRemoval(filePath) {
  return planEntryRemoval(filePath);
}

module.exports = {
  planSite,
  planCleanPublic,
  planStyles,
  planAssets,
  planPages,
  planScssPartial,
  planScssRemoval,
  shouldCopyStatic,
};
