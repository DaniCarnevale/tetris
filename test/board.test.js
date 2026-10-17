import test from 'node:test'
import assert from 'node:assert/strict'

import { BOARD_WIDTH } from '../src/js/config/config.js'
import { clearCompletedRows, createBoard, getCompletedRows, hasCollision, mergePiece } from '../src/js/game/board.js'
import { createPiece } from '../src/js/game/pieces.js'

test('board helpers tolerate empty boards and sparse piece shapes', () => {
  const piece = createPiece({ shape: [[1, 0], [0, 1]], color: '#fff' })
  piece.position = { x: 0, y: 0 }

  assert.equal(hasCollision(piece, []), true)
  mergePiece(piece, [])
  assert.deepEqual(getCompletedRows([]), [])
  assert.deepEqual(clearCompletedRows([]), { lines: 0, points: 0 })
})

test('collision and merge distinguish empty cells, locked cells and out-of-bounds cells', () => {
  const board = createBoard()
  const piece = createPiece({ shape: [[1, 0], [0, 1]], color: '#fff' })
  piece.position = { x: 0, y: 0 }

  board[0][0] = '#locked'
  assert.equal(hasCollision(piece, board), true)

  board[0][0] = null
  piece.position = { x: -1, y: -1 }
  mergePiece(piece, board)
  assert.equal(board[0][0], '#fff')

  piece.position = { x: BOARD_WIDTH - 1, y: 0 }
  mergePiece(piece, board)
  assert.equal(board[0][BOARD_WIDTH - 1], '#fff')
})

test('completed rows filter partial and empty rows and return zero points above a tetris', () => {
  const board = createBoard(4, 6)
  board[0].fill('#full')
  board[1][0] = '#partial'

  assert.deepEqual(getCompletedRows(board).map((row) => row.y), [0])

  board.forEach((row) => row.fill('#full'))
  assert.deepEqual(clearCompletedRows(board), { lines: 6, points: 0 })
  assert.ok(board.every((row) => row.every((cell) => cell === null)))
})
