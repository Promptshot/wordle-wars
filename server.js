const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const RealSolanaGameClient = require('./real-solana-client');

// House wallet for fees and both-lose scenarios
const HOUSE_WALLET = 'FRG1E6NiJ9UVN4T4v2r9hN1JzqB9r1uPuetCLXuqiRjT';

// Helper function to settle game on blockchain
async function settleGameOnBlockchain(game, winner, isForfeit, bothLost) {
    try {
        console.log(`💰 Settling game ${game.id} on blockchain:`, {
            winner: winner || 'none',
            isForfeit,
            bothLost,
            escrowDetails: game.escrowDetails
        });
        
        // Call smart contract settle_game instruction via the Solana client
        const result = await solanaClient.settleGame(
            game.escrowDetails,
            game.players,
            winner || HOUSE_WALLET,
            isForfeit,
            bothLost
        );
        
        if (result.success) {
            console.log(`✅ Game settled on blockchain: ${result.signature}`);
        } else {
            console.error(`❌ Blockchain settlement failed: ${result.error}`);
        }
        
        return result;
    } catch (error) {
        console.error('❌ Blockchain settlement failed:', error);
        return { success: false, error: error.message };
    }
}

const app = express();
const server = http.createServer(app);

// Environment configuration
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize REAL Solana client
const solanaClient = new RealSolanaGameClient();

// CORS configuration for production
const allowedOrigins = NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL || 'https://your-domain.com'] 
    : ["http://localhost:8000", "http://127.0.0.1:8000", "http://192.168.1.44:8000"];

