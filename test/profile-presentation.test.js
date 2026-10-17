import test from 'node:test'
import assert from 'node:assert/strict'

import {
  PROFILE_SETUP_PENDING_STORAGE_KEY,
  consumeProfileSetupPending,
  createProfileCardModel,
  hasProfileChanges,
  markProfileSetupPending
} from '../src/js/leaderboard/profilePresentation.js'

function createStorage () {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  }
}

test('remembers and consumes the post-Google profile setup prompt once', () => {
  const storage = createStorage()

  assert.equal(consumeProfileSetupPending(storage), false)

  markProfileSetupPending(storage)

  assert.equal(storage.getItem(PROFILE_SETUP_PENDING_STORAGE_KEY), 'true')
  assert.equal(consumeProfileSetupPending(storage), true)
  assert.equal(consumeProfileSetupPending(storage), false)
})

test('creates an in-game identity model with avatar and account label', () => {
  assert.deepEqual(createProfileCardModel({ nickname: '  Dani  ', avatarPath: 'dani/avatar.webp' }, 'Google conectado'), {
    nickname: 'Dani',
    initials: 'DA',
    avatarPath: 'dani/avatar.webp',
    accountLabel: 'Google conectado'
  })
})

test('falls back to a guest identity when profile data is incomplete', () => {
  assert.deepEqual(createProfileCardModel({ nickname: '   ', avatarPath: '' }), {
    nickname: 'Guest',
    initials: 'GU',
    avatarPath: null,
    accountLabel: 'Invitado'
  })
})

test('detects an edited nickname or avatar against the saved profile', () => {
  const savedProfile = { nickname: 'Dani', avatarPath: 'user/avatar.webp' }

  assert.equal(hasProfileChanges({ nickname: ' Dani ', avatarPath: 'user/avatar.webp' }, savedProfile), false)
  assert.equal(hasProfileChanges({ nickname: 'Daniel', avatarPath: 'user/avatar.webp' }, savedProfile), true)
  assert.equal(hasProfileChanges({ nickname: 'Dani', avatarPath: null }, savedProfile), true)
})
