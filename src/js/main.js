import { BLOCK_SIZE, BOARD_WIDTH, BOARD_HEIGHT } from "./config/config.js";
import { getCurrentLevel } from "./managers/levelManager.js";
import { randomPiece, checkColission } from "./utils/utils.js";
import { movePiece, rotatePiece, solidifyPiece } from "./managers/pieceManager.js";
import { removeRows } from "./managers/boardManager.js";
import audioSrc from '../assets/audio/tetris.mp3';
import "../styles/style.css";

// Inicializar el canvas
const canvas = document.querySelector("canvas#board");
const context = canvas.getContext("2d");
const $score = document.querySelector("span");

canvas.width = BLOCK_SIZE * BOARD_WIDTH;
canvas.height = BLOCK_SIZE * BOARD_HEIGHT;
context.scale(BLOCK_SIZE, BLOCK_SIZE);

// Inicializar el canvas del próximo bloque
const canvasNext = document.querySelector("canvas.next");
const contextNext = canvasNext.getContext("2d");

canvasNext.width = BLOCK_SIZE * 4;
canvasNext.height = BLOCK_SIZE * 4;
contextNext.scale(BLOCK_SIZE, BLOCK_SIZE);

// Inicializar el canvas del bloque guardado
const canvasSaved = document.querySelector("canvas.saved");
const contextSaved = canvasSaved.getContext("2d");

canvasSaved.width = BLOCK_SIZE * 4;
canvasSaved.height = BLOCK_SIZE * 4;
contextSaved.scale(BLOCK_SIZE, BLOCK_SIZE);

const board = Array(BOARD_HEIGHT)
  .fill()
  .map(() => Array(BOARD_WIDTH).fill(null));

let score = 0;
let level = document.getElementById('level');

const piece = {
  position: { x: Math.floor(BOARD_WIDTH / 2 - 2), y: 0 },
  ...randomPiece(),
};

let savedPiece = null;
let nextPiece = randomPiece();

let dropCounter = 0;
let lastTime = 0;

// Iniciar audio
// const audio = new Audio(audioSrc);
// audio.loop = true;
// audio.volume = 0.2;
// audio.volume = 0;

// window.addEventListener('focus', () => {
//   audio.play();
// });

// window.addEventListener('blur', () => {
//   audio.pause();
// });

// function playAudio() {
//   if (audio.paused) {
//     audio.play();
//   }
// }

function update(time = 0) {
  // playAudio();

  if (latestInput !== null) {
    if (latestInput === "up") {
      rotatePiece(piece, board);
    }
    if (latestInput === "s") {
      if (savedPiece && savedPiece.shape !== piece.shape && savedPiece.color !== piece.color) {
        piece.position = { x: Math.floor(BOARD_WIDTH / 2 - 2), y: 0 };
        piece.shape = savedPiece.shape;
        piece.color = savedPiece.color;

        savedPiece = null;
      } else if (!savedPiece) {
        savedPiece = { ...piece };
        const transformedPiece = nextPiece;
        piece.position = { x: Math.floor(BOARD_WIDTH / 2 - 2), y: 0 };
        piece.shape = transformedPiece.shape;
        piece.color = transformedPiece.color;
        
        nextPiece = randomPiece();
        drawUpcomingPiece(nextPiece);
      }

      drawSavedPiece(savedPiece);
    }

    score += movePiece(piece, latestInput, board, nextPiece, drawUpcomingPiece);
  }

  const deltaTime = time - lastTime;
  lastTime = time;

  const currentLevel = getCurrentLevel(score);

  dropCounter += deltaTime;
  if (dropCounter > currentLevel.speed) {
    piece.position.y++;
    dropCounter = 0;

    if (checkColission(piece, board)) {
      piece.position.y--;

      const gameOver = solidifyPiece(piece, board, nextPiece);
      if (gameOver) {
        resetGame();
      } else {
        const points = removeRows(board);
        score += points;

        nextPiece = randomPiece();
        drawUpcomingPiece(nextPiece);
      }
    }
  }

  latestInput = null;

  draw();
  window.requestAnimationFrame(update);
}

function drawUpcomingPiece(piece) {
  contextNext.fillStyle = "#000";
  contextNext.fillRect(0, 0, canvasNext.width, canvasNext.height);

  if (!piece) return;

  piece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        contextNext.fillStyle = piece.color;
        contextNext.fillRect(x, y, 1, 1);
      }
    });
  });
}

function drawSavedPiece(piece) {
  contextSaved.fillStyle = "#000";
  contextSaved.fillRect(0, 0, canvasSaved.width, canvasSaved.height);

  if (!piece) return;

  piece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        contextSaved.fillStyle = piece.color;
        contextSaved.fillRect(x, y, 1, 1);
      }
    });
  });
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

let latestInput = null;

document.addEventListener("keydown", (event) => {
  const direction = event.key.replace("Arrow", "").toLowerCase();
  latestInput = direction;
});

function resetGame() {
  board.forEach((row) => row.fill(null));
  score = 0;
}

update();
drawUpcomingPiece(nextPiece);
drawSavedPiece();
