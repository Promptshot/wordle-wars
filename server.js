const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Environment configuration
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

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
let players = new Map(); // socketId -> player info

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
    console.log(`📋 GET /api/games - Returning ${waitingGames.length} waiting games`);
    res.json(waitingGames);
});

// Debug endpoint to see all games
app.get('/api/debug/games', (req, res) => {
    console.log(`🔍 DEBUG: All games (${games.length} total):`, games.map(g => ({
        id: g.id,
        status: g.status,
        players: g.players,
        wager: g.wager
    })));
    res.json(games);
});

app.post('/api/games', (req, res) => {
    const { wager, playerAddress } = req.body;
    
    console.log(`🎮 Create game request: Wager ${wager}, Player ${playerAddress}`);
    
    // Input validation
    if (!wager || !playerAddress) {
        console.log('❌ Missing required fields');
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!validateWalletAddress(playerAddress)) {
        console.log('❌ Invalid wallet address');
        return res.status(400).json({ error: 'Invalid wallet address' });
    }
    
    if (!validateWager(wager)) {
        console.log('❌ Invalid wager amount');
        return res.status(400).json({ error: 'Invalid wager amount. Must be between 0.022 and 10 SOL' });
    }
    
    // Check if player already has an active game
    const existingGame = games.find(g => 
        g.players.includes(playerAddress) && 
        g.status !== 'completed'
    );
    
    if (existingGame) {
        console.log('❌ Player already has an active game:', existingGame.id);
        return res.status(400).json({ error: 'You already have an active game' });
    }
    
    const gameId = 'game_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const word = words[Math.floor(Math.random() * words.length)];
    
    const newGame = {
        id: gameId,
        wager: parseFloat(wager),
        players: [playerAddress],
        status: 'waiting',
        word: word,
        createdAt: Date.now(),
        guesses: [],
        playerResults: {}
    };
    
    games.push(newGame);
    
    console.log('✅ Game created successfully:', newGame.id);
    
    // Broadcast to all connected clients
    io.emit('gameCreated', newGame);
    
    res.json(newGame);
});

app.post('/api/games/:gameId/join', (req, res) => {
    const { gameId } = req.params;
    const { playerAddress } = req.body;
    
    console.log(`👥 Join request: Game ${gameId}, Player ${playerAddress}`);
    
    const game = games.find(g => g.id === gameId);
    if (!game) {
        console.log('❌ Game not found');
        return res.status(404).json({ error: 'Game not found' });
    }
    
    if (game.status !== 'waiting') {
        console.log('❌ Game not available, status:', game.status);
        return res.status(400).json({ error: 'Game is not available' });
    }
    
    if (game.players.length >= 2) {
        console.log('❌ Game is full');
        return res.status(400).json({ error: 'Game is full' });
    }
    
    // Prevent joining your own game
    if (game.players.length > 0 && game.players[0] === playerAddress) {
        console.log('❌ Cannot join own game');
        return res.status(400).json({ error: 'You cannot join your own game' });
    }
    
    // Check if player is already in another game
    const playerInOtherGame = games.find(g => 
        g.id !== gameId && 
        g.players.includes(playerAddress) && 
        g.status !== 'completed'
    );
    
    if (playerInOtherGame) {
        console.log('❌ Player already in another game:', playerInOtherGame.id);
        return res.status(400).json({ error: 'You are already in another game' });
    }
    
    console.log('✅ Join validation passed, adding player to game');
    game.players.push(playerAddress);
    game.status = 'playing';
    game.startedAt = Date.now();
    
    // Broadcast to all connected clients
    io.emit('gameJoined', game);
    
    console.log('✅ Player joined game successfully');
    res.json(game);
});

