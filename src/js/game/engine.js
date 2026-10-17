import { clearCompletedRows, getCompletedRows, hasCollision, mergePiece } from './board.js'
import { clonePiece, randomPiece, rotateMatrix, spawnPiece } from './pieces.js'
import { createStageBoard, getStage } from './stages.js'
import { levels } from '../utils/levels.js'

function normalizeStartLevel (startLevel) {
  if (!Number.isInteger(startLevel)) return 1
  return Math.max(1, Math.min(startLevel, levels.length))
}

export function createGame ({ random = Math.random, startLevel = 1, startingStage = 'fresh' } = {}) {
  const normalizedStartLevel = normalizeStartLevel(startLevel)
  const stage = getStage(startingStage)

  return {
    board: createStageBoard(stage.id),
    activePiece: spawnPiece(randomPiece(random)),
    nextPiece: randomPiece(random),
    heldPiece: null,
    holdUsed: false,
    score: 0,
    lines: 0,
    startLevel: normalizedStartLevel,
    stageId: stage.id,
    paused: false,
    gameOver: false,
    lastEvent: null,
    random
  }
}

function lockActivePiece (game) {
  mergePiece(game.activePiece, game.board)
  const clearedRows = getCompletedRows(game.board)
  const result = clearCompletedRows(game.board)
  game.score += result.points
  game.lines += result.lines
  game.activePiece = spawnPiece(clonePiece(game.nextPiece))
  game.nextPiece = randomPiece(game.random)
  game.holdUsed = false
  game.gameOver = hasCollision(game.activePiece, game.board)
  game.lastEvent = {
    type: result.lines > 0 ? 'line-clear' : 'lock',
    lines: result.lines,
    points: result.points,
    clearedRows,
    gameOver: game.gameOver
  }

  return result.points
}

export function moveActivePiece (game, direction) {
  if (game.gameOver || game.paused) return 0
  game.lastEvent = null

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
  if (game.gameOver || game.paused) return false

  const previousShape = game.activePiece.shape
  game.activePiece.shape = rotateMatrix(previousShape)

  if (hasCollision(game.activePiece, game.board)) {
    game.activePiece.shape = previousShape
    return false
  }

  return true
}

export function holdActivePiece (game) {
  if (game.gameOver || game.paused || game.holdUsed) return false

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
  return createGame({
    random,
    startLevel: game.startLevel,
    startingStage: game.stageId
  })
}

export function togglePause (game) {
  if (game.gameOver) return game.paused
  game.paused = !game.paused
  return game.paused
}
