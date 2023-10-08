import { PIECES, BOARD_WIDTH } from "../config/config.js";

export function randomPiece() {
  return PIECES[Math.floor(Math.random() * PIECES.length)];
}

export function checkColission(specificPiece, board) {
  for (let y = 0; y < specificPiece.shape.length; y++) {
    for (let x = 0; x < specificPiece.shape[y].length; x++) {
      let boardY = y + specificPiece.position.y;
      let boardX = x + specificPiece.position.x;

      if (
        specificPiece.shape[y][x] !== 0 &&
        (boardY >= 0 && board[boardY] && board[boardY][boardX]) !== null
      ) {
        return true; // Hay una colisión
      }
    }
  }
  return false; // No hay colisión
}
