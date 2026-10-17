import test from 'node:test'
import assert from 'node:assert/strict'

import { BOARD_HEIGHT, BOARD_WIDTH } from '../src/js/config/config.js'
import {
  clearCompletedRows,
  createBoard,
  hasCollision,
  mergePiece
} from '../src/js/game/board.js'
import {
  clonePiece,
  createPiece,
  rotateMatrix
} from '../src/js/game/pieces.js'
import {
  createGame,
  holdActivePiece,
  moveActivePiece,
  resetGame,
  rotateActivePiece
} from '../src/js/game/engine.js'

function createTestRandom(sequence) {
  let index = 0
  return () => sequence[index++ % sequence.length]
}

test('empty board has the configured dimensions', () => {
  const board = createBoard()

  assert.equal(board.length, BOARD_HEIGHT)
  assert.equal(board[0].length, BOARD_WIDTH)
  assert.ok(board.every((row) => row.every((cell) => cell === null)))
})

test('collision ignores cells above the board but rejects walls and floor', () => {
  const board = createBoard()
  const piece = createPiece({ shape: [[1]], color: '#fff' })

  piece.position = { x: 0, y: -1 }
  assert.equal(hasCollision(piece, board), false)

  piece.position = { x: -1, y: 0 }
  assert.equal(hasCollision(piece, board), true)

  piece.position = { x: 0, y: BOARD_HEIGHT }
  assert.equal(hasCollision(piece, board), true)
})

test('completed adjacent rows are all removed and empty rows are added at the top', () => {
  const board = createBoard()
  board[BOARD_HEIGHT - 1].fill('#fff')
  board[BOARD_HEIGHT - 2].fill('#fff')

  const result = clearCompletedRows(board)

  assert.deepEqual(result, { lines: 2, points: 250 })
  assert.equal(board.filter((row) => row.every((cell) => cell === '#fff')).length, 0)
  assert.equal(board.length, BOARD_HEIGHT)
  assert.ok(board[0].every((cell) => cell === null))
})

test('mergePiece writes only occupied cells and never corrupts the board dimensions', () => {
  const board = createBoard()
  const piece = createPiece({ shape: [[1, 0], [0, 1]], color: '#abc' })
  piece.position = { x: 1, y: 1 }

  mergePiece(piece, board)

  assert.equal(board[1][1], '#abc')
  assert.equal(board[2][2], '#abc')
  assert.equal(board[1][2], null)
  assert.equal(board.length, BOARD_HEIGHT)
})

test('piece clones do not share mutable shape or position references', () => {
  const original = createPiece({ shape: [[1, 0], [1, 1]], color: '#abc' })
  const clone = clonePiece(original)

  clone.shape[0][0] = 0
  clone.position.x = 8

  assert.equal(original.shape[0][0], 1)
  assert.equal(original.position.x, 0)
})

test('rotation returns a clockwise matrix without mutating the source', () => {
  const shape = [[1, 0], [1, 1]]

  assert.deepEqual(rotateMatrix(shape), [[1, 1], [1, 0]])
  assert.deepEqual(shape, [[1, 0], [1, 1]])
})

test('rotation is rejected when it would overlap a locked cell', () => {
  const board = createBoard()
  const game = createGame({ random: createTestRandom([0]) })

  board[0][game.activePiece.position.x + 1] = '#locked'
  game.board = board

  const rotated = rotateActivePiece(game)

  assert.equal(rotated, false)
})

test('holding the same shaped piece still swaps and can only happen once per turn', () => {
  const game = createGame({ random: createTestRandom([0, 0, 1]) })
  const activeBeforeHold = clonePiece(game.activePiece)

  assert.equal(holdActivePiece(game), true)
  assert.deepEqual(game.heldPiece.shape, activeBeforeHold.shape)
  assert.equal(holdActivePiece(game), false)
})

test('moving down locks a piece, clears rows, and advances to a cloned next piece', () => {
  const game = createGame({ random: createTestRandom([0, 0, 1]) })
  game.activePiece.position.y = BOARD_HEIGHT - 2

  const points = moveActivePiece(game, 'down')

  assert.equal(points, 0)
  assert.equal(game.activePiece.position.y, 0)
  assert.equal(game.gameOver, false)
  assert.notEqual(game.activePiece.shape, game.nextPiece.shape)
})

test('resetGame returns a fresh game with score, hold and board reset', () => {
  const game = createGame({ random: createTestRandom([0, 1, 2]) })
  game.score = 500
  game.heldPiece = clonePiece(game.activePiece)
  game.board[0][0] = '#locked'

  const reset = resetGame(game, { random: createTestRandom([2, 1, 0]) })

  assert.equal(reset.score, 0)
  assert.equal(reset.heldPiece, null)
  assert.ok(reset.board.every((row) => row.every((cell) => cell === null)))
  assert.equal(reset.gameOver, false)
})
