const fs = require('fs-extra');
const path = require('path');
const { createTrackingRenderer } = require('./renderer-tracking');
const { writeIfChanged } = require('./write');

const TEMPLATE_DIR_NAME = 'templates';
const PARTIALS_DIR_NAME = 'partials';

function isPathInside(parentPath, childPath) {
  const relative = path.relative(parentPath, childPath);
  return !!relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function resolveDirectories(directories) {
  const sourceDir = path.resolve(directories.source);
  const publicDir = path.resolve(directories.public);
  const pagesDir = path.resolve(sourceDir, directories.pages);
  return { sourceDir, publicDir, pagesDir };
}

function shouldSkipDirectory(dirName) {
  const normalized = dirName.toLowerCase();
  return normalized === TEMPLATE_DIR_NAME || normalized === PARTIALS_DIR_NAME;
}

function isPartialFile(baseName) {
  return baseName.startsWith('_');
}

function computeRelativePath(itemPath, sourceDir, pagesDir) {
  return isPathInside(pagesDir, itemPath)
    ? path.relative(pagesDir, itemPath)
    : path.relative(sourceDir, itemPath);
}

function deriveOutputTargets(relativePath, publicDir) {
  const fileName = path.basename(relativePath);
  if (fileName.toLowerCase() === 'index.ejs') {
    const outputDir = path.resolve(publicDir, path.dirname(relativePath));
    return { outputDir, outputFilePath: path.resolve(outputDir, 'index.html') };
  }
  const outputDir = path.resolve(publicDir, relativePath.replace(/\.ejs$/i, ''));
  return { outputDir, outputFilePath: path.resolve(outputDir, 'index.html') };
}

function extractConfigAndContent(ejsContent, pagePath) {
  const configRegex = /<%[\s\n]*const\s+config\s*=\s*([\s\S]*?);[\s\n]*%>/;
  const matches = ejsContent.match(configRegex);
  let pageConfig = {};

  if (matches && matches[1]) {
    try {
      pageConfig = new Function(`return ${matches[1]}`)();
    } catch (err) {
      console.error(`Error parsing config in ${pagePath}:`, err);
    }
  }

  return { pageConfig, content: ejsContent };
}

function deriveCollectionPath(pagePath, sourceDir, pagesDir) {
  const isInPagesDir = isPathInside(pagesDir, pagePath);
  const relativePath = isInPagesDir
    ? path.relative(pagesDir, pagePath)
    : path.relative(sourceDir, pagePath);
  const fileName = path.basename(relativePath, '.ejs');
  const dirName = path.dirname(relativePath);

  if (fileName.toLowerCase() === 'index') {
    return dirName === '.' ? '/' : `/${dirName}/`;
  }

  return `/${dirName}/${fileName}/`;
}

class Renderer {
  constructor(directories, globals) {
    this.directories = resolveDirectories(directories);
    this.globals = globals;
    this.tracker = createTrackingRenderer(this.directories.sourceDir);
    this.graph = this.tracker.graph;
    this.pageEntries = new Map();
    this.collections = {};
    this.allPages = [];
  }

  async initialize() {
    this.allPages = await this.discoverPages(this.directories.sourceDir);
    await this.preloadEntries(this.allPages);
    this.rebuildCollections();
    for (const pagePath of this.allPages) {
      await this.renderPage(pagePath);
    }
  }

  async discoverPages(startDir) {
    const discovered = new Set();
    await this.walkDirectory(startDir, discovered);
    return Array.from(discovered).sort();
  }

  async walkDirectory(currentDir, accumulator) {
    let items;
    try {
      items = await fs.readdir(currentDir);
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }

    for (const item of items) {
      const itemPath = path.resolve(currentDir, item);
      const stat = await fs.stat(itemPath);

      if (stat.isDirectory()) {
        if (shouldSkipDirectory(item)) {
          continue;
        }
        await this.walkDirectory(itemPath, accumulator);
        continue;
      }

      if (!stat.isFile() || path.extname(itemPath).toLowerCase() !== '.ejs') {
        continue;
      }

      const baseName = path.basename(itemPath);
      if (isPartialFile(baseName)) {
        continue;
      }

      const templateDir = path.resolve(this.directories.sourceDir, TEMPLATE_DIR_NAME);
      if (isPathInside(templateDir, itemPath)) {
        continue;
      }

      accumulator.add(itemPath);
    }
  }

  async preloadEntries(pagePaths) {
    for (const pagePath of pagePaths) {
      await this.updatePageEntry(pagePath);
    }
  }

  async updatePageEntry(pagePath) {
    const absPath = path.resolve(pagePath);
    const rawContent = await fs.readFile(absPath, 'utf8');
    const { pageConfig, content } = extractConfigAndContent(rawContent, absPath);
    const relativePath = computeRelativePath(
      absPath,
      this.directories.sourceDir,
      this.directories.pagesDir,
    );
    const output = deriveOutputTargets(relativePath, this.directories.publicDir);
    const collectionName = path.basename(path.dirname(absPath));
    const collectionKey = `collection:${collectionName}`;

    this.pageEntries.set(absPath, {
      config: pageConfig,
      rawContent: content,
      relativePath,
      collectionName,
      collectionKey,
      output,
    });

    if (!this.allPages.includes(absPath)) {
      this.allPages.push(absPath);
    }

    return this.pageEntries.get(absPath);
  }

  rebuildCollections() {
    const collections = {};

    for (const [pagePath, entry] of this.pageEntries.entries()) {
      const collectionName = entry.collectionName;
      if (!collections[collectionName]) {
        collections[collectionName] = [];
      }

      collections[collectionName].push({
        config: entry.config,
        path: deriveCollectionPath(pagePath, this.directories.sourceDir, this.directories.pagesDir),
      });
    }

    for (const key of Object.keys(collections)) {
      collections[key].sort((a, b) => a.path.localeCompare(b.path));
    }

    this.collections = collections;
  }

  createCollectionsProxy(currentPage) {
    const collections = this.collections;
    return new Proxy(collections, {
      get: (target, prop, receiver) => {
        if (typeof prop === 'string' && Object.prototype.hasOwnProperty.call(target, prop)) {
          this.graph.record(currentPage, `collection:${prop}`);
        }
        const value = Reflect.get(target, prop, receiver);
        return value;
      },
      has: (target, prop) => Reflect.has(target, prop),
      ownKeys: (target) => Reflect.ownKeys(target),
      getOwnPropertyDescriptor: (target, prop) =>
        Object.getOwnPropertyDescriptor(target, prop),
    });
  }

  createRenderingContext(pagePath, entry) {
    return {
      content: entry.rawContent,
      site: this.globals.site,
      collections: this.createCollectionsProxy(pagePath),
      ...entry.config,
    };
  }

  async renderPage(pagePath) {
    const absPath = path.resolve(pagePath);
    const entry = await this.updatePageEntry(absPath);
    this.rebuildCollections();

    const renderingContext = this.createRenderingContext(absPath, entry);
    const pageRender = await this.tracker.renderPage(absPath, renderingContext);
    let html = pageRender.html;

    if (entry.config && entry.config.template) {
      const templatePath = path.resolve(
        this.directories.sourceDir,
        TEMPLATE_DIR_NAME,
        `${entry.config.template}.ejs`,
      );
      const templateExists = await fs.pathExists(templatePath);
      if (!templateExists) {
        console.error(`Template "${entry.config.template}.ejs" not found for ${absPath}. Skipping.`);
        return null;
      }
      this.graph.record(absPath, templatePath);
      const templateContext = { ...renderingContext, content: html };
      const templateRender = await this.tracker.renderFile(templatePath, templateContext, absPath);
      html = templateRender.html;
    }

    const { outputDir, outputFilePath } = entry.output;

    if (outputDir && outputDir !== this.directories.publicDir && !isPathInside(this.directories.publicDir, outputDir)) {
      console.error(`Skipping write outside public directory: ${outputDir}`);
      return null;
    }

    if (!isPathInside(this.directories.publicDir, outputFilePath)) {
      console.error(`Skipping write outside public directory: ${outputFilePath}`);
      return null;
    }

    const changed = await writeIfChanged(outputFilePath, html);
    if (changed) {
      console.log(`Rendered: ${outputFilePath}`);
    }
    return { outputFilePath, changed };
  }

  listPages() {
    return this.allPages.slice();
  }

  getCollections() {
    return this.collections;
  }

  getEntry(pagePath) {
    const absPath = path.resolve(pagePath);
    return this.pageEntries.get(absPath) || null;
  }

  async removePage(pagePath) {
    const absPath = path.resolve(pagePath);
    const entry = this.pageEntries.get(absPath);

    this.graph.clearPage(absPath);
    this.graph.removeDependencyKey(absPath);

    if (!entry) {
      return;
    }

    this.pageEntries.delete(absPath);
    this.allPages = this.allPages.filter((p) => p !== absPath);
    this.rebuildCollections();

    if (entry.output && entry.output.outputDir) {
      try {
        await fs.remove(entry.output.outputDir);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
    }
  }

  isRenderablePage(filePath) {
    const absPath = path.resolve(filePath);
    if (path.extname(absPath).toLowerCase() !== '.ejs') return false;
    const baseName = path.basename(absPath);
    if (isPartialFile(baseName)) return false;
    const templateDir = path.resolve(this.directories.sourceDir, TEMPLATE_DIR_NAME);
    if (isPathInside(templateDir, absPath)) return false;
    return isPathInside(this.directories.sourceDir, absPath);
  }
}

module.exports = {
  Renderer,
  isPathInside,
  resolveDirectories,
  computeRelativePath,
  deriveOutputTargets,
};
