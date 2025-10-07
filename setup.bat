@echo off
echo 🚀 Setting up Wordle Wars - Solana Blockchain Game
echo.

echo 📦 Installing Node.js dependencies...
npm install

echo.
echo 🔧 Installing Anchor CLI...
npm install -g @coral-xyz/anchor-cli

echo.
echo ⚙️ Configuring Solana for devnet...
solana config set --url devnet

echo.
echo 💰 Getting devnet SOL...
solana airdrop 2

echo.
echo 🏗️ Building Anchor program...
anchor build

echo.
echo 🚀 Deploying to devnet...
anchor deploy

echo.
echo ✅ Setup complete! 
echo.
echo 🎮 To start the game:
echo    1. Run: npm run dev
echo    2. Open: http://localhost:3001
echo    3. Connect your Phantom wallet
echo    4. Get devnet SOL and start playing!
echo.
pause
