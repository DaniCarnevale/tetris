import { BOARD_WIDTH } from '../config/config.js';

export function removeRows(specificBoard) {
  const rowsToRemove = [];

  specificBoard.forEach((row, y) => {
    if (row.every((value) => value !== null)) {
      rowsToRemove.push(y);
    }
  });

  rowsToRemove.forEach((y) => {
    specificBoard.splice(y, 1);
    const newRow = Array(BOARD_WIDTH).fill(null);
    specificBoard.unshift(newRow);
  });

  switch (rowsToRemove.length) {
    case 1:
      return 100;
    case 2:
      return 250;
    case 3:
      return 400;
    case 4:
      return 600;
    default:
      return 0;
  }
}
