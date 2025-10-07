/**
 * Real Solana Program Integration
 * Professional implementation using Anchor framework
 */

import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import { PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import idl from '../wordle-escrow-idl.json';

// Program ID - will be updated after deployment
const PROGRAM_ID = new PublicKey('2E9mCNwZ2LLHjFpFQUC8K23ARHwhUEoMGq9yZpKWu7VM');

export class WordleEscrowProgram {
    private program: Program;
    private provider: AnchorProvider;

    constructor(provider: AnchorProvider) {
        this.provider = provider;
        this.program = new Program(idl as any, PROGRAM_ID, provider);
    }

    /**
     * Create a new game with real escrow
     */
    async createGame(wagerAmount: number): Promise<{ gameAccount: PublicKey; escrowAccount: PublicKey; signature: string }> {
        const wagerLamports = new BN(wagerAmount * web3.LAMPORTS_PER_SOL);
        
        // Generate keypairs for game and escrow accounts
        const gameAccount = Keypair.generate();
        const escrowAccount = Keypair.generate();

        console.log('🎮 Creating real blockchain game...');
        console.log('📍 Game Account:', gameAccount.publicKey.toString());
        console.log('📍 Escrow Account:', escrowAccount.publicKey.toString());
        console.log('💰 Wager:', wagerAmount, 'SOL');

        try {
            const signature = await this.program.methods
                .createGame(wagerLamports)
                .accounts({
                    creator: this.provider.wallet.publicKey,
                    gameAccount: gameAccount.publicKey,
                    escrowAccount: escrowAccount.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .signers([gameAccount, escrowAccount])
                .rpc();

            console.log('✅ Game created successfully!');
            console.log('📝 Transaction signature:', signature);

            return {
                gameAccount: gameAccount.publicKey,
                escrowAccount: escrowAccount.publicKey,
                signature
            };
        } catch (error) {
            console.error('❌ Game creation failed:', error);
            throw error;
        }
    }

    /**
     * Join an existing game
     */
    async joinGame(gameAccount: PublicKey, escrowAccount: PublicKey): Promise<string> {
        console.log('🤝 Joining blockchain game...');
        console.log('📍 Game Account:', gameAccount.toString());
        console.log('📍 Escrow Account:', escrowAccount.toString());

        try {
            const signature = await this.program.methods
                .joinGame()
                .accounts({
                    opponent: this.provider.wallet.publicKey,
                    gameAccount: gameAccount,
                    escrowAccount: escrowAccount,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            console.log('✅ Game joined successfully!');
            console.log('📝 Transaction signature:', signature);

            return signature;
        } catch (error) {
            console.error('❌ Game join failed:', error);
            throw error;
        }
    }

    /**
     * Settle game and pay winner
     */
    async settleGame(gameAccount: PublicKey, escrowAccount: PublicKey, winner: PublicKey): Promise<string> {
        console.log('🏆 Settling blockchain game...');
        console.log('📍 Game Account:', gameAccount.toString());
        console.log('📍 Escrow Account:', escrowAccount.toString());
        console.log('👑 Winner:', winner.toString());

        try {
            const signature = await this.program.methods
                .settleGame(winner)
                .accounts({
                    gameAccount: gameAccount,
                    escrowAccount: escrowAccount,
                    creator: this.provider.wallet.publicKey, // Will be validated by program
                    opponent: this.provider.wallet.publicKey, // Will be validated by program
                })
                .rpc();

            console.log('✅ Game settled successfully!');
            console.log('📝 Transaction signature:', signature);

            return signature;
        } catch (error) {
            console.error('❌ Game settlement failed:', error);
            throw error;
        }
    }

    /**
     * Cancel game and refund creator
     */
    async cancelGame(gameAccount: PublicKey, escrowAccount: PublicKey): Promise<string> {
        console.log('❌ Cancelling blockchain game...');
        console.log('📍 Game Account:', gameAccount.toString());
        console.log('📍 Escrow Account:', escrowAccount.toString());

        try {
            const signature = await this.program.methods
                .cancelGame()
                .accounts({
                    creator: this.provider.wallet.publicKey,
                    gameAccount: gameAccount,
                    escrowAccount: escrowAccount,
                })
                .rpc();

            console.log('✅ Game cancelled successfully!');
            console.log('📝 Transaction signature:', signature);

            return signature;
        } catch (error) {
            console.error('❌ Game cancellation failed:', error);
            throw error;
        }
    }

    /**
     * Fetch game account data
     */
    async getGameAccount(gameAccount: PublicKey) {
        try {
            const account = await this.program.account.gameAccount.fetch(gameAccount);
            return account;
        } catch (error) {
            console.error('❌ Failed to fetch game account:', error);
            return null;
        }
    }

    /**
     * Fetch escrow account data
     */
    async getEscrowAccount(escrowAccount: PublicKey) {
        try {
            const account = await this.program.account.escrowAccount.fetch(escrowAccount);
            return account;
        } catch (error) {
            console.error('❌ Failed to fetch escrow account:', error);
            return null;
        }
    }
}

