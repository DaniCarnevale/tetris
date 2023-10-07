import { BLOCK_SIZE, BOARD_WIDTH, BOARD_HEIGHT } from './config.js';
import { randomPiece, checkCollision } from './utils.js';
import { movePiece, rotatePiece, solidifyPiece } from './pieceManager.js';
import { removeRows } from './boardManager.js';

// Inicializar el canvas
const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d'); 
const $score = document.querySelector('span');

canvas.width = BLOCK_SIZE * BOARD_WIDTH;
canvas.height = BLOCK_SIZE * BOARD_HEIGHT;
context.scale(BLOCK_SIZE, BLOCK_SIZE); 

const board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(null));

let score = 0;

const piece = {
  position: { x: 5, y: 5 },
  ...randomPiece()
};

let dropCounter = 0;
let lastTime = 0;

function update(time = 0) {
  const deltaTime = time - lastTime;
  lastTime = time;

  dropCounter += deltaTime;
  if (dropCounter > 500) {
    piece.position.y++;
    dropCounter = 0;

    if(checkCollision(piece, board)) {
      piece.position.y--;
      solidifyPiece(piece, board);
      removeRows(board);
    }
  }

  draw(); 
  window.requestAnimationFrame(update);
}

function draw() {
  context.fillStyle = '#000';
  context.fillRect(0, 0, canvas.width, canvas.height );

  board.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== null) {
        context.fillStyle = value;
        context.fillRect(x, y, 1, 1);
      }
    })
  });

  piece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        context.fillStyle = piece.color;
        context.fillRect(x + piece.position.x, y + piece.position.y, 1, 1);
      }
    });
  });

  $score.innerText = score;
}

document.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    const direction = event.key.replace('Arrow', '').toLowerCase();
    movePiece(piece, direction, board);

    if (direction === 'up') {
      rotatePiece(piece, board);
    }
  }
});

update();
