import { BOARD_WIDTH, PIECES } from '../config/config.js'

function cloneShape (shape) {
  return shape.map((row) => [...row])
}

export function createPiece (template) {
  return {
    id: template.id ?? null,
    position: { x: 0, y: 0 },
    shape: cloneShape(template.shape),
    color: template.color
  }
}

export function clonePiece (piece) {
  return {
    id: piece.id ?? null,
    position: { ...piece.position },
    shape: cloneShape(piece.shape),
    color: piece.color
  }
}

export function spawnPiece (piece) {
  piece.position = {
    x: Math.floor(BOARD_WIDTH / 2) - 2,
    y: 0
  }
  return piece
}

export function randomPiece (random = Math.random) {
  const template = PIECES[Math.floor(random() * PIECES.length)]
  return createPiece(template)
}

export function rotateMatrix (matrix) {
  return matrix[0].map((_, column) =>
    matrix.map((row) => row[column]).reverse()
  )
}
