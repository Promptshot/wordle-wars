@echo off
echo 🧪 Testing Wordle Wars Setup
echo.

echo 📦 Checking Node.js dependencies...
npm list --depth=0

echo.
echo 🚀 Starting server...
echo    Server will start on http://localhost:3001
echo    Press Ctrl+C to stop the server
echo.

npm run dev
