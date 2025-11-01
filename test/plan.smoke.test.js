const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs/promises');
const { planSite } = require('../lib/core/plan');
const { commit } = require('../lib/core/commit');
const createMemoryFS = require('../lib/core/fs/memory');
const { loadConfig, loadGlobals } = require('../lib/config');
const { Renderer, resolveDirectories } = require('../lib/renderer');
const { getAllFiles } = require('../lib/fileOps');

function asPlan(actions) {
  return (async function* () {
    for (const action of actions) {
      yield action;
    }
  })();
}

function createContext(config, globals, directories) {
  const renderer = new Renderer(config.server.directories, globals);
  return renderer.initialize().then(() => ({
    config,
    globals,
    directories,
    renderer,
    styles: {
      entries: new Map(),
    },
    assets: new Map(),
  }));
}

test('planner emits deterministic write actions and can commit to memory', async () => {
  const config = loadConfig();
  const globals = loadGlobals();
  const resolved = resolveDirectories(config.server.directories);
  const directories = {
    ...resolved,
    stylesDir: path.resolve(resolved.sourceDir, 'styles'),
    assetsDir: path.resolve(resolved.sourceDir, 'assets'),
    scriptsDir: path.resolve(resolved.sourceDir, 'scripts'),
  };

  const ctx = await createContext(config, globals, directories);
  const actions = [];
  for await (const action of planSite(ctx)) {
    actions.push(action);
  }

  const indexWrite = actions.find((action) =>
    action.type === 'write' && action.out === path.resolve(directories.publicDir, 'index.html'),
  );
  assert.ok(indexWrite, 'expected planner to propose index.html write');

  const sourceFiles = await getAllFiles(directories.sourceDir);
  const seed = {};
  for (const file of sourceFiles) {
    seed[path.resolve(file)] = await fs.readFile(file);
  }

  const memoryFs = createMemoryFS(seed);
  await commit(asPlan(actions), memoryFs, {
    concurrency: 4,
    publicDir: directories.publicDir,
  });

  const committed = await memoryFs.readFile(path.resolve(directories.publicDir, 'index.html'));
  assert.ok(committed.length > 0, 'expected index.html to exist in memory filesystem');
});
