import { BOARD_HEIGHT, BOARD_WIDTH } from '../config/config.js'

export function createBoard (width = BOARD_WIDTH, height = BOARD_HEIGHT) {
  return Array.from({ length: height }, () => Array(width).fill(null))
}

export function hasCollision (piece, board) {
  const height = board.length
  const width = board[0]?.length ?? BOARD_WIDTH

  for (let y = 0; y < piece.shape.length; y++) {
    for (let x = 0; x < piece.shape[y].length; x++) {
      if (piece.shape[y][x] === 0) continue

      const boardX = x + piece.position.x
      const boardY = y + piece.position.y

      if (boardX < 0 || boardX >= width || boardY >= height) return true
      if (boardY >= 0 && board[boardY][boardX] !== null) return true
    }
  }

  return false
}

export function mergePiece (piece, board) {
  const height = board.length
  const width = board[0]?.length ?? BOARD_WIDTH

  piece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value === 0) return

      const boardX = x + piece.position.x
      const boardY = y + piece.position.y

      if (boardY >= 0 && boardY < height && boardX >= 0 && boardX < width) {
        board[boardY][boardX] = piece.color
      }
    })
  })
}

const LINE_POINTS = [0, 100, 250, 400, 600]

export function clearCompletedRows (board) {
  const remainingRows = board.filter((row) => row.some((cell) => cell === null))
  const lines = board.length - remainingRows.length
  const width = board[0]?.length ?? BOARD_WIDTH

  while (remainingRows.length < board.length) {
    remainingRows.unshift(Array(width).fill(null))
  }

  board.splice(0, board.length, ...remainingRows)

  return {
    lines,
    points: LINE_POINTS[lines] ?? 0
  }
}
