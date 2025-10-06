# Wordle Wars 🎮⚔️

**Skill Based 1v1 Wagers. Winner Takes All.**

A skill-based multiplayer Wordle game where players wager SOL and compete head-to-head. The winner takes the entire pot!

## 🚀 Live Demo

[Your domain will go here]

## 🎯 Features

- **Real Phantom Wallet Integration**: Connect your Solana wallet
- **1v1 Skill-Based Competition**: No luck, just skill
- **SOL Wagering**: Real cryptocurrency stakes
- **Winner Takes All**: Winner gets the entire pot
- **Real-Time Multiplayer**: Socket.IO powered gameplay
- **Game History**: Track completed games and winnings

## 🛠️ Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express, Socket.IO
- **Blockchain**: Solana (Phantom Wallet)
- **Real-time**: WebSocket connections

## 📦 Quick Start

### Prerequisites
- Node.js 16+ installed
- Phantom Wallet browser extension

### Local Development

1. **Clone the repository**
   ```bash
   git clone [your-repo-url]
   cd wordle-wars
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the servers**
   ```bash
   # Start backend server
   npm start
   
   # In another terminal, start frontend server
   python -m http.server 8000
   ```

4. **Open the game**
   - Navigate to `http://localhost:8000/pump-style.html`

## 🌐 Deployment

### Option 1: Netlify + Railway (Recommended)

**Frontend (Netlify):**
1. Connect your GitHub repo to Netlify
2. Set build command: `echo "No build needed"`
3. Set publish directory: `/`
4. Deploy!

**Backend (Railway):**
1. Connect your GitHub repo to Railway
2. Railway will auto-detect Node.js
3. Set start command: `npm start`
4. Deploy!

### Option 2: VPS Deployment

1. **Set up server** (Ubuntu 20.04+)
2. **Install Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Clone and setup**
   ```bash
   git clone [your-repo-url]
   cd wordle-wars
   npm install
   ```

4. **Install PM2**
   ```bash
   npm install -g pm2
   pm2 start server.js --name "wordle-wars"
   pm2 startup
   pm2 save
   ```

5. **Setup Nginx** (for serving static files and SSL)
6. **Configure domain** to point to your server

## 🔧 Configuration

### Environment Variables

Create a `.env` file for production:

```env
PORT=3001
NODE_ENV=production
```

### Server URLs

Update the `SERVER_URL` in `pump-style.html` for production:

```javascript
const SERVER_URL = 'https://your-backend-domain.com';
```

## 🎮 How to Play

1. **Connect Wallet**: Click "Connect Wallet" to link your Phantom wallet
2. **Create Game**: Set your wager amount and create a game
3. **Wait for Opponent**: Another player can join your game
4. **Play Wordle**: Guess the 5-letter word in 6 tries
5. **Win SOL**: First to guess correctly wins the entire pot!

## 🏆 Game Rules

- **Minimum Bet**: 0.022 SOL
- **Maximum Bet**: 10 SOL
- **Time Limit**: 5 minutes per game
- **Winner Takes All**: No house edge, winner gets everything
- **Forfeit Rules**: 
  - Before opponent joins: 5% fee (95% refund)
  - After opponent joins: 100% loss

## 🔒 Security Features

- **Server-side validation**: All game logic validated on backend
- **Input sanitization**: XSS prevention
- **Rate limiting**: Prevents spam
- **Wallet validation**: Solana address format checking

## 📱 Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

**Note**: Phantom Wallet required for SOL transactions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues or questions:
- Create an issue on GitHub
- Check the troubleshooting section below

## 🔧 Troubleshooting

### Phantom Wallet Not Connecting
- Ensure you're on HTTPS (required for production)
- Check if Phantom extension is installed and enabled
- Try refreshing the page

### Server Connection Issues
- Verify backend server is running
- Check CORS settings
- Ensure firewall allows connections

### Game Not Starting
- Check browser console for errors
- Verify wallet is connected
- Ensure sufficient SOL balance

---

**Built with ❤️ for the Solana gaming community**

