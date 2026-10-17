import test from 'node:test'
import assert from 'node:assert/strict'

import {
  CONTROL_ACTIONS,
  DEFAULT_CONTROLS,
  createControls,
  findActionByCode,
  getKeyLabel,
  readStoredControls,
  updateControl
} from '../src/js/input/controls.js'

test('default controls expose every configurable gameplay action', () => {
  const controls = createControls()

  assert.deepEqual(Object.keys(controls), CONTROL_ACTIONS)
  assert.deepEqual(controls, DEFAULT_CONTROLS)
  assert.equal(controls.pause, 'KeyP')
})

test('stored controls ignore invalid values and keep safe defaults', () => {
  const controls = readStoredControls(JSON.stringify({
    rotate: 'KeyR',
    hold: 42,
    unknown: 'KeyX'
  }))

  assert.equal(controls.rotate, 'KeyR')
  assert.equal(controls.hold, DEFAULT_CONTROLS.hold)
  assert.equal(controls.moveLeft, DEFAULT_CONTROLS.moveLeft)
  assert.equal('unknown' in controls, false)
})

test('invalid storage payload falls back to defaults', () => {
  assert.deepEqual(readStoredControls('not-json'), DEFAULT_CONTROLS)
  assert.deepEqual(readStoredControls('null'), DEFAULT_CONTROLS)
  assert.deepEqual(readStoredControls(), DEFAULT_CONTROLS)
})

test('updating a known action returns a new controls object', () => {
  const controls = createControls()
  const updated = updateControl(controls, 'rotate', 'KeyR')

  assert.equal(updated.rotate, 'KeyR')
  assert.equal(controls.rotate, DEFAULT_CONTROLS.rotate)
})

test('key lookup identifies the action assigned to a key', () => {
  const controls = createControls({ hold: 'KeyH' })

  assert.equal(findActionByCode(controls, 'KeyH'), 'hold')
  assert.equal(findActionByCode(controls, 'KeyZ'), null)
})

test('key labels turn browser codes into friendly UI text', () => {
  assert.equal(getKeyLabel('ArrowDown'), '↓')
  assert.equal(getKeyLabel('Space'), 'Espacio')
  assert.equal(getKeyLabel('KeyS'), 'S')
  assert.equal(getKeyLabel('Digit7'), '7')
  assert.equal(getKeyLabel('F1'), 'F1')
})

test('invalid control updates restore a normalized controls object', () => {
  const controls = createControls({ rotate: 'KeyR' })

  assert.deepEqual(updateControl(controls, 'unknown', 'KeyX'), controls)
  assert.deepEqual(updateControl(controls, 'rotate', ''), controls)
  assert.deepEqual(updateControl(controls, 'rotate', 42), controls)
  assert.equal(createControls({ hold: '' }).hold, DEFAULT_CONTROLS.hold)
})
