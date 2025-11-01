// --- SETUP ---
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// --- AUDIO ---
const bgMusic = new Audio("sounds/bg.mp3");
const pointSound = new Audio("sounds/point.mp3");
const gameOverSound = new Audio("sounds/gameover.mp3");

bgMusic.loop = true;
bgMusic.volume = 0.3;

function startAudio() {
  bgMusic.play().catch(() => {});
  window.removeEventListener("mousedown", startAudio);
  window.removeEventListener("touchstart", startAudio);
}
window.addEventListener("mousedown", startAudio);
window.addEventListener("touchstart", startAudio);

// --- PLAYER (Coin) ---
const coin = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: Math.min(window.innerWidth, window.innerHeight) * 0.03,
  color: "gold",
};

// --- PHYSICS ---
let gravity = 0.25;
let lift = -8;
let velocity = 0;
let airResistance = 0.98;

// --- OBSTACLES ---
let obstacles = [];
const obstacleWidth = 80;
const obstacleGap = 230;
const obstacleSpeed = 3;
const spawnInterval = 1800;

function createObstacle() {
  const topHeight = Math.random() * (canvas.height - obstacleGap - 100) + 50;
  obstacles.push({
    x: canvas.width,
    topHeight,
    bottomY: topHeight + obstacleGap,
    passed: false,
  });
}

// --- BACKGROUND CHART ---
let chartPoints = [];
const totalPoints = 60;
function initChart() {
  chartPoints = [];
  let y = canvas.height / 2;
  for (let i = 0; i < totalPoints; i++) {
    y += Math.random() * 15 - 7.5;
    chartPoints.push(y);
  }
}
initChart();

// --- SCORE ---
let score = 0;
let bestScore = 0;
let scoreScale = 1;

// --- GAME STATE ---
let gameOver = false;
let canRestart = false;
let gameStarted = false;

// --- BACKGROUND ---
function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#0c0f14");
  gradient.addColorStop(1, "#11151a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.beginPath();
  ctx.moveTo(0, chartPoints[0]);
  for (let i = 1; i < chartPoints.length; i++) {
    const x = (i / (totalPoints - 1)) * canvas.width;
    ctx.lineTo(x, chartPoints[i]);
  }
  ctx.strokeStyle = "rgba(200,200,200,0.08)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const lastY = chartPoints[chartPoints.length - 1];
  const nextY =
    lastY + Math.sin(Date.now() / 400) * 2 + (Math.random() - 0.5) * 3;
  chartPoints.push(nextY);
  chartPoints.shift();
}

