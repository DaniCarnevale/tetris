import test from 'node:test'
import assert from 'node:assert/strict'

import {
  GAME_OVER_ANIMATION_MS,
  canReturnToStartScreen,
  getGameOverSummary
} from '../src/js/game/gameFlow.js'

test('game over cannot return home before its animation finishes', () => {
  assert.equal(canReturnToStartScreen({ gameOver: true, animationFinished: false, keyCode: 'Space' }), false)
})

test('any pressed key returns home after the game over animation', () => {
  assert.equal(canReturnToStartScreen({ gameOver: true, animationFinished: true, keyCode: 'KeyA' }), true)
})

test('game over return ignores keys when the game is still active', () => {
  assert.equal(canReturnToStartScreen({ gameOver: false, animationFinished: true, keyCode: 'Enter' }), false)
})

test('game over summary exposes the final score and level', () => {
  assert.equal(getGameOverSummary({ score: 1250, level: 4 }), 'Puntuación 1250 · Nivel 4')
})

test('game over animation has a deliberate duration', () => {
  assert.equal(GAME_OVER_ANIMATION_MS, 1200)
})
