/**
 * REAL Blockchain Integration for Wordle Wars
 * Actually calls the deployed smart contract
 */

// This will be injected into the frontend HTML
const REAL_BLOCKCHAIN_INTEGRATION = `
// Real blockchain integration for deployed smart contract
async function createBlockchainTransaction(fromAddress, amount, type, gameData = null) {
    try {
        const provider = getProvider();
        if (!provider) {
            return { success: false, error: 'Wallet not connected' };
        }

        const connection = new solanaWeb3.Connection('https://api.devnet.solana.com', 'confirmed');
        const fromPubkey = new solanaWeb3.PublicKey(fromAddress);
        
        // Get escrow details from game data
        const escrowDetails = gameData?.escrowDetails || gameState.currentGame?.escrowDetails;
        if (!escrowDetails) {
            throw new Error('No escrow details provided by server');
        }
        
        // Create the REAL transaction to your deployed smart contract
        const transaction = new solanaWeb3.Transaction();
        
        // Program ID of your deployed contract
        const programId = new solanaWeb3.PublicKey('2E9mCNwZ2LLHjFpFQUC8K23ARHwhUEoMGq9yZpKWu7VM');
        
        // Game and escrow account addresses from server
        const gameAccount = new solanaWeb3.PublicKey(escrowDetails.gameAccount);
        const escrowAccount = new solanaWeb3.PublicKey(escrowDetails.escrowAccount);
        
        // Create the create_game instruction
        const createGameInstruction = new solanaWeb3.TransactionInstruction({
            keys: [
                { pubkey: fromPubkey, isSigner: true, isWritable: true }, // creator
                { pubkey: gameAccount, isSigner: true, isWritable: true }, // game_account
                { pubrow: escrowAccount, isSigner: true, isWritable: true }, // escrow_account
                { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false } // system_program
            ],
            programId: programId,
            data: Buffer.concat([
                Buffer.from([51, 230, 133, 164, 1, 127, 131, 173]), // create_game discriminator
                Buffer.alloc(8) // wager_amount (will be filled below)
            ])
        });
        
        // Set the wager amount in the instruction data
        const wagerLamports = Math.floor(amount * solanaWeb3.LAMPORTS_PER_SOL);
        const wagerBuffer = Buffer.alloc(8);
        wagerBuffer.writeBigUInt64LE(BigInt(wagerLamports), 0);
        createGameInstruction.data.set(wagerBuffer, 8);
        
        transaction.add(createGameInstruction);
        
        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubkey;
        
        // Sign and send the transaction
        const signedTransaction = await provider.signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signedTransaction.serialize());
        
        // Wait for confirmation
        await connection.confirmTransaction(signature, 'confirmed');
        
        return { 
            success: true, 
            signature: signature,
            message: 'Real blockchain transaction completed!'
        };
        
    } catch (error) {
        return { 
            success: false, 
            error: error.message 
        };
    }
}

// Real join game transaction
async function joinBlockchainGame(gameData) {
    try {
        const provider = getProvider();
        if (!provider) {
            return { success: false, error: 'Wallet not connected' };
        }

        const connection = new solanaWeb3.Connection('https://api.devnet.solana.com', 'confirmed');
        const fromPubkey = new solanaWeb3.PublicKey(gameState.walletAddress);
        
        const transaction = new solanaWeb3.Transaction();
        
        // Program ID of your deployed contract
        const programId = new solanaWeb3.PublicKey('2E9mCNwZ2LLHjFpFQUC8K23ARHwhUEoMGq9yZpKWu7VM');
        
        // Game and escrow account addresses
        const gameAccount = new solanaWeb3.PublicKey(gameData.gameAccount);
        const escrowAccount = new solanaWeb3.PublicKey(gameData.escrowAccount);
        
        // Create the join_game instruction
        const joinGameInstruction = new solanaWeb3.TransactionInstruction({
            keys: [
                { pubkey: fromPubkey, isSigner: true, isWritable: true }, // opponent
                { pubkey: gameAccount, isSigner: false, isWritable: true }, // game_account
                { pubkey: escrowAccount, isSigner: false, isWritable: true }, // escrow_account
                { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false } // system_program
            ],
            programId: programId,
            data: Buffer.from([102, 6, 61, 18, 1, 218, 35, 241]) // join_game discriminator
        });
        
        transaction.add(joinGameInstruction);
        
        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubkey;
        
        // Sign and send the transaction
        const signedTransaction = await provider.signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signedTransaction.serialize());
        
        // Wait for confirmation
        await connection.confirmTransaction(signature, 'confirmed');
        
        return { 
            success: true, 
            signature: signature,
            message: 'Successfully joined blockchain game!'
        };
        
    } catch (error) {
        return { 
            success: false, 
            error: error.message 
        };
    }
}

// Real settle game transaction
async function settleBlockchainGame(gameData, winnerAddress) {
    try {
        const provider = getProvider();
        if (!provider) {
            return { success: false, error: 'Wallet not connected' };
        }

        const connection = new solanaWeb3.Connection('https://api.devnet.solana.com', 'confirmed');
        
        const transaction = new solanaWeb3.Transaction();
        
        // Program ID of your deployed contract
        const programId = new solanaWeb3.PublicKey('2E9mCNwZ2LLHjFpFQUC8K23ARHwhUEoMGq9yZpKWu7VM');
        
        // Game and escrow account addresses
        const gameAccount = new solanaWeb3.PublicKey(gameData.gameAccount);
        const escrowAccount = new solanaWeb3.PublicKey(gameData.escrowAccount);
        const winnerPubkey = new solanaWeb3.PublicKey(winnerAddress);
        
        // Create the settle_game instruction
        const settleGameInstruction = new solanaWeb3.TransactionInstruction({
            keys: [
                { pubkey: gameAccount, isSigner: false, isWritable: true }, // game_account
                { pubkey: escrowAccount, isSigner: false, isWritable: true }, // escrow_account
                { pubkey: winnerPubkey, isSigner: false, isWritable: false }, // creator (will be validated by program)
                { pubkey: winnerPubkey, isSigner: false, isWritable: false }  // opponent (will be validated by program)
            ],
            programId: programId,
            data: Buffer.concat([
                Buffer.from([232, 219, 223, 42, 30, 200, 24, 108]), // settle_game discriminator
                winnerPubkey.toBuffer() // winner public key
            ])
        });
        
        transaction.add(settleGameInstruction);
        
        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = new solanaWeb3.PublicKey(gameState.walletAddress);
        
        // Sign and send the transaction
        const signedTransaction = await provider.signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signedTransaction.serialize());
        
        // Wait for confirmation
        await connection.confirmTransaction(signature, 'confirmed');
        
        return { 
            success: true, 
            signature: signature,
            message: 'Game settled on blockchain!'
        };
        
    } catch (error) {
        return { 
            success: false, 
            error: error.message 
        };
    }
}
`;

module.exports = REAL_BLOCKCHAIN_INTEGRATION;




