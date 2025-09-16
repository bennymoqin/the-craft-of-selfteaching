const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const startButton = document.getElementById("start-button");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const messageEl = document.getElementById("message");

const state = {
  running: false,
  lastTime: 0,
  score: 0,
  lives: 3,
  spawnTimer: 0,
  keys: {},
  player: {
    width: 44,
    height: 50,
    x: canvas.width / 2 - 22,
    y: canvas.height - 90,
    speed: 280,
    cooldown: 0,
    fireRate: 0.25,
  },
  bullets: [],
  enemies: [],
};

const STAR_COUNT = 60;
const stars = new Array(STAR_COUNT).fill(0).map(() => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  size: Math.random() * 1.5 + 0.5,
  speed: Math.random() * 30 + 20,
}));

function resetGame() {
  state.running = true;
  state.lastTime = 0;
  state.score = 0;
  state.lives = 3;
  state.spawnTimer = 0.5;
  state.bullets = [];
  state.enemies = [];
  state.player.x = canvas.width / 2 - state.player.width / 2;
  state.player.y = canvas.height - 90;
  state.player.cooldown = 0;
  updateHud();
  hideMessage();
}

function startGame() {
  if (state.running) return;
  resetGame();
  startButton.disabled = true;
  startButton.textContent = "游戏中…";
  window.requestAnimationFrame(loop);
}

function endGame() {
  state.running = false;
  startButton.disabled = false;
  startButton.textContent = "重新开始";
  showMessage(
    `游戏结束！<br />最终得分：<strong>${state.score}</strong><br />点击“重新开始”再试一次。`
  );
}

function updateHud() {
  scoreEl.textContent = state.score;
  livesEl.textContent = state.lives;
}

function showMessage(text) {
  messageEl.innerHTML = text;
  messageEl.classList.remove("hidden");
}

function hideMessage() {
  messageEl.classList.add("hidden");
}

function handleKeyDown(event) {
  const importantKeys = [
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Space",
    "KeyA",
    "KeyD",
    "KeyW",
    "KeyS",
  ];
  if (importantKeys.includes(event.code)) {
    event.preventDefault();
  }
  state.keys[event.code] = true;
}

function handleKeyUp(event) {
  state.keys[event.code] = false;
}

function spawnEnemy() {
  const enemyWidth = 40;
  const enemyHeight = 40;
  const x = Math.random() * (canvas.width - enemyWidth);
  const speed = Math.random() * 60 + 90;
  state.enemies.push({
    x,
    y: -enemyHeight,
    width: enemyWidth,
    height: enemyHeight,
    speed,
    health: 1,
  });
}

function update(delta) {
  const player = state.player;
  const keys = state.keys;

  player.cooldown = Math.max(0, player.cooldown - delta);

  let horizontal = 0;
  if (keys["ArrowLeft"] || keys["KeyA"]) horizontal -= 1;
  if (keys["ArrowRight"] || keys["KeyD"]) horizontal += 1;

  let vertical = 0;
  if (keys["ArrowUp"] || keys["KeyW"]) vertical -= 1;
  if (keys["ArrowDown"] || keys["KeyS"]) vertical += 1;

  if (horizontal !== 0 && vertical !== 0) {
    const factor = Math.sqrt(0.5);
    horizontal *= factor;
    vertical *= factor;
  }

  player.x += horizontal * player.speed * delta;
  player.y += vertical * player.speed * delta;

  const minY = canvas.height * 0.4;
  if (player.y < minY) player.y = minY;
  if (player.y > canvas.height - player.height - 10)
    player.y = canvas.height - player.height - 10;
  if (player.x < 10) player.x = 10;
  if (player.x > canvas.width - player.width - 10)
    player.x = canvas.width - player.width - 10;

  if ((keys["Space"] || keys["KeyJ"]) && player.cooldown === 0) {
    fireBullet();
  }

  updateBullets(delta);
  updateEnemies(delta);
  checkCollisions();
}

