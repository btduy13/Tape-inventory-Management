const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function getJavaScriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return getJavaScriptFiles(fullPath);
    return entry.isFile() && entry.name.endsWith('.js') ? [fullPath] : [];
  });
}

test('index has no duplicate element ids', () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  assert.deepEqual(duplicates, []);
});

test('every inline HTML handler resolves to an application function', () => {
  const handlers = [...html.matchAll(/\bon(?:click|change|input|submit)="\s*([A-Za-z_$][\w$]*)\s*\(/g)]
    .map(match => match[1]);
  const sources = getJavaScriptFiles(path.join(root, 'js'))
    .map(file => fs.readFileSync(file, 'utf8'))
    .join('\n');
  const missing = [...new Set(handlers)].filter(name => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return !new RegExp(`(?:async\\s+)?function\\s+${escaped}\\s*\\(|(?:const|let|var)\\s+${escaped}\\s*=`).test(sources);
  });
  assert.deepEqual(missing, []);
});
