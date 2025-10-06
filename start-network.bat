@echo off
echo Starting Sol Wordle servers for network access...
echo.
echo Your computer's IP address: 192.168.1.44
echo.
echo Frontend: http://192.168.1.44:8000/pump-style.html
echo Backend: http://192.168.1.44:3001
echo.
echo Starting servers...

start "Sol Wordle Server" cmd /k "node server.js"
timeout /t 2 /nobreak >nul
start "Sol Wordle Frontend" cmd /k "python serve.py"

echo.
echo Both servers are starting...
echo You can now access the game from other devices on your network at:
echo http://192.168.1.44:8000/pump-style.html
echo.
pause

