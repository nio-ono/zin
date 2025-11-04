#!/usr/bin/env node

const path = require('path');
const fs = require('fs-extra');
const { parseArgs } = require('node:util');
const { buildSite, cleanPublic } = require('../lib/build');
const serve = require('../lib/browser-sync');
const { promptConfirm } = require('../lib/utils');

async function main() {
  const args = parseArgs({
    allowPositionals: true,
    options: {
      yes: { type: 'boolean', short: 'y' },
      force: { type: 'boolean', short: 'f' },
      port: { type: 'string', short: 'p' },
    },
    tokens: true,
  });

  const command = args.positionals[0] || 'build';

  try {
    if (command === 'build') {
      await buildSite();
      return;
    }

    if (command === 'serve') {
      const portValue = args.values.port ? Number(args.values.port) : undefined;
      await serve({ port: portValue });
      return;
    }

    if (command === 'clean') {
      await cleanPublic();
      return;
    }

    if (command === 'init') {
      await initProject({ yes: Boolean(args.values.yes), force: Boolean(args.values.force) });
      return;
    }

    console.error('Unknown command');
    process.exit(1);
  } catch (error) {
    console.error('An error occurred:', error);
    process.exit(1);
  }
}

async function initProject({ yes = false, force = false } = {}) {
  const destinationDir = process.cwd();

  const templateSourceDir = path.join(__dirname, '..', 'source');
  const projectSourceDir = path.join(destinationDir, 'source');
  const configPath = path.join(destinationDir, 'config.js');
  const globalsPath = path.join(destinationDir, 'globals.js');

  const existingTargets = [];
  if (await fs.pathExists(projectSourceDir)) existingTargets.push(projectSourceDir);
  if (await fs.pathExists(configPath)) existingTargets.push(configPath);
  if (await fs.pathExists(globalsPath)) existingTargets.push(globalsPath);

  if (existingTargets.length > 0 && !force) {
    console.error('Initialization aborted: project files already exist. Use --force to overwrite.');
    return;
  }

  if (existingTargets.length > 0 && force && !yes) {
    const confirmed = await promptConfirm('Existing project files detected. Overwrite?');
    if (!confirmed) {
      console.log('Initialization aborted by user.');
      return;
    }
  }

  for (const target of existingTargets) {
    await fs.remove(target);
  }

  try {
    await fs.copy(templateSourceDir, projectSourceDir, { overwrite: true });
    console.log('Starter files have been copied to the source directory.');
  } catch (error) {
    console.error('An error occurred while copying starter files:', error);
    return;
  }

  const configTemplate = `module.exports = {
  server: {
    port: 3000,
    directories: {
      source: "source",
      public: "public",
      pages: "pages"
    }
  }
};`;
  try {
    await fs.writeFile(configPath, `${configTemplate}\n`);
    console.log('config.js created.');
  } catch (error) {
    console.error('Failed to create config.js:', error);
  }

  const globalsTemplate = `module.exports = {
  site: {
    name: "My Satsuma Project",
    description: "A description of my Satsuma project."
  }
};`;
  try {
    await fs.writeFile(globalsPath, `${globalsTemplate}\n`);
    console.log('globals.js created.');
  } catch (error) {
    console.error('Failed to create globals.js:', error);
  }

  console.log('Starter project initialized successfully.');
}

main();
