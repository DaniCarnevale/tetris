import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const html = await readFile(new URL('../src/index.html', import.meta.url), 'utf8')
const source = await readFile(new URL('../src/js/main.js', import.meta.url), 'utf8')

test('game cockpit removes repeated copy and broken restart controls', () => {
  assert.doesNotMatch(html, /Ordená el caos, una línea a la vez\./)
  assert.doesNotMatch(html, /PARTIDA ACTUAL/)
  assert.doesNotMatch(html, /La pieza translúcida muestra dónde caerá\./)
  assert.doesNotMatch(html, /id="pauseButton"/)
  assert.doesNotMatch(html, /id="restartButton"/)
  assert.doesNotMatch(html, /id="controlHint"/)
  assert.doesNotMatch(html, /Espacio rotar · ↓ bajar · P pausar/)
})

test('game cockpit keeps the focus path around the board', () => {
  assert.match(html, /class="game-main-column"/)
  assert.match(html, /class="board-cockpit"/)
  assert.match(html, /class="game-side-rail"/)
  assert.match(html, /id="gameProfileMenu"/)
  assert.match(html, /id="recordScore"/)
})

test('piece stats use a compact vertical meter above each tetromino thumbnail', () => {
  assert.match(source, /fill\.style\.height = `\$\{row\.height\}%`/)
  assert.match(source, /item\.append\(meter, axis, thumbnail\)/)
  assert.doesNotMatch(source, /fill\.style\.width = `\$\{row\.width\}%`/)
  assert.doesNotMatch(source, /item\.append\(thumbnail, track, count\)/)
})

test('stage record is loaded independently from the start-game request', () => {
  assert.match(source, /function refreshStageRecord \(stageId = selectedStage\)/)
  assert.match(source, /recordScoreElement\.textContent/)
  assert.match(source, /getLeaderboard\(\{ stageId, limit: 1 \}\)/)
})
