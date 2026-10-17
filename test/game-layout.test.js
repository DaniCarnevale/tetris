import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  getGameLayoutMode,
  getGameViewportState,
  getPieceStatsLayout
} from '../src/js/game/layout.js'

const mainSource = await readFile(new URL('../src/js/main.js', import.meta.url), 'utf8')
const stylesheet = await readFile(new URL('../src/styles/style.css', import.meta.url), 'utf8')

test('game layout uses the mobile cockpit at narrow widths', () => {
  assert.equal(getGameLayoutMode({ width: 560, height: 800 }), 'mobile')
  assert.equal(getGameLayoutMode({ width: 390, height: 844 }), 'mobile')
})

test('game layout uses the compact cockpit when height is limited', () => {
  assert.equal(getGameLayoutMode({ width: 1280, height: 760 }), 'compact')
  assert.equal(getGameLayoutMode({ width: 820, height: 900 }), 'compact')
})

test('game layout keeps the desktop cockpit when there is room', () => {
  assert.equal(getGameLayoutMode({ width: 1440, height: 900 }), 'desktop')
})

test('the game locks document scrolling only while a game is active', () => {
  assert.deepEqual(getGameViewportState(false), {
    isGameActive: false,
    shouldLockScroll: false
  })
  assert.deepEqual(getGameViewportState(true), {
    isGameActive: true,
    shouldLockScroll: true
  })
})

test('piece stats use a compact visual model in the game cockpit', () => {
  assert.deepEqual(getPieceStatsLayout({ width: 1440 }), {
    orientation: 'horizontal',
    showLongLabels: false
  })
  assert.deepEqual(getPieceStatsLayout({ width: 390 }), {
    orientation: 'horizontal',
    showLongLabels: false
  })
})

test('piece stats use horizontal fills in the active cockpit', () => {
  assert.match(mainSource, /fill\.style\.width = `\$\{row\.width\}%`/)
  assert.doesNotMatch(mainSource, /fill\.style\.height = `\$\{row\.width\}%`/)
  assert.match(stylesheet, /body\.is-game-active \.piece-stat-track \{[\s\S]*height: 6px;/)
})

test('piece stats render each tetromino as a miniature shape', () => {
  assert.match(mainSource, /piece-stat-thumbnail/)
  assert.match(mainSource, /row\.shape\.forEach/)
  assert.match(stylesheet, /\.piece-stat-thumbnail \{[\s\S]*grid-template-columns/)
})
