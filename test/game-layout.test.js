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
    orientation: 'sidebar',
    showLongLabels: false
  })
  assert.deepEqual(getPieceStatsLayout({ width: 390 }), {
    orientation: 'sidebar',
    showLongLabels: false
  })
})

test('piece stats use horizontal meters above each silhouette', () => {
  assert.match(mainSource, /fill\.style\.width = `\$\{row\.width\}%`/)
  assert.doesNotMatch(mainSource, /fill\.style\.height = `\$\{row\.width\}%`/)
  assert.match(stylesheet, /body\.is-game-active \.piece-stat-track \{[\s\S]*width: auto;[\s\S]*height: 4px;/)
  assert.match(stylesheet, /body\.is-game-active \.piece-stat-fill \{[\s\S]*transition: width 260ms ease;/)
})

test('piece stats render each tetromino as a unified silhouette below its fill', () => {
  assert.match(mainSource, /piece-stat-thumbnail/)
  assert.match(mainSource, /createElementNS/)
  assert.match(mainSource, /piece-stat-glyph/)
  assert.match(mainSource, /item\.append\(meter, thumbnail\)/)
  assert.doesNotMatch(mainSource, /label\.textContent = row\.shortLabel/)
  assert.match(stylesheet, /body\.is-game-active \.game-side-rail \.piece-stat-row \{[\s\S]*display: grid;/)
})

test('piece stat spacing keeps the meter and number compact', () => {
  assert.match(stylesheet, /body\.is-game-active \.piece-stat-meter \{[\s\S]*display: flex;[\s\S]*gap: 6px;/)
  assert.match(stylesheet, /body\.is-game-active \.piece-stat-track \{[\s\S]*margin: 0;/)
  assert.match(stylesheet, /body\.is-game-active \.piece-stat-count \{[\s\S]*margin: 0;[\s\S]*text-align: left;/)
})

test('piece stat cards use a readable two-column side rail', () => {
  assert.match(stylesheet, /body\.is-game-active \.game-side-rail \.piece-stats-list \{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/)
  assert.match(stylesheet, /body\.is-game-active \.game-side-rail \.piece-stat-row \{[\s\S]*grid-template-rows: auto 23px;/)
})
