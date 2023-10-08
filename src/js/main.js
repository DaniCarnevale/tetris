import { BLOCK_SIZE, BOARD_WIDTH, BOARD_HEIGHT } from "./config/config.js";
import { getCurrentLevel } from "./managers/levelManager.js";
import { randomPiece, checkColission } from "./utils/utils.js";
import { movePiece, rotatePiece, solidifyPiece } from "./managers/pieceManager.js";
import { removeRows } from "./managers/boardManager.js";
import audioSrc from '../assets/audio/tetris.mp3';
import "../styles/style.css";

// Inicializar el canvas
const canvas = document.querySelector("canvas");
const context = canvas.getContext("2d");
const $score = document.querySelector("span");

canvas.width = BLOCK_SIZE * BOARD_WIDTH;
canvas.height = BLOCK_SIZE * BOARD_HEIGHT;
context.scale(BLOCK_SIZE, BLOCK_SIZE);

const board = Array(BOARD_HEIGHT)
  .fill()
  .map(() => Array(BOARD_WIDTH).fill(null));

let score = 0;
let level = document.getElementById('level');

const piece = {
  position: { x: 5, y: 5 },
  ...randomPiece(),
};

let dropCounter = 0;
let lastTime = 0;

// Iniciar audio
const audio = new Audio(audioSrc);
audio.loop = true;
//audio.volume = 0.2;
audio.volume = 0;

window.addEventListener('focus', () => {
  audio.play();
});

window.addEventListener('blur', () => {
  audio.pause();
});

function playAudio() {
  if (audio.paused) {
    audio.play();
  }
}

function update(time = 0) {
  playAudio();
  
  const deltaTime = time - lastTime;
  lastTime = time;

  const currentLevel = getCurrentLevel(score);

  dropCounter += deltaTime;
  if (dropCounter > currentLevel.speed) {
    piece.position.y++;
    dropCounter = 0;

    if (checkColission(piece, board)) {
      piece.position.y--;

      const gameOver = solidifyPiece(piece, board); // Esto devuelve true si el juego ha terminado
      if (gameOver) {
        resetGame();  // Si el juego ha terminado, reinícialo.
      } else {
        const points = removeRows(board);
        score += points;
      }
    }
  }

  draw();
  window.requestAnimationFrame(update);
}


function draw() {
  context.fillStyle = "#000";
  context.fillRect(0, 0, canvas.width, canvas.height);

  board.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== null) {
        context.fillStyle = value;
        context.fillRect(x, y, 1, 1);
      }
    });
  });

  piece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        context.fillStyle = piece.color;
        context.fillRect(x + piece.position.x, y + piece.position.y, 1, 1);
      }
    });
  });

  const currentLevel = getCurrentLevel(score);
  $score.innerText = score;
  level.innerText = currentLevel.level;
}

document.addEventListener("keydown", (event) => {
  if (
    event.key === "ArrowLeft" ||
    event.key === "ArrowRight" ||
    event.key === "ArrowDown" ||
    event.key === "ArrowUp"
  ) {
    const direction = event.key.replace("Arrow", "").toLowerCase();
    score += movePiece(piece, direction, board);

    if (direction === "up") {
      rotatePiece(piece, board);
    }
  }
});

function resetGame() {
  board.forEach((row) => row.fill(null));
  score = 0;
}

update();
