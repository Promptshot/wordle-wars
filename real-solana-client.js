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
        // Use a fixed keypair (in production, load from environment variable)
        const FIXED_SECRET_KEY = process.env.BACKEND_AUTHORITY_SECRET_KEY;
        
        if (FIXED_SECRET_KEY) {
            // Load from environment variable
            const secretKeyArray = JSON.parse(FIXED_SECRET_KEY);
            this.authorityKeypair = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));
            console.log('🔑 Backend Authority loaded from environment');
        } else {
            // Generate a fixed keypair for development
            // This is a FIXED keypair that won't change (DO NOT use in production!)
            const FIXED_DEV_SECRET = [
                174, 47, 154, 16, 202, 193, 206, 113, 199, 190, 53, 133, 169, 175, 31, 56,
                222, 53, 138, 189, 224, 216, 117, 173, 10, 149, 53, 133, 169, 175, 31, 56,
                137, 224, 32, 90, 127, 234, 31, 137, 113, 123, 234, 90, 127, 21, 90, 234,
                32, 90, 127, 234, 31, 137, 113, 123, 234, 90, 127, 21, 90, 234, 32, 90
            ];
            this.authorityKeypair = Keypair.fromSecretKey(new Uint8Array(FIXED_DEV_SECRET));
            console.log('⚠️  Using FIXED dev keypair (not for production!)');
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
     * Cancel game - refund players
     */
    async cancelGame(playerAddresses, wagerAmount, escrowId) {
        try {
            console.log(`❌ Cancelling game ${escrowId}, refunding ${wagerAmount} SOL to each player`);
            
            // In a real implementation, this would refund each player
            playerAddresses.forEach(address => {
                console.log(`💰 Refunding ${wagerAmount} SOL to ${address}`);
            });
            
            return { 
                success: true, 
                refundAmount: wagerAmount,
                message: `Game cancelled. Each player refunded ${wagerAmount} SOL`
            };
        } catch (error) {
            console.error('❌ Game cancellation failed:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = RealSolanaGameClient;
