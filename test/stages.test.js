import test from 'node:test'
import assert from 'node:assert/strict'

import { BOARD_HEIGHT, BOARD_WIDTH } from '../src/js/config/config.js'
import { createStageBoard, getBackdropForLevel } from '../src/js/game/stages.js'
import { getLineClearSequence } from '../src/js/audio/soundManager.js'

test('stage presets preserve board dimensions and provide a playable base', () => {
  const board = createStageBoard('foundation')

  assert.equal(board.length, BOARD_HEIGHT)
  assert.equal(board[0].length, BOARD_WIDTH)
  assert.ok(board[BOARD_HEIGHT - 1].some((cell) => cell !== null))
  assert.ok(board[BOARD_HEIGHT - 1].some((cell) => cell === null))
})

test('backgrounds progress with difficulty without removing the level system', () => {
  assert.equal(getBackdropForLevel(1).id, 'buenos-aires')
  assert.equal(getBackdropForLevel(3).id, 'humahuaca')
  assert.equal(getBackdropForLevel(6).id, 'iguazu')
  assert.equal(getBackdropForLevel(9).id, 'patagonia')
})

test('each level has its own background scene', () => {
  const ids = Array.from({ length: 10 }, (_, index) => getBackdropForLevel(index + 1).id)

  assert.deepEqual(ids, [
    'buenos-aires',
    'rosario',
    'humahuaca',
    'salta',
    'cordoba',
    'iguazu',
    'mendoza',
    'mar-del-plata',
    'patagonia',
    'perito-moreno'
  ])
  assert.equal(new Set(ids).size, 10)
})

test('line clear sound sequences become richer from one to four lines', () => {
  assert.equal(getLineClearSequence(1).length, 1)
  assert.equal(getLineClearSequence(2).length, 2)
  assert.equal(getLineClearSequence(3).length, 3)
  assert.equal(getLineClearSequence(4).length, 5)
})
