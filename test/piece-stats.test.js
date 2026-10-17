import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createPieceStats,
  getPieceGlyphPath,
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

test('piece stats expose the tetromino shape for a visual thumbnail', () => {
  const view = getPieceStatsView(createPieceStats())
  const square = view.rows.find((row) => row.id === 'o')
  const line = view.rows.find((row) => row.id === 'i')

  assert.deepEqual(square.shape, [[1, 1], [1, 1]])
  assert.deepEqual(line.shape, [[1, 1, 1, 1]])
})

test('piece stats expose one unified outline path per tetromino', () => {
  const view = getPieceStatsView(createPieceStats())
  const line = view.rows.find((row) => row.id === 'i')
  const square = view.rows.find((row) => row.id === 'o')

  assert.equal(line.glyphPath.match(/M /g)?.length, 1)
  assert.equal(square.glyphPath.match(/M /g)?.length, 1)
  assert.match(line.glyphPath, /0 0.*4 0.*4 1.*0 1.*Z/)
  assert.match(getPieceGlyphPath([[1, 1, 1, 1]]), /^M /)
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
