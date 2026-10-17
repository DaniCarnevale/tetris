import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createGuestProfile,
  loadGuestProfile,
  saveGuestProfile
} from '../src/js/leaderboard/playerProfile.js'

function createStorage () {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  }
}

test('creates a stable guest profile with a normalized nickname', () => {
  assert.deepEqual(createGuestProfile({ nickname: '  dAnI  ', id: 'guest-1' }), {
    id: 'guest-1',
    nickname: 'DAnI'
  })
})

test('saves and loads the guest profile from storage', () => {
  const storage = createStorage()
  const profile = saveGuestProfile('lucas', storage, 'guest-2')

  assert.deepEqual(loadGuestProfile(storage), profile)
})

test('repairs malformed profile data without throwing', () => {
  const storage = createStorage()
  storage.setItem('tetris.player.profile', '{"id":"","nickname":""}')

  assert.deepEqual(loadGuestProfile(storage, () => 'guest-2'), {
    id: 'guest-2',
    nickname: 'Jugador'
  })
})
