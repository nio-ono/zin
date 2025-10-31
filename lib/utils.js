async function promptConfirm(question, defaultValue = false) {
  const yesValues = new Set(['y', 'yes']);
  const noValues = new Set(['n', 'no']);
  const defaultLabel = defaultValue ? 'Y/n' : 'y/N';

  return new Promise((resolve) => {
    process.stdout.write(`${question} (${defaultLabel}): `);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.once('data', (data) => {
      const normalized = data.toString().trim().toLowerCase();
      process.stdin.pause();
      if (normalized === '') {
        resolve(defaultValue);
        return;
      }
      if (yesValues.has(normalized)) {
        resolve(true);
        return;
      }
      if (noValues.has(normalized)) {
        resolve(false);
        return;
      }
      resolve(defaultValue);
    });
  });
}

module.exports = { promptConfirm };
