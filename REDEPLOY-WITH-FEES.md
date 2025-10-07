# 🚀 Redeploy Smart Contract with Fee System

## ✅ What Changed in the Smart Contract:

### New Features:
1. **2% winner fee** - Taken from winnings when someone wins normally
2. **5% forfeit fee** - Taken when a player forfeits/quits
3. **100% to house** - When both players lose (timeout or run out of guesses)
4. **House wallet** - `FRG1E6NiJ9UVN4T4v2r9hN1JzqB9r1uPuetCLXuqiRjT`

### Updated Functions:
- `settle_game(winner, is_forfeit, both_lost)` - Now handles fees and both-lose scenario
- `forfeit_game(forfeiter)` - New function for when player quits (5% fee)
- `cancel_game()` - Unchanged (still refunds creator for waiting games)

## 📋 Step-by-Step Deployment:

### 1. Go to Solana Playground
1. Open https://beta.solpg.io
2. Click "Import from GitHub" or create new project

### 2. Update Your Program
1. Copy the contents of `programs/wordle-escrow/src/lib.rs`
2. Paste into Solana Playground editor
3. Copy the contents of `programs/wordle-escrow/Cargo.toml`
4. Paste into Cargo.toml in Playground

### 3. Build the Program
```
build
```

Wait for compilation to complete. Fix any errors if they appear.

### 4. Deploy
```
deploy
```

### 5. Copy New Program ID
After deployment, you'll see:
```
Program Id: [NEW_PROGRAM_ID]
```

Copy this new Program ID!

### 6. Update All Files with New Program ID

Update these files with your new Program ID:

1. **programs/wordle-escrow/src/lib.rs** - Line 4:
   ```rust
   declare_id!("YOUR_NEW_PROGRAM_ID");
   ```

2. **Anchor.toml** - Lines for devnet and mainnet:
   ```toml
   wordle_escrow = "YOUR_NEW_PROGRAM_ID"
   ```

3. **real-solana-client.js** - Line with programId:
   ```javascript
   this.programId = new PublicKey('YOUR_NEW_PROGRAM_ID');
   ```

4. **src/program.ts** - PROGRAM_ID constant:
   ```typescript
   const PROGRAM_ID = new PublicKey('YOUR_NEW_PROGRAM_ID');
   ```

### 7. Generate New IDL

In Solana Playground, after building:
```
solpg export idl
```

Copy the IDL and update `wordle-escrow-idl.json`

### 8. Test

1. Create a game - check if 2% fee is deducted
2. Join a game - verify both players pay
3. Win a game - verify winner gets 98% of pot
4. Forfeit a game - verify 5% fee
5. Both lose - verify 100% goes to house wallet

## 💰 Fee Breakdown Examples:

**Normal Win (2% fee):**
- Player 1: 0.1 SOL
- Player 2: 0.1 SOL
- Total pot: 0.2 SOL
- Fee: 0.004 SOL (2%)
- Winner gets: 0.196 SOL

**Forfeit (5% fee):**
- Total pot: 0.2 SOL
- Fee: 0.01 SOL (5%)
- Winner gets: 0.19 SOL

**Both Lose (100% to house):**
- Total pot: 0.2 SOL
- House gets: 0.2 SOL
- Players get: 0 SOL

## 🔧 After Deployment:

Push changes to GitHub:
```bash
git add .
git commit -m "Update smart contract with fee system"
git push origin main
```

Railway and Netlify will auto-deploy!

## ✅ Verification:

Check transactions on Solana Explorer (devnet):
https://explorer.solana.com/?cluster=devnet

Look for your program ID and verify transfers to house wallet.

