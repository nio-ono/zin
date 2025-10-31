const fsSync = require('fs');
const path = require('path');
const sass = require('sass');
const { ScssGraph } = require('./scssGraph');
const { writeIfChanged } = require('./write');
const { pLimit } = require('./queue');

const graph = new ScssGraph();
const entryOutputs = new Map();
let limiter = pLimit(8);

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

async function buildScssEntry(entryPath, outPath) {
  const entryAbs = path.resolve(entryPath);
  const outAbs = path.resolve(outPath);
  graph.clearBy(entryAbs);

  const result = sass.renderSync({
    file: entryAbs,
    sourceMap: true,
    importer: [createImporter(entryAbs)],
  });

  const cssChanged = await writeIfChanged(outAbs, result.css);
  let mapChanged = false;
  if (result.map) {
    const mapPath = `${outAbs}.map`;
    mapChanged = await writeIfChanged(mapPath, result.map.toString());
  }

  registerEntry(entryAbs, outAbs);
  return { outputPath: outAbs, changed: cssChanged || mapChanged };
}

async function buildStylesIncremental(changedFile) {
  const absFile = path.resolve(changedFile);
  const affectedEntries = graph.entriesAffectedBy(absFile);
  const targets = affectedEntries.length > 0 ? affectedEntries : knownEntries();
  const uniqueTargets = [...new Set(targets)];
  const outputs = [];

  for (const entry of uniqueTargets) {
    const outPath = toPublicCss(entry);
    if (!outPath) {
      continue;
    }
    try {
      const result = await limiter(() => buildScssEntry(entry, outPath));
      if (result.changed) {
        console.log(`Compiled SCSS: ${result.outputPath}`);
        outputs.push(result.outputPath);
      }
    } catch (error) {
      console.error(`Failed to compile SCSS entry ${entry}:`, error);
    }
  }

  return outputs;
}

module.exports = {
  graph,
  setLimiter: (limit) => {
    limiter = limit;
  },
  registerEntry,
  unregisterEntry,
  knownEntries,
  toPublicCss,
  resetStyles,
  buildScssEntry,
  buildStylesIncremental,
};
