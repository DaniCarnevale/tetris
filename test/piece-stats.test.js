import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createPieceStats,
  getPieceStatsView,
  recordPieceDrop
} from '../src/js/game/pieceStats.js'

test('piece stats start with one counter per tetromino', () => {
  const stats = createPieceStats()
  const view = getPieceStatsView(stats)

  assert.equal(view.total, 0)
  assert.equal(view.rows.length, 7)
  assert.ok(view.rows.every((row) => row.count === 0 && row.width === 0))
})

test('piece stats count locked pieces and scale bars against the most used type', () => {
  let stats = createPieceStats()
  stats = recordPieceDrop(stats, 'o')
  stats = recordPieceDrop(stats, 'o')
  stats = recordPieceDrop(stats, 't')

  const view = getPieceStatsView(stats)
  const square = view.rows.find((row) => row.id === 'o')
  const tee = view.rows.find((row) => row.id === 't')

  assert.equal(view.total, 3)
  assert.equal(square.count, 2)
  assert.equal(square.width, 100)
  assert.equal(tee.count, 1)
  assert.equal(tee.width, 50)
})

test('unknown piece ids do not create accidental statistics', () => {
  const stats = createPieceStats()

  assert.deepEqual(recordPieceDrop(stats, 'unknown'), stats)
  assert.equal(getPieceStatsView(stats).total, 0)
})