// --- DRAW COIN ---
function drawCoin() {
  const glow = ctx.createRadialGradient(
    coin.x,
    coin.y,
    coin.radius * 0.3,
    coin.x,
    coin.y,
    coin.radius * 1.3
  );
  glow.addColorStop(0, "rgba(255,215,0,0.5)");
  glow.addColorStop(1, "rgba(255,215,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(coin.x, coin.y, coin.radius * 1.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2);
  ctx.fillStyle = "gold";
  ctx.fill();
  ctx.closePath();

  ctx.fillStyle = "#fff";
  ctx.font = `${coin.radius * 1.2}px Orbitron`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("₿", coin.x, coin.y);
}

// --- DRAW OBSTACLES ---
function drawObstacles() {
  obstacles.forEach((obs) => {
    const gradient = ctx.createLinearGradient(obs.x, 0, obs.x + obstacleWidth, 0);
    gradient.addColorStop(0, "#ff4d4d");
    gradient.addColorStop(1, "#ff0000");
    ctx.fillStyle = gradient;
    ctx.shadowColor = "#ff4d4d";
    ctx.shadowBlur = 15;
    ctx.fillRect(obs.x, 0, obstacleWidth, obs.topHeight);
    ctx.fillRect(obs.x, obs.bottomY, obstacleWidth, canvas.height - obs.bottomY);
    ctx.shadowBlur = 0;
  });
}

// --- UPDATE OBSTACLES ---
function updateObstacles() {
  obstacles.forEach((obs) => {
    obs.x -= obstacleSpeed;
    if (!obs.passed && obs.x + obstacleWidth < coin.x) {
      obs.passed = true;
      score++;
      pointSound.currentTime = 0;
      pointSound.play();
      if (score > bestScore) bestScore = score;
      scoreScale = 1.4;
    }
  });
  obstacles = obstacles.filter((obs) => obs.x + obstacleWidth > 0);
}

// --- COLLISION ---
function checkCollision() {
  for (let obs of obstacles) {
    if (
      coin.x + coin.radius > obs.x &&
      coin.x - coin.radius < obs.x + obstacleWidth &&
      (coin.y - coin.radius < obs.topHeight ||
        coin.y + coin.radius > obs.bottomY)
    )
      return true;
  }
  return false;
}

// --- RESTART ---
function restartGame() {
  gameOver = false;
  canRestart = false;
  velocity = 0;
  coin.y = canvas.height / 2;
  obstacles = [];
  score = 0;
  initChart();
  clearInterval(obstacleSpawner);
  obstacleSpawner = setInterval(createObstacle, spawnInterval);
}

// --- START PAGE (responsive) ---
function drawStartScreen() {
  drawBackground();

  const baseSize = Math.min(canvas.width, canvas.height);

  // Title
  ctx.fillStyle = "gold";
  ctx.shadowColor = "rgba(255,215,0,0.7)";
  ctx.shadowBlur = 25;
  ctx.font = `bold ${baseSize * 0.08}px Orbitron`;
  ctx.textAlign = "center";
  ctx.fillText("CRYPTO FLAP", canvas.width / 2, canvas.height * 0.35);
  ctx.shadowBlur = 0;

  // Coin bounce
  const coinSize = baseSize * 0.05;
  const coinY = canvas.height * 0.5 + Math.sin(Date.now() / 300) * 10;
  ctx.fillStyle = "gold";
  ctx.beginPath();
  ctx.arc(canvas.width / 2, coinY, coinSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = `${coinSize * 1.2}px Orbitron`;
  ctx.textBaseline = "middle";
  ctx.fillText("₿", canvas.width / 2, coinY);

  // Tap to start
  const opacity = 0.5 + 0.5 * Math.sin(Date.now() / 500);
  ctx.fillStyle = `rgba(255,255,255,${opacity})`;
  ctx.font = `${baseSize * 0.035}px Orbitron`;
  ctx.fillText("Tap to Start", canvas.width / 2, canvas.height * 0.75);
}

// --- GAME LOOP ---
function gameLoop() {
  if (!gameStarted) {
    drawStartScreen();
    requestAnimationFrame(gameLoop);
    return;
  }

  drawBackground();

  if (!gameOver) {
    velocity += gravity;
    velocity *= airResistance;
    coin.y += velocity;

    if (coin.y + coin.radius > canvas.height) {
      coin.y = canvas.height - coin.radius;
      gameOver = true;
      gameOverSound.play();
      setTimeout(() => (canRestart = true), 500);
    }
    if (coin.y - coin.radius < 0) {
      coin.y = coin.radius;
      velocity = 0;
    }

    updateObstacles();
    drawObstacles();
    drawCoin();

    if (checkCollision()) {
      gameOver = true;
      gameOverSound.play();
      setTimeout(() => (canRestart = true), 500);
    }

    ctx.save();
    ctx.translate(canvas.width / 2, 100);
    ctx.scale(scoreScale, scoreScale);
    ctx.fillStyle = "gold";
    ctx.shadowColor = "rgba(255,215,0,0.7)";
    ctx.shadowBlur = 20;
    ctx.font = "bold 48px Orbitron";
    ctx.textAlign = "center";
    ctx.fillText(score, 0, 0);
    ctx.restore();

    if (scoreScale > 1) scoreScale -= 0.05;

    ctx.font = "18px Orbitron";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.textAlign = "center";
    ctx.fillText(`Best: ${bestScore}`, canvas.width / 2, 140);
  } else {
    drawObstacles();
    drawCoin();

    ctx.fillStyle = "#ff4d4d";
    ctx.shadowColor = "#ff0000";
    ctx.shadowBlur = 25;
    ctx.font = "bold 50px Orbitron";
    ctx.textAlign = "center";
    ctx.fillText("💀 GAME OVER 💀", canvas.width / 2, canvas.height / 2 - 30);
    ctx.shadowBlur = 0;

    ctx.fillStyle = "gold";
    ctx.font = "bold 36px Orbitron";
    ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 50);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "20px Orbitron";
    ctx.fillText(`Best: ${bestScore}`, canvas.width / 2, canvas.height / 2 + 90);

    if (canRestart) {
      const opacity = 0.5 + 0.5 * Math.sin(Date.now() / 400);
      ctx.fillStyle = `rgba(255,255,255,${opacity})`;
      ctx.font = "22px Orbitron";
      ctx.fillText(
        "Tap or Click to Restart",
        canvas.width / 2,
        canvas.height / 2 + 140
      );
    }
  }

  requestAnimationFrame(gameLoop);
}

// --- CONTROLS ---
function flap() {
  if (!gameStarted) {
    gameStarted = true;
    bgMusic.play().catch(() => {});
    obstacleSpawner = setInterval(createObstacle, spawnInterval);
    return;
  }

  if (!gameOver) velocity = lift;
  else if (canRestart) restartGame();
}

window.addEventListener("mousedown", flap);
window.addEventListener("touchstart", flap);
window.addEventListener("keydown", (e) => {
  if (e.code === "Space") flap();
});

// --- START ---
let obstacleSpawner;
gameLoop();
