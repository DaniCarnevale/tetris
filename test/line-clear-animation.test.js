import test from 'node:test'
import assert from 'node:assert/strict'

import {
  LINE_CLEAR_ANIMATION_MS,
  createLineClearAnimation,
  getLineClearProgress,
  isLineClearAnimationActive
} from '../src/js/game/lineClearAnimation.js'

const clearedRows = [{ y: 28, cells: ['#fff', '#abc'] }]

test('line clear animation keeps a safe snapshot of removed rows', () => {
  const animation = createLineClearAnimation(clearedRows, 100)

  assert.equal(animation.startedAt, 100)
  assert.equal(animation.duration, LINE_CLEAR_ANIMATION_MS)
  assert.deepEqual(animation.rows, clearedRows)

  clearedRows[0].cells[0] = '#changed'
  assert.equal(animation.rows[0].cells[0], '#fff')
})

test('line clear animation progress is clamped and expires at its duration', () => {
  const animation = createLineClearAnimation(clearedRows, 100)

  assert.equal(getLineClearProgress(animation, 50), 0)
  assert.equal(getLineClearProgress(animation, 100 + LINE_CLEAR_ANIMATION_MS / 2), 0.5)
  assert.equal(getLineClearProgress(animation, 100 + LINE_CLEAR_ANIMATION_MS + 50), 1)
  assert.equal(isLineClearAnimationActive(animation, 100 + LINE_CLEAR_ANIMATION_MS - 1), true)
  assert.equal(isLineClearAnimationActive(animation, 100 + LINE_CLEAR_ANIMATION_MS), false)
})