const io = socketIo(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Security middleware
app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

// Rate limiting (simple in-memory implementation)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute (more lenient for testing)

function rateLimit(req, res, next) {
    const clientId = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!rateLimitMap.has(clientId)) {
        rateLimitMap.set(clientId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return next();
    }
    
    const clientData = rateLimitMap.get(clientId);
    
    if (now > clientData.resetTime) {
        clientData.count = 1;
        clientData.resetTime = now + RATE_LIMIT_WINDOW;
        return next();
    }
    
    if (clientData.count >= RATE_LIMIT_MAX_REQUESTS) {
        return res.status(429).json({ error: 'Too many requests' });
    }
    
    clientData.count++;
    next();
}

app.use(rateLimit);
app.use(express.json({ limit: '10kb' })); // Limit JSON payload size

// Input validation functions
function validateWalletAddress(address) {
    if (!address || typeof address !== 'string') {
        return false;
    }
    // Basic Solana address validation (44 characters, base58)
    const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return solanaAddressRegex.test(address);
}

function validateWager(wager) {
    if (typeof wager === 'string') {
        wager = parseFloat(wager);
    }
    if (isNaN(wager) || !isFinite(wager)) {
        return false;
    }
    // Allow wagers between 0.022 and 10 SOL
    return wager >= 0.022 && wager <= 10;
}

function validateGameId(gameId) {
    if (!gameId || typeof gameId !== 'string') {
        return false;
    }
    // Game ID format: game_timestamp_randomstring
    const gameIdRegex = /^game_\d+_[a-z0-9]{9}$/;
    return gameIdRegex.test(gameId);
}

function sanitizeString(str) {
    if (typeof str !== 'string') {
        return '';
    }
    // Remove potentially dangerous characters
    return str.replace(/[<>\"'&]/g, '').trim();
}

// In-memory storage (simple for MVP)
let games = [];
const completedGames = []; // in-memory recent feed
let players = new Map(); // socketId -> player info
let socketIdToWallet = new Map();
let connectedWallets = new Set();

// Word list (same as frontend)
const words = [
    'ABOUT', 'ABOVE', 'ABUSE', 'ACTOR', 'ACUTE', 'ADMIT', 'ADOPT', 'ADULT', 'AFTER', 'AGAIN',
    'AGENT', 'AGREE', 'AHEAD', 'ALARM', 'ALBUM', 'ALERT', 'ALIEN', 'ALIGN', 'ALIKE', 'ALIVE',
    'ALLOW', 'ALONE', 'ALONG', 'ALTER', 'AMONG', 'ANGER', 'ANGLE', 'ANGRY', 'APART', 'APPLE',
    'APPLY', 'ARENA', 'ARGUE', 'ARISE', 'ARRAY', 'ASIDE', 'ASSET', 'AVOID', 'AWAKE', 'AWARD',
    'AWARE', 'BADLY', 'BAKER', 'BASES', 'BASIC', 'BEACH', 'BEGAN', 'BEGIN', 'BEING', 'BELOW',
    'BENCH', 'BILLY', 'BIRTH', 'BLACK', 'BLAME', 'BLANK', 'BLIND', 'BLOCK', 'BLOOD', 'BOARD',
    'BOOST', 'BOOTH', 'BOUND', 'BRAIN', 'BRAND', 'BRASS', 'BRAVE', 'BREAD', 'BREAK', 'BREED',
    'BRIEF', 'BRING', 'BROAD', 'BROKE', 'BROWN', 'BUILD', 'BUILT', 'BUYER', 'CABLE', 'CALIF',
    'CARRY', 'CATCH', 'CAUSE', 'CHAIN', 'CHAIR', 'CHAOS', 'CHARM', 'CHART', 'CHASE', 'CHEAP',
    'CHECK', 'CHEST', 'CHIEF', 'CHILD', 'CHINA', 'CHOSE', 'CIVIL', 'CLAIM', 'CLASS', 'CLEAN',
    'CLEAR', 'CLICK', 'CLIMB', 'CLOCK', 'CLOSE', 'CLOUD', 'COACH', 'COAST', 'COULD', 'COUNT',
    'COURT', 'COVER', 'CRAFT', 'CRASH', 'CRAZY', 'CREAM', 'CRIME', 'CROSS', 'CROWD', 'CROWN',
    'CRUDE', 'CURVE', 'CYCLE', 'DAILY', 'DANCE', 'DATED', 'DEALT', 'DEATH', 'DEBUT', 'DELAY',
    'DEPTH', 'DOING', 'DOUBT', 'DOZEN', 'DRAFT', 'DRAMA', 'DRANK', 'DRAWN', 'DREAM', 'DRESS',
    'DRILL', 'DRINK', 'DRIVE', 'DROVE', 'DYING', 'EAGER', 'EARLY', 'EARTH', 'EIGHT', 'ELITE',
    'EMPTY', 'ENEMY', 'ENJOY', 'ENTER', 'ENTRY', 'EQUAL', 'ERROR', 'EVENT', 'EVERY', 'EXACT',
    'EXIST', 'EXTRA', 'FAITH', 'FALSE', 'FAULT', 'FIBER', 'FIELD', 'FIFTH', 'FIFTY', 'FIGHT',
    'FINAL', 'FIRST', 'FIXED', 'FLASH', 'FLEET', 'FLOOR', 'FLUID', 'FOCUS', 'FORCE', 'FORTH',
    'FORTY', 'FORUM', 'FOUND', 'FRAME', 'FRANK', 'FRAUD', 'FRESH', 'FRONT', 'FROST', 'FRUIT',
    'FULLY', 'FUNNY', 'GIANT', 'GIVEN', 'GLASS', 'GLOBE', 'GOING', 'GRACE', 'GRADE', 'GRAND',
    'GRANT', 'GRASS', 'GRAVE', 'GREAT', 'GREEN', 'GROSS', 'GROUP', 'GROWN', 'GUARD', 'GUESS',
    'GUEST', 'GUIDE', 'HAPPY', 'HARRY', 'HEART', 'HEAVY', 'HORSE', 'HOTEL', 'HOUSE', 'HUMAN',
    'IDEAL', 'IMAGE', 'INDEX', 'INNER', 'INPUT', 'ISSUE', 'JAPAN', 'JIMMY', 'JOINT', 'JONES',
    'JUDGE', 'KNOWN', 'LABEL', 'LARGE', 'LASER', 'LATER', 'LAUGH', 'LAYER', 'LEARN', 'LEASE',
    'LEAST', 'LEAVE', 'LEGAL', 'LEVEL', 'LEWIS', 'LIGHT', 'LIMIT', 'LINKS', 'LIVES', 'LOCAL',
    'LOOSE', 'LOWER', 'LUCKY', 'LUNCH', 'LYING', 'MAGIC', 'MAJOR', 'MAKER', 'MARCH', 'MARIA',
    'MATCH', 'MAYBE', 'MAYOR', 'MEANT', 'MEDIA', 'METAL', 'MIGHT', 'MINOR', 'MINUS', 'MIXED',
    'MODEL', 'MONEY', 'MONTH', 'MORAL', 'MOTOR', 'MOUNT', 'MOUSE', 'MOUTH', 'MOVED', 'MOVIE',
    'MUSIC', 'NEEDS', 'NEVER', 'NEWLY', 'NIGHT', 'NOISE', 'NORTH', 'NOTED', 'NOVEL', 'NURSE',
    'OCCUR', 'OCEAN', 'OFFER', 'OFTEN', 'ORDER', 'OTHER', 'OUGHT', 'PAINT', 'PANEL', 'PAPER',
    'PARTY', 'PEACE', 'PETER', 'PHASE', 'PHONE', 'PHOTO', 'PIANO', 'PIECE', 'PILOT', 'PITCH',
    'PLACE', 'PLAIN', 'PLANE', 'PLANT', 'PLATE', 'PLAZA', 'PLOT', 'PLUG', 'PLUS', 'POINT',
    'POUND', 'POWER', 'PRESS', 'PRICE', 'PRIDE', 'PRIME', 'PRINT', 'PRIOR', 'PRIZE', 'PROOF',
    'PROUD', 'PROVE', 'QUEEN', 'QUICK', 'QUIET', 'QUITE', 'RADIO', 'RAISE', 'RANGE', 'RAPID',
    'RATIO', 'REACH', 'READY', 'REALM', 'REBEL', 'REFER', 'RELAX', 'REPAY', 'REPLY', 'RIGHT',
    'RIGID', 'RIVER', 'ROBIN', 'ROGER', 'ROMAN', 'ROUGH', 'ROUND', 'ROUTE', 'ROYAL', 'RURAL',
    'SCALE', 'SCENE', 'SCOPE', 'SCORE', 'SENSE', 'SERVE', 'SETUP', 'SEVEN', 'SHALL', 'SHAPE',
    'SHARE', 'SHARP', 'SHEET', 'SHELF', 'SHELL', 'SHIFT', 'SHINE', 'SHIRT', 'SHOCK', 'SHOOT',
    'SHORT', 'SHOWN', 'SIDED', 'SIGHT', 'SILLY', 'SINCE', 'SIXTY', 'SIZED', 'SKILL', 'SLEEP',
    'SLIDE', 'SMALL', 'SMART', 'SMILE', 'SMITH', 'SMOKE', 'SNAKE', 'SNOW', 'SOLAR', 'SOLID',
    'SOLVE', 'SORRY', 'SOUND', 'SOUTH', 'SPACE', 'SPARE', 'SPEAK', 'SPEED', 'SPEND', 'SPENT',
    'SPLIT', 'SPOKE', 'SPORT', 'STAFF', 'STAGE', 'STAKE', 'STAND', 'START', 'STATE', 'STEAM',
    'STEEL', 'STEEP', 'STEER', 'STEPS', 'STICK', 'STILL', 'STOCK', 'STONE', 'STOOD', 'STORE',
    'STORM', 'STORY', 'STRIP', 'STUCK', 'STUDY', 'STUFF', 'STYLE', 'SUGAR', 'SUITE', 'SUPER',
    'SWEET', 'TABLE', 'TAKEN', 'TASTE', 'TAXES', 'TEACH', 'TEETH', 'TERRY', 'TEXAS', 'THANK',
    'THEFT', 'THEIR', 'THEME', 'THERE', 'THESE', 'THICK', 'THING', 'THINK', 'THIRD', 'THOSE',
    'THREE', 'THREW', 'THROW', 'THUMB', 'TIGHT', 'TIMER', 'TIMES', 'TITLE', 'TODAY', 'TOKEN',
    'TOMMY', 'TOOLS', 'TOPIC', 'TOTAL', 'TOUCH', 'TOUGH', 'TOWER', 'TRACK', 'TRADE', 'TRAIN',
    'TREAT', 'TREND', 'TRIAL', 'TRIBE', 'TRICK', 'TRIED', 'TRIES', 'TRUCK', 'TRULY', 'TRUNK',
    'TRUST', 'TRUTH', 'TWICE', 'TWIST', 'TYLER', 'TYPES', 'UNCLE', 'UNDER', 'UNDUE', 'UNION',
    'UNITY', 'UNTIL', 'UPPER', 'UPSET', 'URBAN', 'USAGE', 'USUAL', 'VALID', 'VALUE', 'VIDEO',
    'VIRUS', 'VISIT', 'VITAL', 'VOCAL', 'WASTE', 'WATCH', 'WATER', 'WAVES', 'WAYS', 'WEIRD',
    'WELSH', 'WHEEL', 'WHERE', 'WHICH', 'WHILE', 'WHITE', 'WHOLE', 'WHOSE', 'WOMAN', 'WOMEN',
    'WORLD', 'WORRY', 'WORSE', 'WORST', 'WORTH', 'WOULD', 'WRITE', 'WRONG', 'WROTE', 'YOUNG',
    'YOUTH'
];

// Routes
app.get('/api/games', (req, res) => {
    const waitingGames = games.filter(g => g.status === 'waiting');
    // Returning waiting games
    res.json(waitingGames);
});

// Public endpoint to get currently known connected wallets
app.get('/api/wallets', (req, res) => {
    try {
        res.json(Array.from(connectedWallets));
    } catch (e) {
        res.json([]);
    }
});

// Debug endpoint to see all games (development only)
if (NODE_ENV === 'development') {
    app.get('/api/debug/games', (req, res) => {
        // Debug mode - showing all games
        res.json(games);
    });
}

app.post('/api/games', async (req, res) => {
    const { wager, playerAddress } = req.body;
    
    // Create game request
    
    // Input validation
    if (!wager || !playerAddress) {
        // Missing required fields
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!validateWalletAddress(playerAddress)) {
        // Invalid wallet address
        return res.status(400).json({ error: 'Invalid wallet address' });
    }
    
    if (!validateWager(wager)) {
        // Invalid wager amount
        return res.status(400).json({ error: 'Invalid wager amount. Must be between 0.022 and 10 SOL' });
    }
    
    // Check if player already has an active game
    const existingGame = games.find(g => 
        g.players.includes(playerAddress) && 
        g.status !== 'completed'
    );
    
    if (existingGame) {
        // Player already has an active game
        return res.status(400).json({ error: 'You already have an active game' });
    }
    
    const gameId = 'game_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const word = words[Math.floor(Math.random() * words.length)];
    
    // Create blockchain escrow and game with pending signature status
    try {
        console.log('🎮 Creating blockchain escrow for:', playerAddress, 'wager:', wager);
        const escrowResult = await solanaClient.createGameEscrow(playerAddress, parseFloat(wager));
        console.log('🔍 Escrow result:', escrowResult);
        
        if (!escrowResult.success) {
            return res.status(400).json({ error: 'Blockchain error: ' + escrowResult.error });
        }
        
        // Create game with pending signature status
        const newGame = {
            id: gameId,
            wager: parseFloat(wager),
            players: [playerAddress],
            status: 'waiting',
            word: word,
            createdAt: Date.now(),
            guesses: [],
            playerResults: {},
            escrowId: escrowResult.escrowId,
            blockchainStatus: 'pending_signature', // Key: pending until signed
            requiresSignature: escrowResult.requiresSignature || false,
            escrowAddress: escrowResult.escrowAddress,
            escrowDetails: {
                programId: escrowResult.programId,
                gameAccount: escrowResult.gameAccount,
                escrowAccount: escrowResult.escrowAccount,
                escrowType: escrowResult.escrowType,
                wagerAmount: escrowResult.wagerAmount,
                transferAmount: escrowResult.transferAmount,
                gameKeypair: escrowResult.gameKeypair,
                escrowKeypair: escrowResult.escrowKeypair
            }
        };
        
        // Add to games array with pending status
        games.push(newGame);
        
        console.log(`🎮 Game created with pending signature: ${gameId}`);
        
        // Broadcast to all connected clients
        io.emit('gameCreated', newGame);
        
        res.json(newGame);
    } catch (error) {
        console.error('❌ Blockchain integration failed:', error);
        return res.status(500).json({ error: 'Failed to create blockchain escrow' });
    }
    
    // Track wallet as connected/active
    try {
        if (playerAddress) connectedWallets.add(playerAddress);
        io.emit('connectedWallets', Array.from(connectedWallets));
    } catch (e) {}
});

// Update blockchain transaction status
app.post('/api/games/:gameId/confirm-blockchain', (req, res) => {
    const { gameId } = req.params;
    const { signature, success } = req.body;
    
    const game = games.find(g => g.id === gameId);
    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }
    
    if (success) {
        // Update game status to confirmed
        game.blockchainStatus = 'signed';
        game.blockchainSignature = signature;
        console.log(`✅ Blockchain transaction confirmed for game ${gameId}: ${signature}`);
        
        // Broadcast update to all clients
        io.emit('gameUpdated', game);
        
        res.json({ 
            success: true, 
            message: 'Blockchain transaction confirmed',
            game: game
        });
    } else {
        // Remove the game if blockchain transaction failed
        games = games.filter(g => g.id !== gameId);
        console.log(`❌ Blockchain transaction failed for game ${gameId}, game removed`);
        
        // Broadcast that the game was removed
        io.emit('gameRemoved', { gameId });
        
        res.json({ 
            success: false, 
            message: 'Game removed due to failed blockchain transaction' 
        });
    }
});

// Manual cleanup endpoint for stuck games
app.post('/api/cleanup-stuck-games', (req, res) => {
    const initialCount = games.length;
    
    // Remove games that haven't confirmed blockchain transactions
    games = games.filter(game => {
        if (game.blockchainStatus === 'pending_signature') {
            console.log(`🧹 Manually removing stuck game ${game.id} - no blockchain confirmation`);
            return false;
        }
        return true;
    });
    
    const removedCount = initialCount - games.length;
    console.log(`🧹 Manual cleanup removed ${removedCount} stuck games`);
    
    // Broadcast removal of all stuck games
    if (removedCount > 0) {
        io.emit('gamesCleanedUp', { removedCount });
    }
    
    res.json({ 
        success: true, 
        removedCount: removedCount,
        message: `Removed ${removedCount} stuck games` 
    });
});

app.post('/api/games/:gameId/join', async (req, res) => {
    const { gameId } = req.params;
    const { playerAddress } = req.body;
    
    // Join request
    
    const game = games.find(g => g.id === gameId);
    if (!game) {
        // Game not found
        return res.status(404).json({ error: 'Game not found' });
    }
    
    if (game.status !== 'waiting' || game.blockchainStatus !== 'signed') {
        // Game not available or blockchain not confirmed
        return res.status(400).json({ error: 'Game is not available for joining' });
    }
    
    if (game.players.length >= 2) {
        // Game is full
        return res.status(400).json({ error: 'Game is full' });
    }
    
    // Prevent joining your own game
    if (game.players.length > 0 && game.players[0] === playerAddress) {
        // Cannot join own game
        return res.status(400).json({ error: 'You cannot join your own game' });
    }
    
    // Check if player is already in another game
    const playerInOtherGame = games.find(g => 
        g.id !== gameId && 
        g.players.includes(playerAddress) && 
        g.status !== 'completed'
    );
    
    if (playerInOtherGame) {
        // Player already in another game
        return res.status(400).json({ error: 'You are already in another game' });
    }
    
    // Return escrow details instead of joining immediately
    console.log(`🎮 Player 2 requesting to join: ${playerAddress} in game ${gameId}`);
    
    res.json({
        success: true,
        gameId: game.id,
        wager: game.wager,
        requiresSignature: true,
        escrowDetails: game.escrowDetails,
        message: 'Please sign transaction to join game'
    });
});

// Confirm Player 2 joined after blockchain transaction
app.post('/api/games/:gameId/confirm-join', (req, res) => {
    const { gameId} = req.params;
    const { signature, success, playerAddress } = req.body;
    
    const game = games.find(g => g.id === gameId);
    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }
    
    if (success) {
        // Add player to game
        game.players.push(playerAddress);
        game.status = 'playing';
        game.startedAt = Date.now();
        game.joinSignature = signature;
        
        console.log(`✅ Player 2 joined with blockchain confirmation: ${playerAddress}`);
        console.log(`✅ Join transaction signature: ${signature}`);
        
        // Broadcast to all clients that game is starting
        io.emit('gameStarted', game);
        
        // Track wallet
        try {
            if (playerAddress) connectedWallets.add(playerAddress);
            io.emit('connectedWallets', Array.from(connectedWallets));
        } catch (e) {}
        
        res.json({ 
            success: true, 
            message: 'Successfully joined game',
            game: game
        });
    } else {
        console.log(`❌ Player 2 join failed for game ${gameId}`);
        res.json({ 
            success: false, 
            message: 'Failed to join game - blockchain transaction failed' 
        });
    }
});

// Airdrop endpoint for testing
app.post('/api/airdrop', async (req, res) => {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
        return res.status(400).json({ error: 'Wallet address required' });
    }
    
    if (!validateWalletAddress(walletAddress)) {
        return res.status(400).json({ error: 'Invalid wallet address' });
    }
    
    try {
        const result = await solanaClient.requestAirdrop(walletAddress, 2);
        
        if (result.success) {
            res.json({ 
                success: true, 
                message: 'Airdrop successful', 
                signature: result.signature 
            });
        } else {
            res.status(500).json({ 
                success: false, 
                error: result.error 
            });
        }
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// API to forfeit a game
app.post('/api/games/:gameId/forfeit', async (req, res) => {
    const { gameId } = req.params;
    const { playerAddress } = req.body;
    
    // Forfeit request
    
    // Input validation
    if (!validateGameId(gameId)) {
        // Invalid game ID format
        return res.status(400).json({ error: 'Invalid game ID' });
    }
    
    if (!validateWalletAddress(playerAddress)) {
        // Invalid wallet address
        return res.status(400).json({ error: 'Invalid wallet address' });
    }
    
    const game = games.find(g => g.id === gameId);
    if (!game) {
        // Game not found
        return res.status(404).json({ error: 'Game not found' });
    }
    
    if (!game.players.includes(playerAddress)) {
        // Player not in this game
        return res.status(400).json({ error: 'Player not in this game' });
    }
    
    const isGamePlaying = game.status === 'playing';
    
    if (isGamePlaying) {
        // Game is active - determine opponent as winner with 5% forfeit fee
        const opponent = game.players.find(p => p !== playerAddress);
        if (opponent) {
            game.winner = opponent;
            game.status = 'completed';
            game.completedAt = Date.now();
            
            // Settle on blockchain with 5% forfeit fee
            await settleGameOnBlockchain(game, opponent, true, false);
            
            try {
                completedGames.push({ id: game.id, wager: game.wager, winner: game.winner, status: 'completed', completedAt: game.completedAt });
                if (completedGames.length > 20) completedGames.shift();
            } catch(e){}
            
            io.emit('gameCompleted', game);
            
            res.json({
                success: true,
                message: 'Game forfeited - opponent wins with 5% house fee'
            });
        } else {
            return res.status(400).json({ error: 'No opponent found' });
        }
    } else {
        // Game is waiting - just remove player and refund (no fee)
        game.players = game.players.filter(p => p !== playerAddress);
        
        if (game.players.length === 0) {
            games = games.filter(g => g.id !== gameId);
            io.emit('gameRemoved', { gameId });
        } else {
            game.status = 'waiting';
            io.emit('gameUpdated', game);
        }
        
        res.json({
            success: true,
            message: 'Left waiting game - no penalty'
        });
    }
});

app.post('/api/games/:gameId/guess', async (req, res) => {
    const { gameId } = req.params;
    const { playerAddress, guess } = req.body;
    
    // Input validation
    if (!validateGameId(gameId)) {
        return res.status(400).json({ error: 'Invalid game ID' });
    }
    
    if (!validateWalletAddress(playerAddress)) {
        return res.status(400).json({ error: 'Invalid wallet address' });
    }
    
    if (!guess || typeof guess !== 'string') {
        return res.status(400).json({ error: 'Invalid guess' });
    }
    
    // Sanitize and validate guess
    const sanitizedGuess = sanitizeString(guess).toUpperCase();
    if (sanitizedGuess.length !== 5 || !/^[A-Z]{5}$/.test(sanitizedGuess)) {
        return res.status(400).json({ error: 'Guess must be exactly 5 letters' });
    }
    
    const game = games.find(g => g.id === gameId);
    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }
    
    if (!game.players.includes(playerAddress)) {
        return res.status(403).json({ error: 'Player not in game' });
    }
    
    if (game.status !== 'playing') {
        return res.status(400).json({ error: 'Game is not active' });
    }
    
    // Add guess to game
    if (!game.guesses) game.guesses = [];
    if (!game.playerResults) game.playerResults = {};
    
    const guessData = {
        player: playerAddress,
        guess: sanitizedGuess,
        timestamp: Date.now()
    };
    
    game.guesses.push(guessData);
    
    // Check if guess is correct
    if (sanitizedGuess === game.word) {
        // Immediate win ends the game for both
        game.playerResults[playerAddress] = 'win';
        game.status = 'completed';
        game.winner = playerAddress;
        game.completedAt = Date.now();
        
        // Settle on blockchain with 2% fee
        await settleGameOnBlockchain(game, playerAddress, false, false);
        
        try { 
            completedGames.push({ id: game.id, wager: game.wager, winner: game.winner || null, status: 'completed', completedAt: game.completedAt }); 
            // Keep only last 20 games to prevent memory leak
            if (completedGames.length > 20) completedGames.shift(); 
        } catch(e){}
        io.emit('gameCompleted', game);
    } else if (game.guesses.filter(g => g.player === playerAddress).length >= 6) {
        game.playerResults[playerAddress] = 'out_of_guesses';
        
        // Notify clients this player is done
        io.emit('playerDone', { gameId, player: playerAddress, result: 'out_of_guesses' });
        
        // Check if all players are done
        const allPlayersDone = game.players.every(player => 
            game.playerResults[player] === 'win' || game.playerResults[player] === 'out_of_guesses'
        );
        
        if (allPlayersDone) {
            game.status = 'completed';
            game.completedAt = Date.now();
            
            // If exactly one win exists, set winner, else no winner -> both lost
            const winnerEntry = Object.entries(game.playerResults).find(([, r]) => r === 'win');
            if (winnerEntry) {
                game.winner = winnerEntry[0];
                // Normal win - 2% fee
                await settleGameOnBlockchain(game, game.winner, false, false);
            } else {
                // Both lost - entire pot to house
                game.winner = null;
                await settleGameOnBlockchain(game, null, false, true);
            }
            
            try { 
            completedGames.push({ id: game.id, wager: game.wager, winner: game.winner || null, status: 'completed', completedAt: game.completedAt }); 
            // Keep only last 20 games to prevent memory leak
            if (completedGames.length > 20) completedGames.shift(); 
        } catch(e){}
            io.emit('gameCompleted', game);
        }
    }
    
    // Broadcast guess update
    io.emit('guessSubmitted', { gameId, guess: guessData });
    
    res.json({ success: true, game });
});

// Mark a player's timer as expired
// API to rejoin a game after disconnection
app.post('/api/games/:gameId/rejoin', (req, res) => {
    const { gameId } = req.params;
    const { playerAddress } = req.body;
    
    // Rejoin request
    
    // Input validation
    if (!validateGameId(gameId)) {
        return res.status(400).json({ error: 'Invalid game ID' });
    }
    
    if (!validateWalletAddress(playerAddress)) {
        return res.status(400).json({ error: 'Invalid wallet address' });
    }
    
    const game = games.find(g => g.id === gameId);
    if (!game) {
        // Game not found for rejoin
        return res.status(404).json({ error: 'Game not found' });
    }
    
    if (!game.players.includes(playerAddress)) {
        // Player not in this game
        return res.status(403).json({ error: 'Player not in this game' });
    }
    
    if (game.status === 'completed') {
        // Game already completed
        return res.status(400).json({ error: 'Game is already completed' });
    }
    
    // Player rejoined game successfully
    res.json(game);
});

app.post('/api/games/:gameId/timeout', async (req, res) => {
    const { gameId } = req.params;
    const { playerAddress } = req.body;

    const game = games.find(g => g.id === gameId);
    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }

    if (!game.players.includes(playerAddress)) {
        return res.status(403).json({ error: 'Player not in game' });
    }

    if (!game.playerResults) game.playerResults = {};
    game.playerResults[playerAddress] = 'timeout';
    io.emit('playerDone', { gameId, player: playerAddress, result: 'timeout' });

    // If both players are done (win or out_of_guesses or timeout), complete game
    const allPlayersDone = game.players.every(player => {
        const r = game.playerResults[player];
        return r === 'win' || r === 'out_of_guesses' || r === 'timeout';
    });

    if (allPlayersDone) {
        game.status = 'completed';
        game.completedAt = Date.now();
        
        // Determine winner from timeout scenario
        const winnerEntry = Object.entries(game.playerResults).find(([, r]) => r === 'win');
        if (winnerEntry) {
            game.winner = winnerEntry[0];
            // Normal win - 2% fee
            await settleGameOnBlockchain(game, game.winner, false, false);
        } else {
            // Both timed out/lost - entire pot to house
            game.winner = null;
            await settleGameOnBlockchain(game, null, false, true);
        }
        
        try { 
            completedGames.push({ id: game.id, wager: game.wager, winner: game.winner || null, status: 'completed', completedAt: game.completedAt }); 
            // Keep only last 20 games to prevent memory leak
            if (completedGames.length > 20) completedGames.shift(); 
        } catch(e){}
        io.emit('gameCompleted', game);
    } else {
        // Inform clients of progress so UI can show waiting state
        io.emit('guessSubmitted', { gameId, playerDone: playerAddress, result: 'timeout' });
    }

    res.json({ success: true, game });
});

// WebSocket connection handling
io.on('connection', (socket) => {
    // Player connected
    // Send current wallet list to this socket immediately
    try {
        socket.emit('connectedWallets', Array.from(connectedWallets));
        socket.emit('recentGames', completedGames);
    } catch (e) {}
    
    socket.on('joinGame', (gameId) => {
        socket.join(gameId);
        // Player joined game
    });
    
    socket.on('registerWallet', (walletAddress) => {
        if (typeof walletAddress === 'string') {
            socketIdToWallet.set(socket.id, walletAddress);
            connectedWallets.add(walletAddress);
            io.emit('connectedWallets', Array.from(connectedWallets));
        }
    });
    
    socket.on('unregisterWallet', () => {
        const addr = socketIdToWallet.get(socket.id);
        if (addr) {
            connectedWallets.delete(addr);
            socketIdToWallet.delete(socket.id);
            io.emit('connectedWallets', Array.from(connectedWallets));
        }
    });
    
    socket.on('leaveGame', (gameId) => {
        socket.leave(gameId);
        // Player left game
    });
    
    socket.on('disconnect', () => {
        // Player disconnected
        const addr = socketIdToWallet.get(socket.id);
        if (addr) {
            connectedWallets.delete(addr);
            socketIdToWallet.delete(socket.id);
            io.emit('connectedWallets', Array.from(connectedWallets));
        }
    });
});

// Cleanup function to remove stale games
function cleanupStaleGames() {
    const now = Date.now();
    const staleThreshold = 30 * 60 * 1000; // 30 minutes
    const blockchainTimeout = 5 * 60 * 1000; // 5 minutes for blockchain confirmation
    
    const initialCount = games.length;
    games = games.filter(game => {
        const gameAge = now - game.createdAt;
        
        // Remove games that are too old
        if (gameAge > staleThreshold) {
            return false;
        }
        
        // Remove games that haven't confirmed blockchain transaction within 5 minutes
        if (game.blockchainStatus === 'pending_signature' && gameAge > blockchainTimeout) {
            console.log(`🧹 Removing game ${game.id} - blockchain transaction not confirmed within timeout`);
            return false;
        }
        
        return true;
    });
    
    const removedCount = initialCount - games.length;
    if (removedCount > 0) {
        console.log(`🧹 Cleaned up ${removedCount} stale games`);
    }
}

// Function to validate and fix game state consistency
function validateGameStates() {
    games.forEach(game => {
        // Fix games that should be completed but aren't marked as such
        if (game.status === 'playing' && game.startedAt) {
            const gameDuration = Date.now() - game.startedAt;
            const maxGameTime = 5 * 60 * 1000; // 5 minutes
            
            if (gameDuration > maxGameTime) {
                // Game timed out, marking as completed
                game.status = 'completed';
                game.completedAt = Date.now();
            }
        }
        
        // Fix games with invalid player counts
        if (game.players.length > 2) {
            // Game has too many players
            game.players = game.players.slice(0, 2);
        }
        
        // Fix games that should be waiting but have 2 players
        if (game.status === 'waiting' && game.players.length === 2) {
            // Game has 2 players but status is waiting, fixing
            game.status = 'playing';
            game.startedAt = Date.now();
        }
    });
}

// Cleanup stale games every 10 minutes
setInterval(cleanupStaleGames, 10 * 60 * 1000);

// Validate game states every 5 minutes
setInterval(validateGameStates, 5 * 60 * 1000);

server.listen(PORT, () => {
    // Wordle Wars server running
    
    // Clean up any stale games on startup
    cleanupStaleGames();
    
    // Validate game states on startup
    validateGameStates();
});