// API to forfeit a game
app.post('/api/games/:gameId/forfeit', (req, res) => {
    const { gameId } = req.params;
    const { playerAddress } = req.body;
    
    console.log(`🔄 Forfeit request: Game ${gameId}, Player ${playerAddress}`);
    
    // Input validation
    if (!validateGameId(gameId)) {
        console.log('❌ Invalid game ID format');
        return res.status(400).json({ error: 'Invalid game ID' });
    }
    
    if (!validateWalletAddress(playerAddress)) {
        console.log('❌ Invalid wallet address');
        return res.status(400).json({ error: 'Invalid wallet address' });
    }
    
    const game = games.find(g => g.id === gameId);
    if (!game) {
        console.log('❌ Game not found');
        return res.status(404).json({ error: 'Game not found' });
    }
    
    if (!game.players.includes(playerAddress)) {
        console.log('❌ Player not in this game');
        return res.status(400).json({ error: 'Player not in this game' });
    }
    
    console.log(`📋 Game before forfeit:`, game);
    
    // Calculate forfeit penalty based on game state
    const isGameStarted = game.status === 'playing';
    const hasOtherPlayers = game.players.length > 1;
    const forfeitFee = isGameStarted || hasOtherPlayers ? 1.0 : 0.05; // 100% loss if game started, 5% fee if waiting
    
    console.log(`💰 Forfeit calculation:`, {
        isGameStarted,
        hasOtherPlayers,
        forfeitFee: forfeitFee * 100 + '%',
        originalWager: game.wager
    });
    
    // Remove player from game
    game.players = game.players.filter(p => p !== playerAddress);
    
    // If no players left, remove the game
    if (game.players.length === 0) {
        console.log('🗑️ No players left, removing game completely');
        games = games.filter(g => g.id !== gameId);
        console.log(`📋 Games after removal:`, games.length, 'games remaining');
        
        // Broadcast that the game was removed
        io.emit('gameRemoved', { gameId });
    } else {
        console.log('⏳ One player left, setting status to waiting');
        // If only one player left, set status back to waiting
        game.status = 'waiting';
        
        // Broadcast game update
        io.emit('gameUpdated', game);
    }
    
    // Return forfeit result with penalty information
    res.json({
        success: true,
        forfeitFee: forfeitFee,
        refundAmount: game.wager * (1 - forfeitFee),
        penaltyAmount: game.wager * forfeitFee,
        message: forfeitFee === 1.0 ? 
            'Game forfeited - full wager lost (game was active)' : 
            'Game forfeited - 5% fee applied (95% refund)'
    });
    
    console.log('✅ Forfeit completed successfully');
});

app.post('/api/games/:gameId/guess', (req, res) => {
    const { gameId } = req.params;
    const { playerAddress, guess } = req.body;
    
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
        guess: guess.toUpperCase(),
        timestamp: Date.now()
    };
    
    game.guesses.push(guessData);
    
    // Check if guess is correct
    if (guess.toUpperCase() === game.word) {
        game.playerResults[playerAddress] = 'win';
        game.status = 'completed';
        game.winner = playerAddress;
        game.completedAt = Date.now();
        
        // Broadcast game completion
        io.emit('gameCompleted', game);
    } else if (game.guesses.filter(g => g.player === playerAddress).length >= 6) {
        game.playerResults[playerAddress] = 'out_of_guesses';
        
        // Check if all players are done
        const allPlayersDone = game.players.every(player => 
            game.playerResults[player] === 'win' || game.playerResults[player] === 'out_of_guesses'
        );
        
        if (allPlayersDone) {
            game.status = 'completed';
            game.completedAt = Date.now();
            io.emit('gameCompleted', game);
        }
    }
    
    // Broadcast guess update
    io.emit('guessSubmitted', { gameId, guess: guessData });
    
    res.json({ success: true, game });
});

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);
    
    socket.on('joinGame', (gameId) => {
        socket.join(gameId);
        console.log(`Player ${socket.id} joined game ${gameId}`);
    });
    
    socket.on('leaveGame', (gameId) => {
        socket.leave(gameId);
        console.log(`Player ${socket.id} left game ${gameId}`);
    });
    
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
    });
});

// Cleanup function to remove stale games
function cleanupStaleGames() {
    const now = Date.now();
    const staleThreshold = 30 * 60 * 1000; // 30 minutes
    
    const initialCount = games.length;
    games = games.filter(game => {
        const gameAge = now - game.createdAt;
        return gameAge < staleThreshold;
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
                console.log(`⏰ Game ${game.id} timed out, marking as completed`);
                game.status = 'completed';
                game.completedAt = Date.now();
            }
        }
        
        // Fix games with invalid player counts
        if (game.players.length > 2) {
            console.log(`⚠️ Game ${game.id} has too many players: ${game.players.length}`);
            game.players = game.players.slice(0, 2);
        }
        
        // Fix games that should be waiting but have 2 players
        if (game.status === 'waiting' && game.players.length === 2) {
            console.log(`⚠️ Game ${game.id} has 2 players but status is waiting, fixing...`);
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
    console.log(`🎮 Wordle Wars server running on port ${PORT}`);
    console.log(`🌍 Environment: ${NODE_ENV}`);
    if (NODE_ENV === 'development') {
        console.log(`🌐 Frontend: http://localhost:8000/pump-style.html`);
        console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
    } else {
        console.log(`🚀 Production server ready`);
    }
    
    // Clean up any stale games on startup
    cleanupStaleGames();
    
    // Validate game states on startup
    validateGameStates();
});
