const path = require('path');
const { pLimit } = require('../queue');
const { writeIfChanged } = require('../write');
const realFs = require('./fs/real');
const { isPathInside } = require('../renderer');

function resolveConcurrency(value) {
  if (!Number.isInteger(value) || value < 1) {
    return 1;
  }
  return value;
}

function logAction(action, target) {
  if (!action.meta || !action.meta.label) {
    return;
  }
  console.log(`${action.meta.label}: ${target}`);
}

async function applyWrite(action, fsAdapter, publicDir) {
  if (!isPathInside(publicDir, action.out)) {
    console.error(`Skipping write outside public directory: ${action.out}`);
    return { changed: false };
  }
  const changed = await writeIfChanged(action.out, action.content, fsAdapter);
  if (changed) {
    logAction(action, action.out);
  }
  return { changed };
}

async function applyCopy(action, fsAdapter, publicDir) {
  if (!isPathInside(publicDir, action.out)) {
    console.error(`Skipping copy outside public directory: ${action.out}`);
    return { changed: false };
  }
  const buffer = await fsAdapter.readFile(action.from);
  const changed = await writeIfChanged(action.out, buffer, fsAdapter);
  if (changed) {
    logAction(action, action.out);
  }
  return { changed };
}

async function applyRemove(action, fsAdapter, publicDir) {
  if (!isPathInside(publicDir, action.out) && path.resolve(action.out) !== path.resolve(publicDir)) {
    console.error(`Skipping remove outside public directory: ${action.out}`);
    return false;
  }
  try {
    await fsAdapter.remove(action.out);
    logAction(action, action.out);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function commit(plan, fsAdapter = realFs, options = {}) {
  const { concurrency = 8, publicDir } = options;
  if (!publicDir) {
    throw new TypeError('commit requires a publicDir option');
  }

  const limit = pLimit(resolveConcurrency(concurrency));
  const changedOutputs = new Set();
  const tasks = [];

  for await (const action of plan) {
    if (!action || !action.type) {
      continue;
    }

    if (!action.out && action.type !== 'copy') {
      continue;
    }

    if (action.type === 'write') {
      tasks.push(
        limit(async () => {
          const result = await applyWrite(action, fsAdapter, publicDir);
          if (result.changed) {
            changedOutputs.add(path.resolve(action.out));
          }
        }),
      );
      continue;
    }

    if (action.type === 'copy') {
      if (!action.from) {
        console.error(`Skipping copy without source: ${action.out}`);
        continue;
      }
      tasks.push(
        limit(async () => {
          const result = await applyCopy(action, fsAdapter, publicDir);
          if (result.changed) {
            changedOutputs.add(path.resolve(action.out));
          }
        }),
      );
      continue;
    }

    if (action.type === 'remove') {
      tasks.push(limit(() => applyRemove(action, fsAdapter, publicDir)));
    }
  }

  await Promise.all(tasks);

  return {
    changed: [...changedOutputs].sort(),
  };
}

module.exports = { commit };
