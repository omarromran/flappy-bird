const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const gameUI = document.getElementById('game-ui');
const currentScoreElement = document.getElementById('current-score');
const finalScoreElement = document.getElementById('final-score');
const bestScoreElement = document.getElementById('best-score');

const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const menuBtn = document.getElementById('menu-btn');
const avatarOptions = document.querySelectorAll('.avatar-option:not(.upload-option)');
const uploadTrigger = document.getElementById('upload-trigger');
const avatarUpload = document.getElementById('avatar-upload');

// Set canvas dimensions
canvas.width = 400;
canvas.height = 600;

// Game constants
const GRAVITY = 0.25;
const JUMP_FORCE = -5.5;
const PIPE_SPEED = 2.5;
const PIPE_SPAWN_RATE = 120; // frames
const PIPE_GAP = 160;
const BIRD_SIZE = 40;

// Game state
let bird = {
    x: 50,
    y: 300,
    velocity: 0,
    radius: 18,
    img: new Image()
};

let pipes = [];
let score = 0;
let bestScore = localStorage.getItem('flappyBest') || 0;
let gameRunning = false;
let frameCount = 0;
let selectedAvatarSrc = 'biba.png';

// Initialize bird image
bird.img.src = selectedAvatarSrc;

// Avatar Selection
avatarOptions.forEach(option => {
    option.addEventListener('click', () => {
        avatarOptions.forEach(opt => opt.classList.remove('selected'));
        uploadTrigger.classList.remove('selected');
        option.classList.add('selected');
        selectedAvatarSrc = option.dataset.src;
        bird.img.src = selectedAvatarSrc;
    });
});

function trimImage(img) {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    tempCtx.drawImage(img, 0, 0);

    const pixels = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const l = pixels.data.length;
    let bound = {
        top: null,
        left: null,
        right: null,
        bottom: null
    };
    let x, y;

    for (let i = 0; i < l; i += 4) {
        if (pixels.data[i + 3] > 0) {
            x = (i / 4) % tempCanvas.width;
            y = Math.floor((i / 4) / tempCanvas.width);

            if (bound.top === null || y < bound.top) bound.top = y;
            if (bound.left === null || x < bound.left) bound.left = x;
            if (bound.right === null || x > bound.right) bound.right = x;
            if (bound.bottom === null || y > bound.bottom) bound.bottom = y;
        }
    }

    if (bound.top === null) return img.src; // Empty image

    const trimHeight = bound.bottom - bound.top + 1;
    const trimWidth = bound.right - bound.left + 1;
    const trimmed = tempCtx.getImageData(bound.left, bound.top, trimWidth, trimHeight);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = trimWidth;
    outCanvas.height = trimHeight;
    const outCtx = outCanvas.getContext('2d');
    outCtx.putImageData(trimmed, 0, 0);

    return outCanvas.toDataURL();
}

// Auto-trim default avatars
function autoTrimAvatars() {
    avatarOptions.forEach(option => {
        const img = option.querySelector('img');
        if (img) {
            const tempImg = new Image();
            tempImg.onload = () => {
                const trimmedSrc = trimImage(tempImg);
                img.src = trimmedSrc;
                option.dataset.src = trimmedSrc;

                // If this is the currently selected bird, update it
                if (option.classList.contains('selected')) {
                    selectedAvatarSrc = trimmedSrc;
                    bird.img.src = selectedAvatarSrc;
                }
            };
            tempImg.src = img.src;
        }
    });
}

// Initial trim for default options
autoTrimAvatars();

// Image Upload
uploadTrigger.addEventListener('click', () => avatarUpload.click());

avatarUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const trimmedSrc = trimImage(img);

                avatarOptions.forEach(opt => opt.classList.remove('selected'));
                uploadTrigger.classList.add('selected');

                // Preview uploaded image in the upload box
                let preview = uploadTrigger.querySelector('img');
                if (!preview) {
                    preview = document.createElement('img');
                    uploadTrigger.innerHTML = '';
                    uploadTrigger.appendChild(preview);
                }
                preview.src = trimmedSrc;
                preview.style.borderRadius = '50%';
                preview.style.objectFit = 'cover';

                selectedAvatarSrc = trimmedSrc;
                bird.img.src = selectedAvatarSrc;
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// Game Logic
function init() {
    bird.y = 300;
    bird.velocity = 0;
    pipes = [];
    score = 0;
    frameCount = 0;
    currentScoreElement.innerText = '0';
}

function spawnPipe() {
    const minHeight = 50;
    const maxHeight = canvas.height - PIPE_GAP - minHeight;
    const height = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;

    pipes.push({
        x: canvas.width,
        topHeight: height,
        passed: false
    });
}

