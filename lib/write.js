const crypto = require('crypto');
const nodeFs = require('fs/promises');
const path = require('path');

const defaultFs = {
  readFile: (target) => nodeFs.readFile(target),
  writeFile: (target, data) => nodeFs.writeFile(target, data),
  mkdir: (target, options) => nodeFs.mkdir(target, { recursive: true, ...(options || {}) }),
};

function toBuffer(content) {
  if (Buffer.isBuffer(content)) {
    return content;
  }
  if (typeof content === 'string') {
    return Buffer.from(content, 'utf8');
  }
  throw new TypeError('writeIfChanged expected a string or Buffer');
}

async function writeIfChanged(dest, content, fsImpl = defaultFs) {
  const buffer = toBuffer(content);
  const newHash = crypto.createHash('sha1').update(buffer).digest('hex');
  let oldHash = null;

  try {
    const existing = await fsImpl.readFile(dest);
    oldHash = crypto.createHash('sha1').update(existing).digest('hex');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  if (oldHash === newHash) {
    return false;
  }

  if (fsImpl.mkdir) {
    await fsImpl.mkdir(path.dirname(dest), { recursive: true });
  }
  await fsImpl.writeFile(dest, buffer);
  return true;
}

module.exports = { writeIfChanged, defaultFs };
