import { createBoard, clearCompletedRows, hasCollision, mergePiece } from './board.js'
import { clonePiece, randomPiece, rotateMatrix, spawnPiece } from './pieces.js'

export function createGame ({ random = Math.random } = {}) {
  return {
    board: createBoard(),
    activePiece: spawnPiece(randomPiece(random)),
    nextPiece: randomPiece(random),
    heldPiece: null,
    holdUsed: false,
    score: 0,
    gameOver: false,
    random
  }
}

function lockActivePiece (game) {
  mergePiece(game.activePiece, game.board)
  const result = clearCompletedRows(game.board)
  game.score += result.points
  game.activePiece = spawnPiece(clonePiece(game.nextPiece))
  game.nextPiece = randomPiece(game.random)
  game.holdUsed = false
  game.gameOver = hasCollision(game.activePiece, game.board)

  return result.points
}

export function moveActivePiece (game, direction) {
  if (game.gameOver) return 0

  if (direction === 'left' || direction === 'right') {
    const offset = direction === 'left' ? -1 : 1
    game.activePiece.position.x += offset

    if (hasCollision(game.activePiece, game.board)) {
      game.activePiece.position.x -= offset
    }

    return 0
  }

  if (direction !== 'down') return 0

  game.activePiece.position.y++
  if (!hasCollision(game.activePiece, game.board)) return 0

  game.activePiece.position.y--
  return lockActivePiece(game)
}

export function rotateActivePiece (game) {
  if (game.gameOver) return false

  const previousShape = game.activePiece.shape
  game.activePiece.shape = rotateMatrix(previousShape)

  if (hasCollision(game.activePiece, game.board)) {
    game.activePiece.shape = previousShape
    return false
  }

  return true
}

export function holdActivePiece (game) {
  if (game.gameOver || game.holdUsed) return false

  const currentPiece = clonePiece(game.activePiece)

  if (game.heldPiece === null) {
    game.heldPiece = currentPiece
    game.activePiece = spawnPiece(clonePiece(game.nextPiece))
    game.nextPiece = randomPiece(game.random)
  } else {
    const heldPiece = game.heldPiece
    game.heldPiece = currentPiece
    game.activePiece = spawnPiece(clonePiece(heldPiece))
  }

  game.holdUsed = true
  game.gameOver = hasCollision(game.activePiece, game.board)
  return true
}

export function resetGame (game, { random = game.random } = {}) {
  return createGame({ random })
}
