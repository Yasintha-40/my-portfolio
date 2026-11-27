'use strict';
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
fs.writeFileSync(path.join(__dirname, 'page-template.js'), `'use strict';\nmodule.exports = ${JSON.stringify(html)};\n`);
