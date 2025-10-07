# Professional Solana Development Setup for Windows
Write-Host "🚀 Installing Solana Development Tools - Professional Setup" -ForegroundColor Green
Write-Host ""

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "❌ This script requires administrator privileges. Please run PowerShell as Administrator." -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "📦 Installing Rust..." -ForegroundColor Blue
try {
    Invoke-WebRequest -Uri "https://win.rustup.rs/x86_64" -OutFile "rustup-init.exe"
    .\rustup-init.exe -y
    Remove-Item "rustup-init.exe"
    Write-Host "✅ Rust installed successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Rust installation failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔧 Installing Solana CLI..." -ForegroundColor Blue
try {
    $solanaInstaller = "solana-install-init-x86_64-pc-windows-msvc.exe"
    Invoke-WebRequest -Uri "https://github.com/solana-labs/solana/releases/download/v1.17.0/$solanaInstaller" -OutFile $solanaInstaller
    .\$solanaInstaller v1.17.0
    Remove-Item $solanaInstaller
    Write-Host "✅ Solana CLI installed successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Solana CLI installation failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "⚓ Installing Anchor CLI..." -ForegroundColor Blue
try {
    # Add cargo to PATH
    $cargoPath = "$env:USERPROFILE\.cargo\bin"
    $env:PATH += ";$cargoPath"
    
    # Install Anchor CLI
    cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
    avm install latest
    avm use latest
    Write-Host "✅ Anchor CLI installed successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Anchor CLI installation failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "⚙️ Configuring Solana for devnet..." -ForegroundColor Blue
try {
    # Add Solana to PATH
    $solanaPath = "$env:USERPROFILE\.local\share\solana\install\active_release\bin"
    $env:PATH += ";$solanaPath"
    
    solana config set --url devnet
    $keypairPath = "$env:USERPROFILE\.config\solana\id.json"
    solana-keygen new --outfile $keypairPath --no-bip39-passphrase
    Write-Host "✅ Solana configured for devnet" -ForegroundColor Green
} catch {
    Write-Host "❌ Solana configuration failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "💰 Getting devnet SOL..." -ForegroundColor Blue
try {
    solana airdrop 5
    Write-Host "✅ Devnet SOL received" -ForegroundColor Green
} catch {
    Write-Host "❌ Airdrop failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "You can manually run: solana airdrop 5" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Professional Solana development environment ready!" -ForegroundColor Green
Write-Host ""
Write-Host "🎮 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Run: anchor build" -ForegroundColor White
Write-Host "   2. Run: anchor deploy" -ForegroundColor White
Write-Host "   3. Update program ID in code" -ForegroundColor White
Write-Host "   4. Test with real smart contract" -ForegroundColor White
Write-Host ""
Read-Host "Press Enter to continue"

