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

function createSupabaseClient (calls, user = { id: 'user-1' }, uploadError = null, removeError = null) {
  const bucket = {
    upload: async (path, file, options) => {
      calls.upload = { path, file, options }
      return { error: uploadError }
    },
    remove: async (paths) => {
      calls.remove = paths
      return { error: removeError }
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
  assert.equal(validateAvatarFile().valid, false)
  assert.equal(validateAvatarFile({}).message, 'Elegí una imagen para usar como avatar.')
  assert.equal(validateAvatarFile({ type: 'image/gif', size: 20 }).valid, false)
  assert.equal(validateAvatarFile({ type: 'image/png', size: 0 }).valid, false)
  assert.equal(validateAvatarFile({ type: 'image/png', size: AVATAR_MAX_BYTES + 1 }).valid, false)
})

test('builds one safe avatar path per authenticated player', () => {
  assert.equal(buildAvatarPath('user-1'), 'user-1/avatar.webp')
  assert.equal(buildAvatarPath(''), null)
  assert.equal(buildAvatarPath('user/1'), null)
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

test('handles optional browser storage and public URL failures safely', async () => {
  const storage = {
    getItem: () => null,
    setItem: () => { throw new Error('storage quota exceeded') }
  }
  const calls = {}
  const service = createAvatarService({
    storage,
    profileStorage: createStorage(),
    supabaseClient: createSupabaseClient(calls),
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'public-key',
    now: () => 1000
  })

  assert.equal((await service.uploadAvatar({ type: 'image/png', size: 100 })).source, 'online')
  assert.equal(service.getAvatarUrl(''), null)
  assert.equal(service.getAvatarUrl(null), null)

  const brokenClient = { storage: { from: () => { throw new Error('url unavailable') } } }
  const brokenService = createAvatarService({
    storage: createStorage(),
    profileStorage: createStorage(),
    supabaseClient: brokenClient,
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'public-key'
  })
  assert.equal(brokenService.getAvatarUrl('user-1/avatar.webp'), null)
})

test('removes an avatar only for a signed-in user and reports cleanup errors', async () => {
  const profileStorage = createStorage()
  profileStorage.setItem('tetris.player.profile', JSON.stringify({
    id: 'guest-1', nickname: 'Ana', avatarPath: 'user-1/avatar.webp'
  }))
  const calls = {}
  const service = createAvatarService({
    storage: createStorage(),
    profileStorage,
    supabaseClient: createSupabaseClient(calls, { id: 'user-1', is_anonymous: false }),
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'public-key'
  })

  assert.deepEqual(await service.removeAvatar(), {
    source: 'online', avatarPath: null, url: null, error: null
  })
  assert.deepEqual(calls.remove, ['user-1/avatar.webp'])

  const emptyService = createAvatarService({
    storage: createStorage(),
    profileStorage: createStorage(),
    supabaseClient: createSupabaseClient({}),
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'public-key'
  })
  assert.equal((await emptyService.removeAvatar()).avatarPath, null)

  const offlineService = createAvatarService({
    storage: createStorage(),
    profileStorage,
    supabaseClient: null
  })
  assert.equal((await offlineService.removeAvatar()).source, 'local')

  const guestService = createAvatarService({
    storage: createStorage(),
    profileStorage,
    supabaseClient: createSupabaseClient({}, { id: 'anonymous-1', is_anonymous: true }),
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'public-key'
  })
  profileStorage.setItem('tetris.player.profile', JSON.stringify({
    id: 'guest-1', nickname: 'Ana', avatarPath: 'user-1/avatar.webp'
  }))
  assert.equal((await guestService.removeAvatar()).source, 'blocked')

  const removeErrorService = createAvatarService({
    storage: createStorage(),
    profileStorage,
    supabaseClient: createSupabaseClient({}, { id: 'user-1', is_anonymous: false }, null, new Error('remove failed')),
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'public-key'
  })
  assert.equal((await removeErrorService.removeAvatar()).error, 'remove failed')
})

test('handles invalid sessions, upload failures and unavailable local storage', async () => {
  const invalidIdService = createAvatarService({
    storage: createStorage(),
    profileStorage: createStorage(),
    supabaseClient: createSupabaseClient({}, { id: 'user/1', is_anonymous: false }),
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'public-key'
  })
  assert.equal((await invalidIdService.uploadAvatar({ type: 'image/png', size: 100 })).error, 'La sesión no tiene un identificador válido.')

  const uploadErrorService = createAvatarService({
    storage: createStorage(),
    profileStorage: createStorage(),
    supabaseClient: createSupabaseClient({}, { id: 'user-1', is_anonymous: false }, 'upload failed'),
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'public-key'
  })
  assert.equal((await uploadErrorService.uploadAvatar({ type: 'image/png', size: 100 })).error, 'upload failed')

  const noStorageService = createAvatarService({
    storage: null,
    profileStorage: null,
    supabaseClient: createSupabaseClient({}),
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'public-key'
  })
  assert.equal((await noStorageService.uploadAvatar({ type: 'image/png', size: 100 })).source, 'online')

  const offlineService = createAvatarService({
    storage: createStorage(),
    profileStorage: createStorage(),
    supabaseClient: null
  })
  assert.equal((await offlineService.uploadAvatar({ type: 'image/png', size: 100 })).source, 'local')

  const oldUploadStorage = createStorage()
  oldUploadStorage.setItem('tetris.avatar.last-upload', '1')
  const oldUploadService = createAvatarService({
    storage: oldUploadStorage,
    profileStorage: createStorage(),
    supabaseClient: createSupabaseClient({}),
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'public-key',
    now: () => AVATAR_UPLOAD_COOLDOWN_MS + 1
  })
  assert.equal((await oldUploadService.uploadAvatar({ type: 'image/png', size: 100 })).source, 'online')
})

test('uses an existing browser storage object by default', () => {
  const previousStorage = globalThis.localStorage
  globalThis.localStorage = createStorage()

  try {
    const service = createAvatarService({ supabaseClient: null })
    assert.equal(service.isOnline(), false)
  } finally {
    if (previousStorage === undefined) delete globalThis.localStorage
    else globalThis.localStorage = previousStorage
  }
})
