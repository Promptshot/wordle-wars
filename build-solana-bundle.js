#!/usr/bin/env node

/**
 * Build script to create a browser-compatible bundle of @solana/web3.js
 * This bundles all dependencies including Buffer polyfill
 */

const browserify = require('browserify');
const fs = require('fs');
const path = require('path');

console.log('🔨 Building Solana web3.js browser bundle...');

const outputPath = path.join(__dirname, 'public', 'solana-web3-bundle.js');

// Create browserify bundle
const b = browserify({
  standalone: 'solanaWeb3',
  debug: false
});

// Require @solana/web3.js
b.require('@solana/web3.js');

// Add Buffer polyfill
b.require('buffer/', { expose: 'buffer' });

// Bundle it
const writeStream = fs.createWriteStream(outputPath);

b.bundle()
  .on('error', (err) => {
    console.error('❌ Bundle failed:', err);
    process.exit(1);
  })
  .pipe(writeStream);

writeStream.on('finish', () => {
  console.log('✅ Bundle created successfully!');
  console.log(`📦 Output: ${outputPath}`);
  console.log('🎉 You can now use this file in your HTML!');
});





