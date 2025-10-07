# Deploy Your Smart Contract to Solana Playground

Since Windows installation is having issues, let's use Solana Playground to deploy your contract:

## Step 1: Go to Solana Playground
1. Open https://beta.solpg.io/ in your browser
2. Create a new project
3. Name it "wordle-escrow"

## Step 2: Copy Your Smart Contract Code
Copy the contents of `programs/wordle-escrow/src/lib.rs` into the playground editor.

## Step 3: Update Cargo.toml
Copy the contents of `programs/wordle-escrow/Cargo.toml` into the playground's Cargo.toml.

## Step 4: Build and Deploy
1. Click "Build" in the playground
2. Once built successfully, click "Deploy"
3. Copy the deployed program ID

## Step 5: Update Your Application
Replace the program ID in:
- `Anchor.toml` (line 6 and 9)
- `solana-client.js` (line 91)
- Any frontend code that references the program ID

## Alternative: Use Your Existing Setup
Your current setup might work with a mock implementation. Let me check if we can make it work without full deployment.
