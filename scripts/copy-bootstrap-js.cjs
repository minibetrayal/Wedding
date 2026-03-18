const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'node_modules', 'bootstrap', 'dist', 'js', 'bootstrap.bundle.min.js');
const outDir = path.join(__dirname, '..', 'public', 'js');
const outFile = path.join(outDir, 'bootstrap.bundle.min.js');

fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(src, outFile);
console.log('Bootstrap JS copied to public/js/');
