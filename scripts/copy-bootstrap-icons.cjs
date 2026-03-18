const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'node_modules', 'bootstrap-icons', 'font');
const outDir = path.join(__dirname, '..', 'public', 'icons');

fs.cpSync(src, outDir, { recursive: true });
console.log('Bootstrap Icons (CSS + fonts) copied to public/icons/');
