import test from 'node:test'
import assert from 'node:assert/strict'

import { shouldAutoPause } from '../src/js/game/focusPause.js'

test('auto pauses only an active game when the browser loses focus', () => {
  assert.equal(shouldAutoPause({ gameStarted: true, gameOver: false, paused: false }), true)
  assert.equal(shouldAutoPause({ gameStarted: false, gameOver: false, paused: false }), false)
  assert.equal(shouldAutoPause({ gameStarted: true, gameOver: true, paused: false }), false)
  assert.equal(shouldAutoPause({ gameStarted: true, gameOver: false, paused: true }), false)
})
