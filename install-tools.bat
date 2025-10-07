@echo off
echo 🚀 Installing Solana Development Tools - Professional Setup
echo.

echo 📦 Installing Rust...
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
call %USERPROFILE%\.cargo\env

echo.
echo 🔧 Installing Solana CLI...
sh -c "$(curl -sSfL https://release.solana.com/v1.17.0/install)"
set PATH=%USERPROFILE%\.local\share\solana\install\active_release\bin;%PATH%

echo.
echo ⚓ Installing Anchor CLI...
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

echo.
echo ⚙️ Configuring Solana for devnet...
solana config set --url devnet
solana-keygen new --outfile %USERPROFILE%\.config\solana\id.json --no-bip39-passphrase

echo.
echo 💰 Getting devnet SOL...
solana airdrop 5

echo.
echo ✅ Professional Solana development environment ready!
echo.
echo 🎮 Next steps:
echo    1. Run: anchor build
echo    2. Run: anchor deploy
echo    3. Update program ID in code
echo    4. Test with real smart contract
echo.
pause

