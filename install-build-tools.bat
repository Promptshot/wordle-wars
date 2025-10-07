@echo off
echo 🔧 Installing Visual Studio Build Tools for Anchor CLI
echo.

echo 📥 Downloading Visual Studio Build Tools...
powershell -Command "Invoke-WebRequest -Uri 'https://aka.ms/vs/17/release/vs_buildtools.exe' -OutFile 'vs_buildtools.exe'"

echo.
echo 🚀 Installing Build Tools...
vs_buildtools.exe --quiet --wait --add Microsoft.VisualStudio.Workload.VCTools --add Microsoft.VisualStudio.Component.VC.Tools.x86.x64 --add Microsoft.VisualStudio.Component.Windows10SDK.19041

echo.
echo ✅ Build Tools installed! Restart your terminal and run:
echo    anchor --version
echo.
pause
