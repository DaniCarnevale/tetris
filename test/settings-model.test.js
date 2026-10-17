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
})

test('normalizes persisted settings without accepting unsafe values', () => {
  const settings = createUserSettings({
    controls: { pause: 'Space' },
    soundEnabled: false,
    musicEnabled: false,
    musicVolume: 2
  })

  assert.equal(settings.controls.pause, 'Space')
  assert.equal(settings.soundEnabled, false)
  assert.equal(settings.musicEnabled, false)
  assert.equal(settings.musicVolume, 1)
})

test('round trips settings and falls back from malformed storage', () => {
  const settings = createUserSettings({ musicVolume: 0.25 })
  assert.deepEqual(readStoredSettings(serializeUserSettings(settings)), settings)
  assert.deepEqual(readStoredSettings('{broken'), DEFAULT_USER_SETTINGS)
})