function fireBullet() {
  const player = state.player;
  const bulletWidth = 6;
  const bulletHeight = 14;
  const bulletX = player.x + player.width / 2 - bulletWidth / 2;
  const bulletY = player.y - bulletHeight;
  state.bullets.push({
    x: bulletX,
    y: bulletY,
    width: bulletWidth,
    height: bulletHeight,
    speed: 460,
  });
  player.cooldown = player.fireRate;
}

function updateBullets(delta) {
  state.bullets.forEach((bullet) => {
    bullet.y -= bullet.speed * delta;
  });
  state.bullets = state.bullets.filter((bullet) => bullet.y + bullet.height > -5);
}

function updateEnemies(delta) {
  state.spawnTimer -= delta;
  if (state.spawnTimer <= 0) {
    spawnEnemy();
    state.spawnTimer = Math.random() * 0.7 + 0.6;
  }

  state.enemies.forEach((enemy) => {
    enemy.y += enemy.speed * delta;
  });

  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const enemy = state.enemies[i];
    if (enemy.y > canvas.height) {
      state.enemies.splice(i, 1);
      loseLife();
    }
  }
}

function loseLife() {
  state.lives -= 1;
  updateHud();
  if (state.lives <= 0) {
    endGame();
  }
}

function checkCollisions() {
  const player = state.player;

  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const enemy = state.enemies[i];

    // Bullet vs enemy
    for (let j = state.bullets.length - 1; j >= 0; j -= 1) {
      const bullet = state.bullets[j];
      if (rectIntersect(bullet, enemy)) {
        state.bullets.splice(j, 1);
        enemy.health -= 1;
        if (enemy.health <= 0) {
          state.enemies.splice(i, 1);
          state.score += 100;
          updateHud();
        }
        break;
      }
    }

    // Enemy vs player
    if (rectIntersect(enemy, {
      x: player.x + 6,
      y: player.y + 10,
      width: player.width - 12,
      height: player.height - 14,
    })) {
      state.enemies.splice(i, 1);
      loseLife();
      break;
    }
  }
}

function rectIntersect(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function updateStars(delta) {
  stars.forEach((star) => {
    star.y += star.speed * delta;
    if (star.y > canvas.height) {
      star.y = -star.size;
      star.x = Math.random() * canvas.width;
    }
  });
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawPlayer();
  drawBullets();
  drawEnemies();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#021024");
  gradient.addColorStop(0.7, "#03091f");
  gradient.addColorStop(1, "#06081f");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  stars.forEach((star) => {
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawPlayer() {
  const { x, y, width, height } = state.player;
  ctx.save();
  ctx.translate(x + width / 2, y + height / 2);
  ctx.fillStyle = "#84d9ff";
  ctx.beginPath();
  ctx.moveTo(0, -height / 2);
  ctx.lineTo(width / 2, height / 2);
  ctx.lineTo(0, height / 4);
  ctx.lineTo(-width / 2, height / 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#1976d2";
  ctx.fillRect(-width / 4, 0, width / 2, height / 2.5);
  ctx.restore();
}

function drawBullets() {
  ctx.fillStyle = "#ffec99";
  state.bullets.forEach((bullet) => {
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  });
}

function drawEnemies() {
  state.enemies.forEach((enemy) => {
    ctx.save();
    ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
    ctx.fillStyle = "#ff6b6b";
    ctx.beginPath();
    ctx.moveTo(0, enemy.height / 2);
    ctx.lineTo(enemy.width / 2, -enemy.height / 2);
    ctx.lineTo(0, -enemy.height / 3);
    ctx.lineTo(-enemy.width / 2, -enemy.height / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });
}

function loop(timestamp) {
  if (!state.running) {
    return;
  }

  const delta = state.lastTime ? (timestamp - state.lastTime) / 1000 : 0;
  state.lastTime = timestamp;

  updateStars(delta);
  update(delta);
  render();

  window.requestAnimationFrame(loop);
}

window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);
window.addEventListener("blur", () => {
  state.keys = {};
});

startButton.addEventListener("click", startGame);

showMessage(
  "使用方向键或 WASD 控制飞机移动，空格/ J 键发射子弹。<br />点击上方按钮开始游戏！"
);
