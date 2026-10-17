import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { getLevelLedFeedback } from '../src/js/game/levelLed.js'

const mainSource = await readFile(new URL('../src/js/main.js', import.meta.url), 'utf8')
const stylesheet = await readFile(new URL('../src/styles/style.css', import.meta.url), 'utf8')

test('level LED feedback accelerates from level one through eight', () => {
  const feedback = Array.from({ length: 8 }, (_, index) => getLevelLedFeedback(index + 1))

  assert.ok(feedback.every((state) => state.tone === 'accent'))
  assert.ok(feedback.every((state) => state.mode === 'pulse' && state.persistent === false))
  assert.deepEqual(feedback.map((state) => state.pulseDurationMs), [1800, 1620, 1440, 1260, 1080, 900, 720, 640])
})

test('level nine keeps a fast red LED blinking', () => {
  assert.deepEqual(getLevelLedFeedback(9), {
    tone: 'danger',
    mode: 'pulse',
    persistent: true,
    pulseDurationMs: 420,
    activeDurationMs: null
  })
})

test('level ten keeps a steady red LED on', () => {
  assert.deepEqual(getLevelLedFeedback(10), {
    tone: 'danger',
    mode: 'steady',
    persistent: true,
    pulseDurationMs: null,
    activeDurationMs: null
  })
})

test('level LED feedback is shared by the board and score marker', () => {
  assert.match(mainSource, /levelLedTargets = \[boardCanvas, statsCard\]/)
  assert.match(mainSource, /is-level-led/)
  assert.match(stylesheet, /#board\.is-level-led-pulse[\s\S]*animation: level-led-pulse/)
  assert.match(stylesheet, /\.stats-card\.is-level-led-pulse[\s\S]*animation: level-led-pulse/)
  assert.match(stylesheet, /@media \(prefers-reduced-motion: reduce\)[\s\S]*is-level-led-pulse/)
})

test('level ten uses a stronger steady red glow than the transient LED states', () => {
  assert.match(stylesheet, /#board\.is-level-led-steady[\s\S]*0 0 56px rgba\(var\(--level-led-color\), 0\.62\)/)
  assert.match(stylesheet, /\.stats-card\.is-level-led-steady[\s\S]*0 0 56px rgba\(var\(--level-led-color\), 0\.62\)/)
})

test('level LED normalization clamps invalid, fractional and out-of-range levels', () => {
  assert.equal(getLevelLedFeedback('invalid').pulseDurationMs, 1800)
  assert.equal(getLevelLedFeedback(0).pulseDurationMs, 1800)
  assert.equal(getLevelLedFeedback(11).mode, 'steady')
  assert.equal(getLevelLedFeedback(2.9).pulseDurationMs, 1620)
})
