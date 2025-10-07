/**
 * Create a simple browser bundle for Solana
 * This uses esbuild for fast bundling
 */

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// First, install esbuild
const { execSync } = require('child_process');

console.log('📦 Installing esbuild...');
try {
    execSync('npm install --save-dev esbuild', { stdio: 'inherit' });
} catch (e) {
    console.log('esbuild already installed or install failed, continuing...');
}

console.log('🔨 Building Solana web3.js browser bundle...');

// Create entry file
const entryContent = `
// Import Buffer polyfill first
import { Buffer } from 'buffer';
window.Buffer = Buffer;

// Import Solana web3.js
import * as solanaWeb3 from '@solana/web3.js';

// Import Anchor SDK
import * as anchor from '@coral-xyz/anchor';

// Make them available globally
window.solanaWeb3 = solanaWeb3;
window.anchor = anchor;

console.log('✅ Solana web3.js loaded successfully!');
console.log('✅ Anchor SDK loaded successfully!');
`;

fs.writeFileSync('temp-entry.js', entryContent);

// Build with esbuild
esbuild.build({
    entryPoints: ['temp-entry.js'],
    bundle: true,
    format: 'iife',
    globalName: 'SolanaBundle',
    outfile: 'public/solana-bundle.js',
    platform: 'browser',
    target: ['es2020'],
    minify: false,
}).then(() => {
    // Clean up
    fs.unlinkSync('temp-entry.js');
    console.log('✅ Bundle created successfully!');
    console.log('📦 Output: public/solana-bundle.js');
    console.log('🎉 Add <script src="/solana-bundle.js"></script> to your HTML!');
}).catch((error) => {
    console.error('❌ Bundle failed:', error);
    process.exit(1);
});

