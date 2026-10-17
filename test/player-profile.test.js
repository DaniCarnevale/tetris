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
    nickname: 'DAnI',
    avatarPath: null
  })
})

test('saves and loads the guest profile from storage', () => {
  const storage = createStorage()
  const profile = saveGuestProfile('lucas', storage, 'guest-2', 'guest-2/avatar.webp')

  assert.deepEqual(loadGuestProfile(storage), profile)
})

test('repairs malformed profile data without throwing', () => {
  const storage = createStorage()
  storage.setItem('tetris.player.profile', '{"id":"","nickname":""}')

  assert.deepEqual(loadGuestProfile(storage, () => 'guest-2'), {
    id: 'guest-2',
    nickname: 'Jugador',
    avatarPath: null
  })
})

test('survives storage read and write failures', () => {
  const failingStorage = {
    getItem: () => { throw new Error('read failed') },
    setItem: () => { throw new Error('write failed') }
  }

  const loaded = loadGuestProfile(failingStorage, () => 'guest-fallback')
  const saved = saveGuestProfile('dani', failingStorage, 'guest-fallback')

  assert.equal(loaded.id, 'guest-fallback')
  assert.equal(saved.nickname, 'Dani')
  assert.equal(saveGuestProfile('guest', null, 'guest-null').id, 'guest-null')
})

test('uses browser storage defaults when available', () => {
  const previousStorage = globalThis.localStorage
  const storage = createStorage()
  globalThis.localStorage = storage

  try {
    const profile = saveGuestProfile('marta')
    assert.equal(loadGuestProfile().nickname, profile.nickname)
    assert.match(profile.id, /^guest-/)
  } finally {
    if (previousStorage === undefined) delete globalThis.localStorage
    else globalThis.localStorage = previousStorage
  }
})

test('restores an existing browser storage object after the test', () => {
  const previousStorage = createStorage()
  globalThis.localStorage = previousStorage
  const profile = loadGuestProfile()

  assert.match(profile.id, /^guest-/)
  delete globalThis.localStorage
})
