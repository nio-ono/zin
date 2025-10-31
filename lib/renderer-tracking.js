const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const ejs = require('ejs');
const { DepGraph } = require('./depGraph');

function resolveIncludePath(baseSourceDir, fromFile, originalPath) {
  const base = originalPath.startsWith('/')
    ? path.resolve(baseSourceDir, originalPath.replace(/^\//, ''))
    : path.resolve(path.dirname(fromFile), originalPath);

  const candidates = [
    base,
    `${base}.ejs`,
    path.join(base, 'index.ejs'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return base;
}

function createTrackingRenderer(baseSourceDir) {
  const graph = new DepGraph();

  function includerFactory(currentPage) {
    return (originalPath, parsed) => {
      const from = parsed && parsed.filename ? parsed.filename : currentPage;
      const resolved = resolveIncludePath(baseSourceDir, from, originalPath);
      graph.record(currentPage, resolved);
      return { filename: resolved };
    };
  }

  async function renderWithTracking(filePath, locals, currentPage) {
    const str = await fsp.readFile(filePath, 'utf8');
    const html = await ejs.render(str, locals, {
      filename: filePath,
      root: baseSourceDir,
      includer: includerFactory(currentPage),
      cache: false,
    });
    return html;
  }

  async function renderPage(pagePath, locals) {
    graph.clearPage(pagePath);
    const html = await renderWithTracking(pagePath, locals, pagePath);
    return { html };
  }

  async function renderFile(filePath, locals, currentPage) {
    const html = await renderWithTracking(filePath, locals, currentPage);
    return { html };
  }

  return { renderPage, renderFile, graph };
}

module.exports = { createTrackingRenderer };
