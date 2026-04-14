/**
 * Neon Snake - Main Game Logic
 */

// --- DOM Elements ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('currentScore');
const highScoreEl = document.getElementById('highScore');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayMessage = document.getElementById('overlayMessage');
const startBtn = document.getElementById('startBtn');
const diffBtns = document.querySelectorAll('.diff-btn');
const pauseIndicator = document.getElementById('pauseIndicator');
const gameWrapper = document.querySelector('.game-wrapper');

// --- Game Constants & State ---
const GRID_SIZE = 20; // 20x20 logical grid
let CELL_SIZE = 20;   // Viewport dependent, calculated dynamically
let snake = [];
let food = {};
let direction = 'RIGHT';
let nextDirection = 'RIGHT';
let score = 0;
let highScore = localStorage.getItem('neon_snake_highscore') || 0;
let gameMode = 'easy'; // easy, medium, hard
let gameState = 'MENU'; // MENU, PLAYING, GAME_OVER, PAUSED

// Timing for game loop (speed control)
let lastRenderTime = 0;
let snakeSpeed = 5; // cells per second (will increase)
let baseSpeed = 5;

// Visual Colors matching CSS variables implicitly
const COLORS = {
    snakeHead: '#0f0',      // neon green
    snakeBody: '#00cc00',   // slightly darker green
    food: '#f0f',           // neon pink
    grid: 'rgba(255, 255, 255, 0.03)'
};

// --- Audio System (Web Audio API) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let audioEnabled = false;

function initAudio() {
    if(audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    audioEnabled = true;
}

function playSound(type) {
    if (!audioEnabled) return;
    
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === 'eat') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(400, audioCtx.currentTime); // 400Hz
        oscillator.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'die') {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
        
        // Haptic Feedback for mobile
        if('vibrate' in navigator) navigator.vibrate(200);
    }
}

// --- Particles System Setup ---
let particles = [];
function createParticles(x, y, color) {
    for (let i = 0; i < 10; i++) {
        particles.push({
            x: x * CELL_SIZE + CELL_SIZE/2,
            y: y * CELL_SIZE + CELL_SIZE/2,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 1,
            color: color
        });
    }
}

function updateAndDrawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;

        if (p.life <= 0) {
            particles.splice(i, 1);
        } else {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }
}

// --- Initialization & Resizing ---
function resizeCanvas() {
    // Determine canvas size based on wrapper dimensions keeping it square
    const padding = 20; // 10px each side
    const wrapperWidth = gameWrapper.clientWidth - padding;
    const wrapperHeight = gameWrapper.clientHeight - padding;
    
    // Choose the smaller dimension to fit
    const size = Math.floor(Math.min(wrapperWidth, wrapperHeight));
    
    // Make size divisible by GRID_SIZE perfectly
    const adjustedSize = size - (size % GRID_SIZE);
    
    canvas.width = adjustedSize;
    canvas.height = adjustedSize;
    
    CELL_SIZE = adjustedSize / GRID_SIZE;
    
    // Request a redraw if paused or menu
    if(gameState !== 'PLAYING') {
        draw();
    }
}

window.addEventListener('resize', resizeCanvas);
highScoreEl.innerText = highScore;

// --- Gameplay Functions ---
function getDifficultySpeed() {
    switch(gameMode) {
        case 'easy': return 5;
        case 'medium': return 8;
        case 'hard': return 12;
        default: return 5;
    }
}

function initGame() {
    initAudio();
    resizeCanvas(); // Ensure bounds are correct
    
    // Center snake
    snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
    ];
    direction = 'RIGHT';
    nextDirection = 'RIGHT';
    score = 0;
    scoreEl.innerText = score;
    baseSpeed = getDifficultySpeed();
    snakeSpeed = baseSpeed;
    particles = [];
    
    spawnFood();
    
    gameState = 'PLAYING';
    overlay.classList.remove('active');
    pauseIndicator.classList.add('hidden');
    
    window.requestAnimationFrame(gameLoop);
}

function spawnFood() {
    let newFoodPosition;
    while(newFoodPosition == null || onSnake(newFoodPosition)) {
        newFoodPosition = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE)
        };
    }
    food = newFoodPosition;
}

function onSnake(pos, ignoreHead = false) {
    return snake.some((segment, index) => {
        if (ignoreHead && index === 0) return false;
        return segment.x === pos.x && segment.y === pos.y;
    });
}

function checkDeath() {
    const head = snake[0];
    return (
        head.x < 0 || head.x >= GRID_SIZE || 
        head.y < 0 || head.y >= GRID_SIZE ||
        onSnake(head, true)
    );
}

function gameOver() {
    gameState = 'GAME_OVER';
    playSound('die');
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('neon_snake_highscore', highScore);
        highScoreEl.innerText = highScore;
        overlayTitle.innerText = "NEW HIGH SCORE!";
        overlayTitle.className = "neon-text-pink";
    } else {
        overlayTitle.innerText = "GAME OVER";
        overlayTitle.className = "neon-text-red";
    }
    
    overlayMessage.innerText = `Final Score: ${score}`;
    startBtn.innerText = "PLAY AGAIN";
    overlay.classList.add('active');
}

function togglePause() {
    if (gameState === 'PLAYING') {
        gameState = 'PAUSED';
        pauseIndicator.classList.remove('hidden');
    } else if (gameState === 'PAUSED') {
        gameState = 'PLAYING';
        pauseIndicator.classList.add('hidden');
        window.requestAnimationFrame(gameLoop);
    }
}

