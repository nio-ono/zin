const path = require('path');

class ScssGraph {
  constructor() {
    this.importers = new Map();
    this.reverse = new Map();
  }

  normalize(value) {
    return path.resolve(value);
  }

  record(imp, by) {
    const importPath = this.normalize(imp);
    const byPath = this.normalize(by);

    if (!this.importers.has(byPath)) {
      this.importers.set(byPath, new Set());
    }
    this.importers.get(byPath).add(importPath);

    if (!this.reverse.has(importPath)) {
      this.reverse.set(importPath, new Set());
    }
    this.reverse.get(importPath).add(byPath);
  }

  entriesAffectedBy(file) {
    const filePath = this.normalize(file);
    const affected = this.reverse.get(filePath);
    if (!affected) {
      return [];
    }
    return [...affected];
  }

  clearBy(by) {
    const byPath = this.normalize(by);
    const imports = this.importers.get(byPath);
    if (!imports) {
      return;
    }
    for (const dep of imports) {
      const reverseDeps = this.reverse.get(dep);
      if (reverseDeps) {
        reverseDeps.delete(byPath);
        if (reverseDeps.size === 0) {
          this.reverse.delete(dep);
        }
      }
    }
    this.importers.delete(byPath);
  }

  remove(file) {
    const filePath = this.normalize(file);
    const importers = this.reverse.get(filePath);
    if (importers) {
      for (const importer of importers) {
        const deps = this.importers.get(importer);
        if (deps) {
          deps.delete(filePath);
          if (deps.size === 0) {
            this.importers.delete(importer);
          }
        }
      }
      this.reverse.delete(filePath);
    }
  }

  clear() {
    this.importers.clear();
    this.reverse.clear();
  }
}

module.exports = { ScssGraph };
