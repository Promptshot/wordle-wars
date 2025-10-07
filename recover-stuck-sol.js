/**
 * Recovery script to retrieve SOL from stuck/orphaned escrow accounts
 * Run this when you have SOL stuck in escrow from failed game creations
 */

const { Connection, Keypair, PublicKey, Transaction, SystemProgram } = require('@solana/web3.js');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
    console.log('🔧 SOL Recovery Tool for Stuck Escrow Accounts\n');
    
    // Get user's wallet private key
    const secretKeyInput = await question('Enter your wallet private key (array format like [1,2,3,...] or base58): ');
    
    let keypair;
    try {
        // Try parsing as JSON array
        const secretKeyArray = JSON.parse(secretKeyInput);
        keypair = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));
    } catch (e) {
        console.log('❌ Invalid private key format');
        rl.close();
        return;
    }
    
    console.log('\n✅ Wallet loaded:', keypair.publicKey.toString());
    
    // Get list of escrow account addresses
    console.log('\n📝 Enter the escrow account addresses you want to recover SOL from.');
    console.log('   (You can find these in your Phantom transaction history or browser console logs)');
    console.log('   Enter one address per line. Type "done" when finished.\n');
    
    const escrowAddresses = [];
    while (true) {
        const address = await question('Escrow address (or "done"): ');
        if (address.toLowerCase() === 'done') break;
        if (address.trim()) escrowAddresses.push(address.trim());
    }
    
    if (escrowAddresses.length === 0) {
        console.log('❌ No addresses provided');
        rl.close();
        return;
    }
    
    console.log(`\n📋 Will attempt to recover SOL from ${escrowAddresses.length} escrow account(s)\n`);
    
    // Connect to Solana devnet
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    let totalRecovered = 0;
    
    for (const escrowAddress of escrowAddresses) {
        try {
            console.log(`\n🔍 Checking escrow: ${escrowAddress}`);
            
            const escrowPubkey = new PublicKey(escrowAddress);
            const balance = await connection.getBalance(escrowPubkey);
            const balanceSOL = balance / 1e9;
            
            console.log(`   Balance: ${balanceSOL} SOL (${balance} lamports)`);
            
            if (balance === 0) {
                console.log('   ⚠️ No SOL to recover (account empty)');
                continue;
            }
            
            // Get rent-exempt minimum (we need to leave this)
            const accountInfo = await connection.getAccountInfo(escrowPubkey);
            if (!accountInfo) {
                console.log('   ⚠️ Account does not exist');
                continue;
            }
            
            const rentExempt = await connection.getMinimumBalanceForRentExemption(accountInfo.data.length);
            const recoverable = balance - rentExempt;
            const recoverableSOL = recoverable / 1e9;
            
            if (recoverable <= 0) {
                console.log(`   ⚠️ Only has rent-exempt minimum (${(rentExempt / 1e9).toFixed(6)} SOL), nothing to recover`);
                continue;
            }
            
            console.log(`   💰 Recoverable: ${recoverableSOL} SOL (leaving ${(rentExempt / 1e9).toFixed(6)} SOL for rent)`);
            
            const confirm = await question(`   Transfer ${recoverableSOL} SOL back to your wallet? (yes/no): `);
            if (confirm.toLowerCase() !== 'yes') {
                console.log('   ⏭️ Skipped');
                continue;
            }
            
            // Create transfer transaction
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: escrowPubkey,
                    toPubkey: keypair.publicKey,
                    lamports: recoverable,
                })
            );
            
            // Note: This will fail because we don't have the escrow account's private key!
            // The escrow account was created by the smart contract and we don't control it
            
            console.log('   ❌ ERROR: Cannot directly transfer from escrow account');
            console.log('   ℹ️  The escrow account is controlled by the smart contract');
            console.log('   ℹ️  You need to call the smart contract\'s cancel_game function instead');
            
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('⚠️  IMPORTANT: SOL in escrow accounts is controlled by the smart contract');
    console.log('⚠️  You cannot directly transfer it - you must use cancel_game');
    console.log('\n📝 To recover your SOL:');
    console.log('   1. Use the "Cancel Game" button in the frontend for waiting games');
    console.log('   2. Or manually call cancel_game on the smart contract for each escrow');
    console.log('='.repeat(60) + '\n');
    
    rl.close();
}

main().catch(console.error);

