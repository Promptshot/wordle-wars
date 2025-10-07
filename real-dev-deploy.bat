@echo off
echo 🚀 REAL DEV DEPLOYMENT - Wordle Wars Smart Contract
echo.

echo 📋 Step 1: Install Build Tools (if not done)
echo Run: install-build-tools.bat
echo.

echo 📋 Step 2: Install Solana CLI
echo Download from: https://docs.solana.com/cli/install-solana-cli-tools
echo.

echo 📋 Step 3: Install Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force

echo.
echo 📋 Step 4: Configure Solana
solana config set --url devnet
solana-keygen new --outfile ~/.config/solana/id.json

echo.
echo 📋 Step 5: Get Devnet SOL
solana airdrop 2

echo.
echo 📋 Step 6: Build and Deploy
anchor build
anchor deploy

echo.
echo ✅ REAL DEPLOYMENT COMPLETE!
echo Your smart contract is now live on Solana devnet!
echo.
pause
