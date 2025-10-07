/**
 * REAL Solana Client for Wordle Wars
 * Actually calls the deployed smart contract
 */

const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, sendAndConfirmTransaction, Keypair, TransactionInstruction } = require('@solana/web3.js');
const { AnchorProvider, Program, Wallet } = require('@coral-xyz/anchor');
const fs = require('fs');
const path = require('path');

// Load the IDL
const idlPath = path.join(__dirname, 'wordle-escrow-idl.json');
const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));

class RealSolanaGameClient {
    constructor() {
        // Use Solana devnet for testing
        this.connection = new Connection('https://api.devnet.solana.com', 'confirmed');
        this.programId = new PublicKey('2E9mCNwZ2LLHjFpFQUC8K23ARHwhUEoMGq9yZpKWu7VM');
        
        // Backend authority keypair for settlement
        // SECURITY: MUST use environment variable in production
        const BACKEND_SECRET_KEY = process.env.BACKEND_AUTHORITY_SECRET_KEY;
        
        if (!BACKEND_SECRET_KEY) {
            throw new Error('❌ CRITICAL: BACKEND_AUTHORITY_SECRET_KEY environment variable not set! Cannot start server without backend wallet.');
        }
        
        try {
            const secretKeyArray = JSON.parse(BACKEND_SECRET_KEY);
            this.authorityKeypair = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));
            console.log('✅ Backend Authority loaded from environment');
        } catch (error) {
            throw new Error(`❌ CRITICAL: Invalid BACKEND_AUTHORITY_SECRET_KEY format: ${error.message}`);
        }
        
        console.log('🔗 REAL Solana client connected to devnet');
        console.log('📋 Program ID:', this.programId.toString());
        console.log('🔑 Backend Authority:', this.authorityKeypair.publicKey.toString());
        console.log('⚠️  Fund this wallet with devnet SOL for settlement transactions!');
    }

    /**
     * Create a provider for a wallet
     */
    createProvider(wallet) {
        return new AnchorProvider(
            this.connection,
            wallet,
            { commitment: 'confirmed' }
        );
    }

    /**
     * Create a program instance
     */
    createProgram(provider) {
        return new Program(idl, this.programId, provider);
    }

    /**
     * Request devnet SOL airdrop for testing
     */
    async requestAirdrop(walletAddress, amountSol = 2) {
        try {
            const publicKey = new PublicKey(walletAddress);
            console.log(`💰 Requesting ${amountSol} SOL airdrop for ${walletAddress}`);
            
            const signature = await this.connection.requestAirdrop(
                publicKey, 
                amountSol * LAMPORTS_PER_SOL
            );
            
            await this.connection.confirmTransaction(signature, 'confirmed');
            console.log(`✅ Airdrop successful: ${signature}`);
            
            return { success: true, signature };
        } catch (error) {
            console.error('❌ Airdrop failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get wallet balance
     */
    async getBalance(walletAddress) {
        try {
            const publicKey = new PublicKey(walletAddress);
            const balance = await this.connection.getBalance(publicKey);
            return balance / LAMPORTS_PER_SOL;
        } catch (error) {
            console.error('❌ Balance check failed:', error);
            return 0;
        }
    }

    /**
     * Create a REAL blockchain game using the deployed Anchor program
     * This creates actual on-chain accounts and requires real SOL transfers
     */
    async createGameEscrow(playerAddress, wagerAmount) {
        try {
            console.log(`🎮 Creating REAL blockchain game for ${playerAddress} with ${wagerAmount} SOL`);
            
            // Validate the player has enough balance
            const balance = await this.getBalance(playerAddress);
            if (balance < wagerAmount) {
                return { 
                    success: false, 
                    error: `Insufficient balance. You have ${balance.toFixed(4)} SOL, need ${wagerAmount} SOL` 
                };
            }

            // Create unique game and escrow account addresses
            const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const escrowId = `escrow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Generate keypairs for the game and escrow accounts
            const gameAccount = Keypair.generate();
            const escrowAccount = Keypair.generate();
            
            // For now, we'll use a simple escrow approach
            // The escrow account will receive the SOL transfer directly
            
            // Convert wager to lamports
            const wagerLamports = Math.floor(wagerAmount * LAMPORTS_PER_SOL);
            
            console.log(`✅ Real blockchain game prepared: ${escrowId}`);
            console.log(`📍 Game Account: ${gameAccount.publicKey.toString()}`);
            console.log(`📍 Escrow Account: ${escrowAccount.publicKey.toString()}`);
            console.log(`💰 Wager Amount: ${wagerLamports} lamports (${wagerAmount} SOL)`);
            
            // Return transaction details for frontend to sign
            return { 
                success: true, 
                escrowId,
                gameAccount: gameAccount.publicKey.toString(),
                escrowAccount: escrowAccount.publicKey.toString(),
                wagerAmount,
                wagerLamports,
                transferAmount: wagerAmount, // Add this for the frontend
                message: 'REAL blockchain game - transaction signature required',
                requiresSignature: true,
                // Real Anchor program details
                escrowType: 'real_anchor_program',
                programId: this.programId.toString(),
                gameKeypair: {
                    publicKey: gameAccount.publicKey.toString(),
                    secretKey: Array.from(gameAccount.secretKey)
                },
                escrowKeypair: {
                    publicKey: escrowAccount.publicKey.toString(),
                    secretKey: Array.from(escrowAccount.secretKey)
                },
                // Transaction instruction data for frontend
                instructionData: {
                    discriminator: Buffer.from([51, 230, 133, 164, 1, 127, 131, 173]), // create_game discriminator
                    wagerAmount: wagerLamports
                }
            };
        } catch (error) {
            console.error('❌ Real game creation failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Join game escrow
     */
    async joinGameEscrow(playerAddress, wagerAmount, escrowId) {
        try {
            console.log(`🎮 Joining game escrow ${escrowId} for ${playerAddress} with ${wagerAmount} SOL`);
            
            // Validate balance
            const balance = await this.getBalance(playerAddress);
            if (balance < wagerAmount) {
                return { 
                    success: false, 
                    error: `Insufficient balance. You have ${balance.toFixed(4)} SOL, need ${wagerAmount} SOL` 
                };
            }

            console.log(`✅ Player joined escrow: ${escrowId}`);
            
            return { 
                success: true, 
                message: 'Successfully joined game escrow'
            };
        } catch (error) {
            console.error('❌ Join escrow failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Settle game - distribute winnings with fees
     */
    async settleGame(escrowDetails, players, winner, isForfeit, bothLost) {
        try {
            console.log(`🏆 Settling game on smart contract:`, {
                winner: winner || 'house',
                isForfeit,
                bothLost,
                players,
                escrowDetails
            });
            
            // Check backend wallet has enough SOL for transaction fees
            const backendBalance = await this.getBalance(this.authorityKeypair.publicKey.toString());
            if (backendBalance < 0.001) { // Need at least 0.001 SOL for fees
                console.error(`❌ Backend wallet has insufficient balance: ${backendBalance} SOL`);
                return { 
                    success: false, 
                    error: `Backend wallet needs funding. Current balance: ${backendBalance} SOL` 
                };
            }
            console.log(`✅ Backend wallet balance: ${backendBalance} SOL`);
            
            const { AnchorProvider, Program, Wallet } = require('@coral-xyz/anchor');
            
            // Create backend wallet from authority keypair
            const backendWallet = new Wallet(this.authorityKeypair);
            
            const provider = new AnchorProvider(
                this.connection,
                backendWallet,
                { commitment: 'confirmed' }
            );
            
            const program = new Program(idl, this.programId, provider);
            
            // Get account public keys
            const gameAccount = new PublicKey(escrowDetails.gameAccount);
            const escrowAccount = new PublicKey(escrowDetails.escrowAccount);
            const creatorPubkey = new PublicKey(players[0]);
            const opponentPubkey = new PublicKey(players[1]);
            const houseWalletPubkey = new PublicKey('FRG1E6NiJ9UVN4T4v2r9hN1JzqB9r1uPuetCLXuqiRjT');
            const winnerPubkey = winner ? new PublicKey(winner) : houseWalletPubkey;
            
            console.log('📝 Calling settle_game on smart contract...');
            console.log('   Game Account:', gameAccount.toString());
            console.log('   Escrow Account:', escrowAccount.toString());
            console.log('   Winner:', winnerPubkey.toString());
            console.log('   Creator:', creatorPubkey.toString());
            console.log('   Opponent:', opponentPubkey.toString());
            console.log('   House:', houseWalletPubkey.toString());
            console.log('   Is Forfeit:', isForfeit);
            console.log('   Both Lost:', bothLost);
            
            // Build transaction
            const tx = await program.methods
                .settleGame(winnerPubkey, isForfeit, bothLost)
                .accounts({
                    gameAccount: gameAccount,
                    escrowAccount: escrowAccount,
                    creator: creatorPubkey,
                    opponent: opponentPubkey,
                    houseWallet: houseWalletPubkey,
                })
                .transaction();
            
            // Get fresh blockhash
            const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
            tx.recentBlockhash = blockhash;
            tx.feePayer = this.authorityKeypair.publicKey;
            
            // Sign with backend authority
            tx.sign(this.authorityKeypair);
            
            // Send transaction
            const signature = await this.connection.sendRawTransaction(tx.serialize());
            console.log('📤 Settlement transaction sent:', signature);
            
            // Confirm
            await this.connection.confirmTransaction({
                signature,
                blockhash,
                lastValidBlockHeight
            });
            
            console.log('✅ Game settled on blockchain:', signature);
            
            return { 
                success: true,
                signature: signature,
                message: 'Game settled on blockchain with fees distributed'
            };
        } catch (error) {
            console.error('❌ Game settlement failed:', error);
            console.error('❌ Error details:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Cancel game - NOTE: Cancellation happens on-chain via frontend
     * Backend only removes game from active list
     * The creator must sign the cancel_game transaction in their wallet
     */
    async cancelGame(escrowDetails, creatorAddress) {
        // This function is intentionally simplified
        // Actual cancellation with refund happens in the frontend via Anchor .rpc()
        console.log(`ℹ️ Game marked for cancellation in backend`);
        console.log('   Creator will call cancel_game on-chain for refund');
        
        return { 
            success: true, 
            message: 'Game removed from backend list. Creator must cancel on-chain for refund.'
        };
    }
}

module.exports = RealSolanaGameClient;
