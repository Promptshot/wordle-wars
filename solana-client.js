/**
 * Simple Solana Client for Wordle Wars
 * Handles SOL transactions on devnet
 */

const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, sendAndConfirmTransaction } = require('@solana/web3.js');

class SolanaGameClient {
    constructor() {
        // Use Solana devnet for testing
        this.connection = new Connection('https://api.devnet.solana.com', 'confirmed');
        console.log('🔗 Solana client connected to devnet');
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
     * Create a simple escrow transaction
     * For now, we'll just simulate the transaction
     * In a real implementation, this would create an escrow account
     */
    async createGameEscrow(playerAddress, wagerAmount) {
        try {
            console.log(`🎮 Creating game escrow for ${playerAddress} with ${wagerAmount} SOL`);
            
            // For now, just validate the player has enough balance
            const balance = await this.getBalance(playerAddress);
            if (balance < wagerAmount) {
                return { 
                    success: false, 
                    error: `Insufficient balance. You have ${balance.toFixed(4)} SOL, need ${wagerAmount} SOL` 
                };
            }

            // Simulate escrow creation (in real implementation, this would create an escrow account)
            const escrowId = `escrow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            console.log(`✅ Escrow created: ${escrowId}`);
            
            return { 
                success: true, 
                escrowId,
                message: 'Game escrow created successfully'
            };
        } catch (error) {
            console.error('❌ Escrow creation failed:', error);
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
     * Settle game - distribute winnings
     */
    async settleGame(winnerAddress, loserAddress, wagerAmount, escrowId) {
        try {
            console.log(`🏆 Settling game ${escrowId}: Winner ${winnerAddress} gets ${wagerAmount * 2} SOL`);
            
            // In a real implementation, this would:
            // 1. Transfer 2x wager to winner
            // 2. Close escrow account
            // 3. Return rent to escrow creator
            
            // For now, just simulate the settlement
            const totalWinnings = wagerAmount * 2;
            console.log(`✅ Game settled: ${winnerAddress} wins ${totalWinnings} SOL`);
            
            return { 
                success: true, 
                winnerGets: totalWinnings,
                message: `Game settled! Winner gets ${totalWinnings} SOL`
            };
        } catch (error) {
            console.error('❌ Game settlement failed:', error);
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

module.exports = SolanaGameClient;