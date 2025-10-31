const fs = require('fs/promises');

async function codeFrame(file, line, column, context = 3) {
  let source;
  try {
    source = await fs.readFile(file, 'utf8');
  } catch (error) {
    return `Unable to read ${file}: ${error.message}`;
  }

  const lines = source.split('\n');
  const targetLine = Math.max(1, line || 1);
  const targetColumn = Math.max(0, column || 0);
  const start = Math.max(0, targetLine - 1 - context);
  const end = Math.min(lines.length - 1, targetLine - 1 + context);

  const output = [];

  for (let i = start; i <= end; i += 1) {
    const lineNumber = `${i + 1}`.padStart(4, ' ');
    const marker = i === targetLine - 1 ? '>' : ' ';
    output.push(`${marker} ${lineNumber}  ${lines[i] ?? ''}`);
    if (i === targetLine - 1) {
      const caretLine = '     '.concat(' '.repeat(Math.max(0, targetColumn)), '^');
      output.push(caretLine);
    }
  }

  return output.join('\n');
}

module.exports = { codeFrame };
