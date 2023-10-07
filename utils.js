import { PIECES, BOARD_WIDTH } from './config.js';

export function randomPiece() {
    return PIECES[Math.floor(Math.random() * PIECES.length)];
}

export function checkColission(){
    for(let y = 0; y < piece.shape.length; y++) {
      for(let x = 0; x < piece.shape[y].length; x++) {
        if (
          piece.shape[y][x] !== 0 &&
          (board[y + piece.position.y] && board[y + piece.position.y][x + piece.position.x]) !== null
        ) {
          return true; // Hay una colisión
        }
      }
    }
    return false; // No hay colisión
  }