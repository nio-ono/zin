class DepGraph {
  constructor() {
    this.byPage = new Map();
    this.reverse = new Map();
  }

  record(page, dep) {
    if (!this.byPage.has(page)) this.byPage.set(page, new Set());
    this.byPage.get(page).add(dep);
    if (!this.reverse.has(dep)) this.reverse.set(dep, new Set());
    this.reverse.get(dep).add(page);
  }

  pagesAffectedBy(file) {
    if (this.reverse.has(file)) return [...this.reverse.get(file)];
    return [];
  }

  clearPage(page) {
    const deps = this.byPage.get(page);
    if (!deps) return;
    for (const d of deps) {
      const dependents = this.reverse.get(d);
      if (dependents) {
        dependents.delete(page);
        if (dependents.size === 0) this.reverse.delete(d);
      }
    }
    this.byPage.delete(page);
  }

  removeDependencyKey(dep) {
    const dependents = this.reverse.get(dep);
    if (!dependents) return;
    for (const page of dependents) {
      const deps = this.byPage.get(page);
      if (deps) {
        deps.delete(dep);
        if (deps.size === 0) this.byPage.delete(page);
      }
    }
    this.reverse.delete(dep);
  }
}

module.exports = { DepGraph };
