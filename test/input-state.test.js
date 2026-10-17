import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createInputBuffer,
  drainInputActions,
  enqueueInputAction,
  getHeldInputAction,
  releaseInputAction
} from '../src/js/input/inputState.js'

test('keeps movement and rotation queued in the same frame', () => {
  const input = createInputBuffer()

  enqueueInputAction(input, 'moveRight')
  enqueueInputAction(input, 'rotate')

  assert.deepEqual(drainInputActions(input), ['moveRight', 'rotate'])
  assert.deepEqual(drainInputActions(input), [])
})

test('tracks held actions and ignores duplicate initial keydowns', () => {
  const input = createInputBuffer()

  enqueueInputAction(input, 'moveLeft')
  enqueueInputAction(input, 'moveLeft')
  enqueueInputAction(input, 'moveLeft', { repeat: true })
  releaseInputAction(input, 'moveLeft')

  assert.deepEqual(drainInputActions(input), ['moveLeft', 'moveLeft'])
  assert.equal(input.held.has('moveLeft'), false)
})

test('ignores invalid input actions', () => {
  const input = createInputBuffer()

  enqueueInputAction(null, 'moveLeft')
  enqueueInputAction(input, null)
  enqueueInputAction(input, '')
  releaseInputAction(null, 'moveLeft')
  releaseInputAction(input, null)

  assert.deepEqual(drainInputActions(input), [])
  assert.deepEqual(drainInputActions(null), [])
})

test('keeps the most recently pressed horizontal direction active', () => {
  const input = createInputBuffer()

  enqueueInputAction(input, 'left')
  enqueueInputAction(input, 'right')

  assert.equal(getHeldInputAction(input, ['left', 'right']), 'right')
  releaseInputAction(input, 'right')
  assert.equal(getHeldInputAction(input, ['left', 'right']), 'left')
})

test('returns no held action for an empty or invalid buffer', () => {
  assert.equal(getHeldInputAction(null, ['left']), null)
  assert.equal(getHeldInputAction(createInputBuffer(), []), null)
  assert.equal(getHeldInputAction(createInputBuffer(), null), null)

  const input = createInputBuffer()
  enqueueInputAction(input, 'left')
  assert.equal(getHeldInputAction(input, ['right']), null)
})
