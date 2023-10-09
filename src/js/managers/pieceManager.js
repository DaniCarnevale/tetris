import { BOARD_WIDTH } from "../config/config";
import { removeRows } from "./boardManager.js";
import { checkColission, randomPiece } from "../utils/utils.js";

export function movePiece(piece, direction, board, nextPiece, drawUpcomingPiece) {
  switch (direction) {
    case "left":
      piece.position.x--;
      if (checkColission(piece, board)) {
        piece.position.x++;
      }
      break;
    case "right":
      piece.position.x++;
      if (checkColission(piece, board)) {
        piece.position.x--;
      }
      break;
    case "down":
      piece.position.y++;
      if (checkColission(piece, board)) {
        piece.position.y--;
        solidifyPiece(piece, board, nextPiece);
        const points = removeRows(board);
        const newNextPiece = randomPiece();
        nextPiece.shape = newNextPiece.shape;
        nextPiece.color = newNextPiece.color; 

        drawUpcomingPiece(nextPiece);
        return points;
      }
      break;
  }
  return 0;
}

export function rotatePiece(piece, board) {
  const rotated = [];
  for (let i = 0; i < piece.shape[0].length; i++) {
    const row = [];
    for (let j = piece.shape.length - 1; j >= 0; j--) {
      row.push(piece.shape[j][i]);
    }
    rotated.push(row);
  }

  const previousShape = piece.shape;
  piece.shape = rotated;

  if (checkColission(piece, board)) {
    piece.shape = previousShape;
  }
}

export function solidifyPiece(piece, board, nextPiece) {
  piece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value === 1) {
        board[y + piece.position.y][x + piece.position.x] = piece.color;
      }
    });
  });

  //resetea la pieza arriba
  piece.position.x = Math.floor(BOARD_WIDTH / 2 - 2);
  piece.position.y = 0;

  //Genera una pieza random
  piece.shape = nextPiece.shape;
  piece.color = nextPiece.color;

  // Verificar colisión justo después de generar una nueva pieza
  if (checkColission(piece, board)) {
    window.alert("Game Over!");
    return true; // Indica que el juego ha terminado
  }
  return false; // Indica que el juego no ha terminado
}
