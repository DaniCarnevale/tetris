import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  getGameLayoutMode,
  getGameViewportState,
  getPieceStatsLayout
} from '../src/js/game/layout.js'

const mainSource = await readFile(new URL('../src/js/main.js', import.meta.url), 'utf8')
const indexSource = await readFile(new URL('../src/index.html', import.meta.url), 'utf8')
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
    orientation: 'cartesian',
    showLongLabels: false
  })
  assert.deepEqual(getPieceStatsLayout({ width: 390 }), {
    orientation: 'cartesian',
    showLongLabels: false
  })
})

test('piece stats use a positive-axis chart with vertical meters', () => {
  assert.match(mainSource, /fill\.style\.height = `\$\{row\.height\}%`/)
  assert.doesNotMatch(mainSource, /fill\.style\.width = `\$\{row\.width\}%`/)
  assert.match(stylesheet, /body\.is-game-active \.piece-stat-track \{[\s\S]*height: 54px;[\s\S]*align-items: flex-end;/)
  assert.match(stylesheet, /body\.is-game-active \.piece-stat-fill \{[\s\S]*transition: height 260ms ease;/)
})

test('piece stats render each tetromino as a unified silhouette below its fill', () => {
  assert.match(mainSource, /piece-stat-thumbnail/)
  assert.match(mainSource, /createElementNS/)
  assert.match(mainSource, /piece-stat-glyph/)
  assert.match(mainSource, /item\.append\(meter, axis, thumbnail\)/)
  assert.doesNotMatch(mainSource, /label\.textContent = row\.shortLabel/)
  assert.match(stylesheet, /body\.is-game-active \.game-side-rail \.piece-stat-row \{[\s\S]*display: grid;/)
})

test('piece stat spacing keeps the number above the axis', () => {
  assert.match(stylesheet, /body\.is-game-active \.piece-stat-meter \{[\s\S]*position: relative;[\s\S]*height: 54px;/)
  assert.match(stylesheet, /body\.is-game-active \.piece-stat-track \{[\s\S]*margin: 0;/)
  assert.match(stylesheet, /body\.is-game-active \.piece-stat-count \{[\s\S]*text-align: center;/)
})

test('piece stat cards use one compact positive-axis row', () => {
  assert.match(stylesheet, /body\.is-game-active \.game-side-rail \.piece-stats-list \{[\s\S]*grid-template-columns: repeat\(7, minmax\(0, 1fr\)\);/)
  assert.match(stylesheet, /body\.is-game-active \.game-side-rail \.piece-stat-row \{[\s\S]*grid-template-rows: 54px 1px 28px;/)
})

test('previews flank the board instead of pushing it down', () => {
  assert.match(stylesheet, /body\.is-game-active \.board-cockpit \{[\s\S]*display: grid;[\s\S]*width: min\(100%, 660px\);/)
  assert.match(stylesheet, /body\.is-game-active \.board-focus-row \{[\s\S]*display: contents;/)
  assert.match(stylesheet, /body\.is-game-active \.cockpit-preview \{[\s\S]*align-self: end;/)
  assert.match(stylesheet, /body\.is-game-active \.cockpit-preview \.preview-stage \{[\s\S]*flex: 0 0 84px;/)
})

test('hold and next previews align near the lower sides of the playfield', () => {
  assert.match(stylesheet, /body\.is-game-active \.cockpit-preview \{[\s\S]*align-self: end;/)
  assert.match(stylesheet, /body\.is-game-active \.hold-preview \{[\s\S]*grid-column: 1;[\s\S]*margin-bottom: 32px;/)
  assert.match(stylesheet, /body\.is-game-active \.next-card \{[\s\S]*grid-column: 3;[\s\S]*margin-bottom: 32px;/)
  assert.match(stylesheet, /body\.is-game-active \.board-card \{[\s\S]*grid-column: 2;/)
})

test('pause backdrop and board use the same squared playfield frame', () => {
  assert.match(stylesheet, /body\.is-game-active \.pause-overlay \{[\s\S]*inset: 0 auto 0 50%;[\s\S]*aspect-ratio: 14 \/ 30;[\s\S]*border: 0;[\s\S]*border-radius: 0;/)
  assert.match(stylesheet, /body\.is-game-active #board \{[\s\S]*border-radius: 0;/)
})

test('desktop board respects the viewport height to avoid page scrolling', () => {
  assert.match(stylesheet, /body\.is-game-active #board \{[\s\S]*height: min\(650px, calc\(100dvh - 240px\)\);/)
})

test('scoreboard gives the score breathing room and promotes the current level', () => {
  assert.match(indexSource, /class="score-stat score-level"/)
  assert.match(stylesheet, /body\.is-game-active \.score-primary \{[\s\S]*padding-left: clamp\(14px, 3vw, 36px\);/)
  assert.match(stylesheet, /body\.is-game-active \.score-level strong \{[\s\S]*font-size: clamp\(1\.24rem, 2\.5vw, 1\.34rem\);/)
})

test('active games lock the document viewport while preserving panel scrolling', () => {
  assert.match(stylesheet, /body\.is-game-active \{[\s\S]*height: 100dvh;[\s\S]*overflow: hidden;/)
})
