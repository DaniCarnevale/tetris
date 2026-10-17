import test from 'node:test'
import assert from 'node:assert/strict'

import {
  MAX_RUN_ACTIONS,
  createSeededRandom,
  normalizeRunActions,
  replayRun
} from '../src/js/leaderboard/runSecurity.js'

test('seeded runs reproduce the same piece sequence', () => {
  const first = createSeededRandom(123456)
  const second = createSeededRandom(123456)

  assert.deepEqual(
    Array.from({ length: 8 }, () => first()),
    Array.from({ length: 8 }, () => second())
  )
  assert.notEqual(createSeededRandom(0)(), createSeededRandom(1)())
})

test('run actions accept only canonical gameplay commands and enforce a cap', () => {
  const actions = normalizeRunActions(['left', 'rotate', 'hold', 'down', 'right'])

  assert.deepEqual(actions, ['left', 'rotate', 'hold', 'down', 'right'])
  assert.equal(normalizeRunActions(null), null)
  assert.equal(normalizeRunActions(['left', 'pause', 'right']), null)
  assert.equal(normalizeRunActions(Array(MAX_RUN_ACTIONS + 1).fill('down')), null)
})

test('server replay computes the score instead of trusting a client score', () => {
  const result = replayRun({
    seed: 123456,
    stageId: 'fresh',
    startLevel: 1,
    actions: ['down']
  })

  assert.equal(result.score, 0)
  assert.equal(result.lines, 0)
  assert.equal(result.level, 1)
  assert.equal(result.gameOver, false)
})

test('server replay rejects malformed or oversized runs', () => {
  assert.throws(() => replayRun({
    seed: 1,
    stageId: 'fresh',
    startLevel: 1,
    actions: ['forged-score']
  }), /invalid_run_actions/)

  assert.throws(() => replayRun({
    seed: 1,
    stageId: 'fresh',
    startLevel: 1,
    actions: Array(MAX_RUN_ACTIONS + 1).fill('down')
  }), /invalid_run_actions/)

  assert.throws(() => replayRun({ seed: -1, stageId: 'fresh', startLevel: 1, actions: [] }), /invalid_run_seed/)
  assert.throws(() => replayRun({ seed: 1.5, stageId: 'fresh', startLevel: 1, actions: [] }), /invalid_run_seed/)
  assert.throws(() => replayRun({ seed: 1, stageId: 'fresh', startLevel: 0, actions: [] }), /invalid_run_level/)
  assert.throws(() => replayRun({ seed: 1, stageId: 'fresh', startLevel: 11, actions: [] }), /invalid_run_level/)
  assert.throws(() => replayRun({ seed: 1, stageId: 'missing', startLevel: 1, actions: [] }), /invalid_run_stage/)

  const finished = replayRun({
    seed: 1,
    stageId: 'fresh',
    startLevel: 1,
    actions: Array.from({ length: 1000 }, (_, index) => index % 5 === 0 ? 'rotate' : index % 5 === 1 ? 'hold' : 'down')
  })
  assert.equal(finished.actionCount, 1000)
})
