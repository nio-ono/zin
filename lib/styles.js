const fsSync = require('fs');
const path = require('path');
const sass = require('sass');
const { ScssGraph } = require('./scssGraph');

const graph = new ScssGraph();
const entryOutputs = new Map();

function registerEntry(entryPath, outPath) {
  entryOutputs.set(path.resolve(entryPath), path.resolve(outPath));
}

function unregisterEntry(entryPath) {
  const absEntry = path.resolve(entryPath);
  entryOutputs.delete(absEntry);
  graph.clearBy(absEntry);
}

function knownEntries() {
  return [...entryOutputs.keys()];
}

function toPublicCss(entryPath) {
  const absEntry = path.resolve(entryPath);
  return entryOutputs.get(absEntry) || null;
}

function resetStyles() {
  entryOutputs.clear();
  graph.clear();
}

function buildCandidates(fromDir, url) {
  const absolute = path.resolve(fromDir, url);
  const candidates = new Set();
  candidates.add(absolute);
  if (!absolute.endsWith('.scss')) {
    candidates.add(`${absolute}.scss`);
  }

  const parsed = path.parse(absolute.endsWith('.scss') ? absolute : `${absolute}.scss`);
  const partialName = path.join(parsed.dir, `_${parsed.name}${parsed.ext || '.scss'}`);
  candidates.add(partialName);

  return [...candidates];
}

function createImporter(entryPath) {
  const entryAbs = path.resolve(entryPath);
  return (url, prev) => {
    const previous = prev && prev !== 'stdin' ? prev : entryAbs;
    const fromDir = path.dirname(previous);
    const candidates = buildCandidates(fromDir, url);
    const resolved = candidates.find((candidate) => fsSync.existsSync(candidate));
    if (resolved) {
      graph.record(resolved, entryAbs);
      return { file: resolved };
    }
    return { file: url };
  };
}

function createWriteAction(target, content, meta) {
  return { type: 'write', out: target, content, meta };
}

function createRemoveAction(target, meta) {
  return { type: 'remove', out: target, meta };
}

function planScssEntry(entryPath, outPath) {
  const entryAbs = path.resolve(entryPath);
  const outAbs = path.resolve(outPath);
  graph.clearBy(entryAbs);

  const result = sass.renderSync({
    file: entryAbs,
    sourceMap: true,
    importer: [createImporter(entryAbs)],
  });

  registerEntry(entryAbs, outAbs);

  const actions = [createWriteAction(outAbs, result.css, { label: 'Compiled SCSS' })];
  if (result.map) {
    const mapPath = `${outAbs}.map`;
    const mapBuffer = Buffer.isBuffer(result.map) ? result.map : Buffer.from(result.map.toString());
    actions.push(createWriteAction(mapPath, mapBuffer, { label: 'Compiled SCSS map' }));
  }

  return actions;
}

function planEntryRemoval(entryPath) {
  const entryAbs = path.resolve(entryPath);
  const outPath = toPublicCss(entryAbs);
  unregisterEntry(entryAbs);
  if (!outPath) {
    return [];
  }
  return [
    createRemoveAction(outPath, { label: 'Removed' }),
    createRemoveAction(`${outPath}.map`, { label: 'Removed' }),
  ];
}

function planStylesIncremental(changedFile) {
  const absFile = path.resolve(changedFile);
  const affectedEntries = graph.entriesAffectedBy(absFile);
  const targets = affectedEntries.length > 0 ? affectedEntries : knownEntries();
  const uniqueTargets = [...new Set(targets)].sort();
  const actions = [];

  for (const entry of uniqueTargets) {
    const outPath = toPublicCss(entry);
    if (!outPath) {
      continue;
    }
    try {
      const entryActions = planScssEntry(entry, outPath);
      actions.push(...entryActions);
    } catch (error) {
      console.error(`Failed to compile SCSS entry ${entry}:`, error);
    }
  }

  return actions;
}

module.exports = {
  graph,
  registerEntry,
  unregisterEntry,
  knownEntries,
  toPublicCss,
  resetStyles,
  planScssEntry,
  planEntryRemoval,
  planStylesIncremental,
};
