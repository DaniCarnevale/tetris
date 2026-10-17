import test from 'node:test'
import assert from 'node:assert/strict'

import {
  DEFAULT_USER_SETTINGS,
  createUserSettings,
  readStoredSettings,
  serializeUserSettings
} from '../src/js/settings/settingsModel.js'

test('creates safe defaults for gameplay settings', () => {
  assert.deepEqual(createUserSettings(), DEFAULT_USER_SETTINGS)
  assert.equal(DEFAULT_USER_SETTINGS.musicEnabled, true)
  assert.equal(DEFAULT_USER_SETTINGS.musicVolume, 0.5)
  assert.equal(DEFAULT_USER_SETTINGS.softDropMultiplier, 1)
})

test('normalizes persisted settings without accepting unsafe values', () => {
  const settings = createUserSettings({
    controls: { pause: 'Space' },
    soundEnabled: false,
    musicEnabled: false,
    musicVolume: 2,
    softDropMultiplier: 8
  })

  assert.equal(settings.controls.pause, 'Space')
  assert.equal(settings.soundEnabled, false)
  assert.equal(settings.musicEnabled, false)
  assert.equal(settings.musicVolume, 1)
  assert.equal(settings.softDropMultiplier, 8)
})

test('round trips settings and falls back from malformed storage', () => {
  const settings = createUserSettings({ musicVolume: 0.25 })
  assert.deepEqual(readStoredSettings(serializeUserSettings(settings)), settings)
  assert.deepEqual(readStoredSettings('{broken'), DEFAULT_USER_SETTINGS)
})

test('normalizes empty, non-string and out-of-range persisted settings', () => {
  assert.deepEqual(readStoredSettings(), DEFAULT_USER_SETTINGS)
  assert.deepEqual(readStoredSettings('null'), DEFAULT_USER_SETTINGS)
  assert.deepEqual(readStoredSettings('[]'), DEFAULT_USER_SETTINGS)
  assert.equal(createUserSettings({ musicVolume: -1 }).musicVolume, 0)
  assert.equal(createUserSettings({ musicVolume: 'not-a-number' }).musicVolume, 0.5)
  assert.equal(createUserSettings({ softDropMultiplier: 3 }).softDropMultiplier, 1)
  assert.equal(createUserSettings({ softDropMultiplier: '8' }).softDropMultiplier, 8)
})
