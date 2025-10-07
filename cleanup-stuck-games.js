/**
 * Quick script to cleanup stuck games
 */

const fetch = require('node-fetch');

async function cleanupStuckGames() {
    try {
        console.log('🧹 Cleaning up stuck games...');
        
        const response = await fetch('http://localhost:3001/api/cleanup-stuck-games', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Cleanup result:', result);
        } else {
            console.error('❌ Cleanup failed:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

cleanupStuckGames();
