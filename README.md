# Wordle Wars - Solana Blockchain Game

A real-time multiplayer Wordle game with SOL wagers, built on Solana blockchain using Anchor framework.

## 🎯 Features

- **Real Blockchain Integration**: Uses Solana devnet with proper escrow accounts
- **Anchor Framework**: Smart contracts written in Rust using Anchor
- **Real SOL Wagers**: Players bet actual SOL on game outcomes
- **Multiplayer**: Real-time gameplay with Socket.IO
- **Wallet Integration**: Phantom wallet support with transaction signing

## 🏗️ Architecture

### Smart Contract (Anchor Program)
- **Program ID**: `WordleEscrow111111111111111111111111111111`
- **Location**: `programs/wordle-escrow/src/lib.rs`
- **Features**:
  - Create game escrow accounts
  - Join games with SOL deposits
  - Settle games and distribute winnings
  - Cancel games and refund players

### Backend (Node.js)
- **Server**: Express.js with Socket.IO
- **Blockchain Client**: Custom Solana client for escrow management
- **Real-time**: WebSocket communication for game state

### Frontend (HTML/JS)
- **Wallet**: Phantom wallet integration
- **UI**: Modern, responsive design
- **Transactions**: Real Solana transaction signing

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Solana CLI
- Anchor CLI
- Phantom Wallet

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Install Anchor CLI**:
   ```bash
   npm install -g @coral-xyz/anchor-cli
   ```

3. **Install Solana CLI**:
   ```bash
   sh -c "$(curl -sSfL https://release.solana.com/v1.17.0/install)"
   ```

### Development Setup

1. **Configure Solana for devnet**:
   ```bash
   solana config set --url devnet
   solana-keygen new --outfile ~/.config/solana/id.json
   ```

2. **Get devnet SOL**:
   ```bash
   solana airdrop 2
   ```

3. **Build and deploy the Anchor program**:
   ```bash
   anchor build
   anchor deploy
   ```

4. **Start the backend server**:
   ```bash
   npm run dev
   ```

5. **Open the frontend**:
   - Navigate to `http://localhost:3001`
   - Connect your Phantom wallet
   - Get devnet SOL using the "Get Devnet SOL" button

## 🎮 How to Play

1. **Connect Wallet**: Connect your Phantom wallet
2. **Get Devnet SOL**: Use the airdrop button to get test SOL
3. **Create Game**: Set a wager amount and create a game
4. **Sign Transaction**: Approve the blockchain transaction
5. **Wait for Opponent**: Another player joins your game
6. **Play Wordle**: Make guesses within the time limit
7. **Win/Lose**: Winner takes all SOL, loser gets nothing

## 🔧 Development

### Smart Contract Development

The Anchor program is located in `programs/wordle-escrow/`:

- **`src/lib.rs`**: Main program logic
- **`Cargo.toml`**: Rust dependencies
- **`Anchor.toml`**: Anchor configuration

### Backend Development

- **`server.js`**: Express server with Socket.IO
- **`solana-client.js`**: Blockchain interaction client
- **`package.json`**: Node.js dependencies

### Frontend Development

- **`pump-style.html`**: Main frontend application
- **Wallet Integration**: Phantom wallet connection
- **Transaction Handling**: Solana transaction signing

## 🧪 Testing

### Test the Smart Contract
```bash
anchor test
```

### Test the Full Application
1. Start the server: `npm run dev`
2. Open two browser windows
3. Connect different wallets
4. Create and join games
5. Test the complete flow

## 📚 Documentation

### Solana Concepts Used
- **Program Derived Addresses (PDAs)**: For escrow accounts
- **Cross Program Invocations (CPIs)**: For SOL transfers
- **Account Model**: Game state storage
- **Transaction Signing**: Wallet integration

### Anchor Framework
- **Instructions**: create_game, join_game, settle_game, cancel_game
- **Accounts**: GameAccount, EscrowAccount
- **Error Handling**: Custom error codes
- **Security**: Proper validation and checks

## 🚨 Important Notes

- **Devnet Only**: This uses Solana devnet for testing
- **Real Transactions**: All SOL transfers are real blockchain transactions
- **Wallet Required**: Phantom wallet is required to play
- **Transaction Fees**: Small fees apply to all blockchain operations

## 🔒 Security

- **Input Validation**: All user inputs are validated
- **Balance Checks**: Insufficient balance protection
- **Game State**: Server-authoritative game logic
- **Transaction Signing**: All transactions require wallet signatures

## 📞 Support

For issues or questions:
1. Check the console logs for detailed error messages
2. Ensure your wallet has sufficient devnet SOL
3. Verify the Anchor program is deployed correctly
4. Check network connectivity to Solana devnet

## 🎉 Production Deployment

To deploy to production:
1. Deploy the Anchor program to Solana mainnet
2. Update the program ID in the configuration
3. Deploy the backend to a cloud service
4. Deploy the frontend to a CDN
5. Update wallet connection to mainnet

---

**Built with ❤️ using Solana, Anchor, and modern web technologies**