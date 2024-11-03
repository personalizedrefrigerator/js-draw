// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('node:fs');

// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('node:path');

console.log('Copying licenses...');
const rootDir = path.dirname(__dirname);
const distDir = path.join(rootDir, 'dist');
fs.copyFileSync(path.join(rootDir, 'dependency-licenses.txt'), path.join(distDir, 'licenses.txt'));
