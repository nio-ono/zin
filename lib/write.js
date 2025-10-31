const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

function toBuffer(content) {
  if (Buffer.isBuffer(content)) {
    return content;
  }
  if (typeof content === 'string') {
    return Buffer.from(content, 'utf8');
  }
  throw new TypeError('writeIfChanged expected a string or Buffer');
}

async function writeIfChanged(dest, content) {
  const buffer = toBuffer(content);
  const newHash = crypto.createHash('sha1').update(buffer).digest('hex');
  let oldHash = null;

  try {
    const existing = await fs.readFile(dest);
    oldHash = crypto.createHash('sha1').update(existing).digest('hex');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  if (oldHash === newHash) {
    return false;
  }

  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, buffer);
  return true;
}

module.exports = { writeIfChanged };
