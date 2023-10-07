import { BOARD_WIDTH } from './config.js';

export function removeRows(){
    const rowsToRemove = [];
  
    board.forEach((row, y) => {
      if (row.every(value => value !== null)){
        rowsToRemove.push(y)
      }
    })
  
    rowsToRemove.forEach(y => {
      board.splice(y, 1);
      const newRow = Array(BOARD_WIDTH).fill(null);
      board.unshift(newRow);
    })
  
    switch(rowsToRemove.length) {
      case 1:
        score += 100;
        break;
      case 2:
        score += 250;
        break;
      case 3:
        score += 400;
        break;
      case 4:
        score += 600;
        break;
      default:
        break;
    }
  }
