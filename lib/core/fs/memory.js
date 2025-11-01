const path = require('path');

class MemoryFS {
  constructor(initialFiles = {}) {
    this.files = new Map();
    this.directories = new Set();
    this.directories.add(this.normalize(path.sep));

    for (const [target, content] of Object.entries(initialFiles)) {
      this.writeFile(target, content);
    }
  }

  normalize(target) {
    return path.resolve(target);
  }

  ensureDirStructure(target) {
    const dir = path.dirname(target);
    if (dir === target) {
      return;
    }
    const parts = dir.split(path.sep).filter(Boolean);
    let current = path.isAbsolute(dir) ? path.sep : '';
    if (path.isAbsolute(dir)) {
      this.directories.add(path.sep);
    }
    for (const part of parts) {
      current = path.join(current || path.sep, part);
      this.directories.add(this.normalize(current));
    }
  }

  bufferize(content) {
    if (Buffer.isBuffer(content)) {
      return Buffer.from(content);
    }
    if (typeof content === 'string') {
      return Buffer.from(content, 'utf8');
    }
    throw new TypeError('MemoryFS only accepts string or Buffer content');
  }

  async readFile(target) {
    const normalized = this.normalize(target);
    if (!this.files.has(normalized)) {
      const error = new Error(`ENOENT: no such file or directory, open '${target}'`);
      error.code = 'ENOENT';
      throw error;
    }
    return Buffer.from(this.files.get(normalized));
  }

  async writeFile(target, data) {
    const normalized = this.normalize(target);
    const buffer = this.bufferize(data);
    this.ensureDirStructure(normalized);
    this.files.set(normalized, buffer);
  }

  async mkdir(target) {
    const normalized = this.normalize(target);
    this.ensureDirStructure(path.join(normalized, 'placeholder'));
    this.directories.add(normalized);
  }

  async remove(target) {
    const normalized = this.normalize(target);
    this.files.delete(normalized);
    const prefix = `${normalized}${path.sep}`;
    for (const key of [...this.files.keys()]) {
      if (key.startsWith(prefix)) {
        this.files.delete(key);
      }
    }
    for (const dir of [...this.directories]) {
      if (dir === normalized || dir.startsWith(prefix)) {
        this.directories.delete(dir);
      }
    }
  }

  async readdir(target) {
    const normalized = this.normalize(target);
    const children = new Set();
    for (const key of this.files.keys()) {
      if (key.startsWith(`${normalized}${path.sep}`)) {
        const rest = key.slice(normalized.length + 1);
        if (rest && !rest.includes(path.sep)) {
          children.add(rest);
        }
      }
    }
    for (const dir of this.directories) {
      if (dir.startsWith(`${normalized}${path.sep}`)) {
        const rest = dir.slice(normalized.length + 1);
        if (rest && !rest.includes(path.sep)) {
          children.add(rest);
        }
      }
    }
    if (!this.directories.has(normalized) && !children.size) {
      const error = new Error(`ENOENT: no such file or directory, scandir '${target}'`);
      error.code = 'ENOENT';
      throw error;
    }
    return [...children];
  }

  async stat(target) {
    const normalized = this.normalize(target);
    if (this.directories.has(normalized)) {
      return {
        isDirectory: () => true,
        isFile: () => false,
      };
    }
    if (this.files.has(normalized)) {
      return {
        isDirectory: () => false,
        isFile: () => true,
      };
    }
    const error = new Error(`ENOENT: no such file or directory, stat '${target}'`);
    error.code = 'ENOENT';
    throw error;
  }

  async pathExists(target) {
    const normalized = this.normalize(target);
    return this.files.has(normalized) || this.directories.has(normalized);
  }
}

function createMemoryFS(initialFiles) {
  return new MemoryFS(initialFiles);
}

module.exports = createMemoryFS;
module.exports.MemoryFS = MemoryFS;