function update() {
    if (!gameRunning) return;

    // Bird physics
    bird.velocity += GRAVITY;
    bird.y += bird.velocity;

    // Collision detection (floor/ceiling)
    if (bird.y + bird.radius > canvas.height || bird.y - bird.radius < 0) {
        gameOver();
    }

    // Pipe logic
    if (frameCount % PIPE_SPAWN_RATE === 0) {
        spawnPipe();
    }

    for (let i = pipes.length - 1; i >= 0; i--) {
        const pipe = pipes[i];
        pipe.x -= PIPE_SPEED;

        // Collision detection (pipes)
        const birdLeft = bird.x - bird.radius + 5;
        const birdRight = bird.x + bird.radius - 5;
        const birdTop = bird.y - bird.radius + 5;
        const birdBottom = bird.y + bird.radius - 5;

        if (birdRight > pipe.x && birdLeft < pipe.x + 60) {
            if (birdTop < pipe.topHeight || birdBottom > pipe.topHeight + PIPE_GAP) {
                gameOver();
            }
        }

        // Score update
        if (!pipe.passed && bird.x > pipe.x + 60) {
            score++;
            pipe.passed = true;
            currentScoreElement.innerText = score;
        }

        // Remove off-screen pipes
        if (pipe.x + 60 < 0) {
            pipes.splice(i, 1);
        }
    }

    frameCount++;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Pipes
    pipes.forEach(pipe => {
        // Top pipe gradient
        let topGrad = ctx.createLinearGradient(pipe.x, 0, pipe.x + 60, 0);
        topGrad.addColorStop(0, '#22c55e');
        topGrad.addColorStop(0.5, '#4ade80');
        topGrad.addColorStop(1, '#16a34a');

        ctx.fillStyle = topGrad;
        ctx.fillRect(pipe.x, 0, 60, pipe.topHeight);

        // Bottom pipe gradient
        let botGrad = ctx.createLinearGradient(pipe.x, pipe.topHeight + PIPE_GAP, pipe.x + 60, pipe.topHeight + PIPE_GAP);
        botGrad.addColorStop(0, '#22c55e');
        botGrad.addColorStop(0.5, '#4ade80');
        botGrad.addColorStop(1, '#16a34a');

        ctx.fillStyle = botGrad;
        ctx.fillRect(pipe.x, pipe.topHeight + PIPE_GAP, 60, canvas.height);

        // Pipe Caps (aesthetic details)
        ctx.fillStyle = '#15803d';
        ctx.fillRect(pipe.x - 4, pipe.topHeight - 20, 68, 20); // Top cap
        ctx.fillRect(pipe.x - 4, pipe.topHeight + PIPE_GAP, 68, 20); // Bottom cap

        // Glossy effect on pipes
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(pipe.x + 10, 0, 10, pipe.topHeight);
        ctx.fillRect(pipe.x + 10, pipe.topHeight + PIPE_GAP, 10, canvas.height);
    });

    // Draw Bird
    ctx.save();
    ctx.translate(bird.x, bird.y);
    // Smooth rotation based on velocity
    const rotation = Math.min(Math.PI / 3, Math.max(-Math.PI / 4, bird.velocity * 0.12));
    ctx.rotate(rotation);

    // Add a subtle trail effect or shadow
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';

    // Rounded clipping path
    ctx.beginPath();
    ctx.arc(0, 0, BIRD_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();

    try {
        ctx.drawImage(bird.img, -BIRD_SIZE / 2, -BIRD_SIZE / 2, BIRD_SIZE, BIRD_SIZE);
    } catch (e) {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    if (gameRunning) {
        requestAnimationFrame(() => {
            update();
            draw();
        });
    }
}

function jump() {
    if (gameRunning) {
        bird.velocity = JUMP_FORCE;
    }
}

function startGame() {
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    gameUI.classList.remove('hidden');
    init();
    gameRunning = true;
    draw();
}

function gameOver() {
    gameRunning = false;
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('flappyBest', bestScore);
    }

    finalScoreElement.innerText = score;
    bestScoreElement.innerText = bestScore;

    gameOverScreen.classList.remove('hidden');
    gameUI.classList.add('hidden');
}

function showMenu() {
    gameOverScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
}

// Controls
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'Enter') {
        // Prevent default browser behavior (scrolling or clicking focused buttons)
        e.preventDefault();

        if (gameRunning) {
            jump();
        } else if (!startScreen.classList.contains('hidden')) {
            // Start screen is active: use Space/Enter to "select" and start
            startGame();
        }
        // If on Game Over screen, Space/Enter will NOT restart the game
        // per user request ("not to restart the game"). 
        // Restart must be done via the button.
    }
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    jump();
});

canvas.addEventListener('mousedown', jump);

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
menuBtn.addEventListener('click', showMenu);
