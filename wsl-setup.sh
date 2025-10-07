#!/bin/bash
# Real dev approach using WSL2

echo "🚀 Setting up Solana development in WSL2"

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.17.0/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Install Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force

# Configure Solana
solana config set --url devnet
solana-keygen new --outfile ~/.config/solana/id.json

# Get devnet SOL
solana airdrop 2

# Build and deploy
anchor build
anchor deploy

echo "✅ Real deployment complete!"
