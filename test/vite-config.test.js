import test from 'node:test'
import assert from 'node:assert/strict'
import config from '../vite.config.js'

test('Vite loads environment files from the repository root', () => {
  assert.equal(config.envDir, '..')
})
