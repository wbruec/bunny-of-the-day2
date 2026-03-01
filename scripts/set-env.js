#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const apiKey = process.env.PIXABAY_API_KEY;

if (!apiKey) {
  console.error('ERROR: PIXABAY_API_KEY environment variable is not set.');
  console.error('Set it before running the build:');
  console.error('  PIXABAY_API_KEY=your_key npm run build');
  process.exit(1);
}

const content = `export const environment = {
  production: true,
  pixabayApiKey: '${apiKey}'
};
`;

const targetPath = path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts');
fs.writeFileSync(targetPath, content, 'utf8');
console.log(`✓ Wrote environment.prod.ts with API key`);
