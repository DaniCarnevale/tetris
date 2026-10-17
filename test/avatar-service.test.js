import test from 'node:test'
import assert from 'node:assert/strict'

import {
  AVATAR_MAX_BYTES,
  AVATAR_UPLOAD_COOLDOWN_MS,
  buildAvatarPath,
  createAvatarService,
  validateAvatarFile
} from '../src/js/leaderboard/avatarService.js'

function createStorage () {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  }
}

function createSupabaseClient (calls, user = { id: 'user-1' }, uploadError = null) {
  const bucket = {
    upload: async (path, file, options) => {
      calls.upload = { path, file, options }
      return { error: uploadError }
    },
    remove: async (paths) => {
      calls.remove = paths
      return { error: null }
    },
    getPublicUrl: (path) => ({ data: { publicUrl: `https://cdn.example/${path}` } })
  }

  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      signInAnonymously: async () => ({ data: { user }, error: null })
    },
    storage: {
      from: () => bucket
    }
  }
}

test('accepts supported image files within the configured size limit', () => {
  assert.deepEqual(validateAvatarFile({ type: 'image/webp', size: AVATAR_MAX_BYTES }), {
    valid: true,
    message: null
  })
  assert.equal(AVATAR_MAX_BYTES, 2.5 * 1024 * 1024)
})

test('rejects unsupported, empty and oversized files', () => {
  assert.equal(validateAvatarFile({ type: 'image/gif', size: 20 }).valid, false)
  assert.equal(validateAvatarFile({ type: 'image/png', size: 0 }).valid, false)
  assert.equal(validateAvatarFile({ type: 'image/png', size: AVATAR_MAX_BYTES + 1 }).valid, false)
})

test('builds one safe avatar path per authenticated player', () => {
  assert.equal(buildAvatarPath('user-1'), 'user-1/avatar.webp')
  assert.equal(buildAvatarPath(''), null)
})

test('uploads the avatar, replaces the previous path and stores the cooldown', async () => {
  const storage = createStorage()
  storage.setItem('tetris.player.profile', JSON.stringify({
    id: 'guest-1',
    nickname: 'Ana',
    avatarPath: 'old/avatar.png'
  }))
  const calls = {}
  const service = createAvatarService({
    storage,
    profileStorage: storage,
    supabaseClient: createSupabaseClient(calls),
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'public-key',
    now: () => 1000
  })

  const result = await service.uploadAvatar({ type: 'image/png', size: 100 })

  assert.equal(result.source, 'online')
  assert.equal(result.avatarPath, 'user-1/avatar.webp')
  assert.equal(result.url, 'https://cdn.example/user-1/avatar.webp')
  assert.deepEqual(calls.remove, ['old/avatar.png'])
  assert.equal(calls.upload.path, 'user-1/avatar.webp')
  assert.equal(calls.upload.options.upsert, true)
  assert.equal(storage.getItem('tetris.avatar.last-upload'), '1000')
})

test('blocks a repeated upload during the cooldown before calling Storage', async () => {
  const storage = createStorage()
  storage.setItem('tetris.avatar.last-upload', '1000')
  const calls = {}
  const service = createAvatarService({
    storage,
    profileStorage: storage,
    supabaseClient: createSupabaseClient(calls),
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'public-key',
    now: () => 1000 + AVATAR_UPLOAD_COOLDOWN_MS - 1
  })

  const result = await service.uploadAvatar({ type: 'image/png', size: 100 })

  assert.equal(result.source, 'blocked')
  assert.equal(calls.upload, undefined)
})

test('blocks avatar uploads for anonymous guests', async () => {
  const storage = createStorage()
  const calls = {}
  const service = createAvatarService({
    storage,
    profileStorage: storage,
    supabaseClient: createSupabaseClient(calls, { id: 'anonymous-1', is_anonymous: true }),
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'public-key'
  })

  const result = await service.uploadAvatar({ type: 'image/png', size: 100 })

  assert.equal(result.source, 'blocked')
  assert.equal(result.error, 'Vinculá Google para usar un avatar.')
  assert.equal(calls.upload, undefined)
})

test('translates storage policy and cooldown errors into useful avatar feedback', async () => {
  const policyClient = createSupabaseClient(
    {},
    { id: 'user-1', is_anonymous: false },
    new Error('new row violates row-level security policy for table "objects"')
  )
  const policyService = createAvatarService({
    storage: createStorage(),
    profileStorage: createStorage(),
    supabaseClient: policyClient,
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'public-key',
    now: () => 1000
  })

  const policyResult = await policyService.uploadAvatar({ type: 'image/webp', size: 100 })
  assert.equal(policyResult.error, 'No se pudo guardar el avatar. Verificá que tu cuenta de Google siga conectada.')

  const cooldownClient = createSupabaseClient(
    {},
    { id: 'user-1', is_anonymous: false },
    new Error('avatar_upload_rate_limited')
  )
  const cooldownService = createAvatarService({
    storage: createStorage(),
    profileStorage: createStorage(),
    supabaseClient: cooldownClient,
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'public-key',
    now: () => 1000
  })

  const cooldownResult = await cooldownService.uploadAvatar({ type: 'image/webp', size: 100 })
  assert.equal(cooldownResult.error, 'Esperá 30 segundos antes de cambiar el avatar nuevamente.')
})
