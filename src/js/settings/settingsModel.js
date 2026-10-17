import { createControls } from '../input/controls.js'

export const USER_SETTINGS_STORAGE_KEY = 'tetris.user.settings'

export const DEFAULT_USER_SETTINGS = Object.freeze({
  controls: Object.freeze(createControls()),
  soundEnabled: true,
  musicEnabled: true,
  musicVolume: 0.5
})

export function createUserSettings (settings = {}) {
  return {
    controls: createControls(settings.controls),
    soundEnabled: settings.soundEnabled !== false,
    musicEnabled: settings.musicEnabled !== false,
    musicVolume: normalizeMusicVolume(settings.musicVolume)
  }
}

export function readStoredSettings (storedValue) {
  if (typeof storedValue !== 'string') return createUserSettings()

  try {
    const parsed = JSON.parse(storedValue)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return createUserSettings()
    return createUserSettings(parsed)
  } catch {
    return createUserSettings()
  }
}

export function serializeUserSettings (settings) {
  return JSON.stringify(createUserSettings(settings))
}

function normalizeMusicVolume (value) {
  const volume = Number(value)
  if (!Number.isFinite(volume)) return DEFAULT_USER_SETTINGS.musicVolume
  return Math.min(Math.max(volume, 0), 1)
}