// --- Main Engine ---
function update() {
    // Process input
    direction = nextDirection;
    
    // Calculate new head
    let head = { ...snake[0] };
    
    if (direction === 'UP') head.y--;
    else if (direction === 'DOWN') head.y++;
    else if (direction === 'LEFT') head.x--;
    else if (direction === 'RIGHT') head.x++;
    
    snake.unshift(head); // Add new head
    
    // Check death before eating (wall hit)
    if (checkDeath()) {
        gameOver();
        return;
    }
    
    // Check Food
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreEl.innerText = score;
        playSound('eat');
        createParticles(food.x, food.y, COLORS.food);
        
        // Speed up slightly
        if(score % 50 === 0 && snakeSpeed < 25) {
            snakeSpeed += 1;
        }
        
        spawnFood();
    } else {
        // Did not eat perfectly fine, pop the tail
        snake.pop(); 
    }
}

function drawRoundedRect(x, y, w, h, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw Grid
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    for(let i=0; i <= GRID_SIZE; i++) {
        // Vertical
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, canvas.height);
        ctx.stroke();
        // Horizontal
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(canvas.width, i * CELL_SIZE);
        ctx.stroke();
    }
    
    // Draw particles
    updateAndDrawParticles();
    
    // Draw Food (Diamond Shape or Glowing Circle)
    ctx.shadowBlur = 15;
    ctx.shadowColor = COLORS.food;
    ctx.fillStyle = COLORS.food;
    
    ctx.beginPath();
    const fx = food.x * CELL_SIZE + CELL_SIZE/2;
    const fy = food.y * CELL_SIZE + CELL_SIZE/2;
    const fr = CELL_SIZE / 2 * 0.8; 
    ctx.arc(fx, fy, fr, 0, Math.PI * 2);
    ctx.fill();
    // Reset shadow
    ctx.shadowBlur = 0;

    // Draw Snake
    snake.forEach((segment, index) => {
        const isHead = index === 0;
        ctx.fillStyle = isHead ? COLORS.snakeHead : COLORS.snakeBody;
        
        if (isHead) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = COLORS.snakeHead;
        } else {
            ctx.shadowBlur = 0;
        }
        
        const padding = 1;
        const x = segment.x * CELL_SIZE + padding;
        const y = segment.y * CELL_SIZE + padding;
        const size = CELL_SIZE - padding * 2;
        
        // Draw segment rounded
        drawRoundedRect(x, y, size, size, 4);
    });
    
    ctx.shadowBlur = 0;
}

function gameLoop(currentTime) {
    if (gameState !== 'PLAYING') return; // Stop loop if game over / paused / menu
    
    window.requestAnimationFrame(gameLoop);
    
    const secondsSinceLastRender = (currentTime - lastRenderTime) / 1000;
    if (secondsSinceLastRender < 1 / snakeSpeed) return;
    
    lastRenderTime = currentTime;
    
    update();
    draw();
}

// --- Inputs & Controls ---
window.addEventListener('keydown', e => {
    // Only handle standard keys
    if(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'w', 'a', 's', 'd'].includes(e.key)) {
        if(gameState === 'PLAYING') e.preventDefault(); // prevent scrolling
    }
    
    if (e.key === ' ' && (gameState === 'PLAYING' || gameState === 'PAUSED')) {
        togglePause();
        return;
    }
    
    if (gameState !== 'PLAYING') return;

    switch(e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            if (direction !== 'DOWN') nextDirection = 'UP';
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            if (direction !== 'UP') nextDirection = 'DOWN';
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            if (direction !== 'RIGHT') nextDirection = 'LEFT';
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            if (direction !== 'LEFT') nextDirection = 'RIGHT';
            break;
    }
});

// Mobile Swipe gestures
let touchStartX = null;
let touchStartY = null;

gameWrapper.addEventListener('touchstart', e => {
    if(e.touches.length > 1) return; // ignore multi-touch
    initAudio(); // Initialize audio on first tap
    
    if (gameState === 'PAUSED' || gameState === 'PLAYING') {
        // If they tap quickly without moving, treat as pause/resume toggle
        // We'll figure this out in touchend
    }
    
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    
    // Prevent default scrolling unless it's a menu element
    if(e.target === canvas) {
        e.preventDefault(); 
    }
}, {passive: false});

gameWrapper.addEventListener('touchmove', e => {
    if(gameState !== 'PLAYING' || !touchStartX || !touchStartY || e.touches.length > 1) return;
    
    e.preventDefault(); // Prevent scrolling while playing
    
    let touchEndX = e.touches[0].clientX;
    let touchEndY = e.touches[0].clientY;
    
    let dx = touchEndX - touchStartX;
    let dy = touchEndY - touchStartY;
    
    // Threshold to count as swipe
    if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal
            if (dx > 0 && direction !== 'LEFT') nextDirection = 'RIGHT';
            else if (dx < 0 && direction !== 'RIGHT') nextDirection = 'LEFT';
        } else {
            // Vertical
            if (dy > 0 && direction !== 'UP') nextDirection = 'DOWN';
            else if (dy < 0 && direction !== 'DOWN') nextDirection = 'UP';
        }
        
        // Reset to prevent multiple firing in one long swipe
        touchStartX = null;
        touchStartY = null;
    }
}, {passive: false});

gameWrapper.addEventListener('touchend', e => {
    // If touch wasn't reset by move, it was just a tap
    if (touchStartX !== null && touchStartY !== null) {
        if (gameState === 'PLAYING' || gameState === 'PAUSED') {
            togglePause();
        }
    }
    touchStartX = null;
    touchStartY = null;
});


// UI Controls
startBtn.addEventListener('click', () => {
    initGame();
});

diffBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        // remove active from all
        diffBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        gameMode = e.target.dataset.difficulty;
    });
});

// Setup initially
resizeCanvas();
draw(); // Draw empty grid
