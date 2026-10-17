import test from 'node:test'
import assert from 'node:assert/strict'

import { canEditProfile, createAccountService } from '../src/js/leaderboard/accountService.js'

function createAccountClient ({ session = null, anonymousUser = { id: 'anonymous-1', is_anonymous: true }, profile = null, settings = null, oauthData = { url: 'https://accounts.google.test/authorize' } } = {}) {
  const calls = {}
  const table = {
    select: () => table,
    eq: () => table,
    maybeSingle: async () => ({ data: profile, error: null }),
    upsert: async (payload, options) => {
      calls.upsert = { payload, options }
      return { error: null }
    }
  }
  const settingsTable = {
    select: () => settingsTable,
    eq: () => settingsTable,
    maybeSingle: async () => ({ data: settings, error: null }),
    upsert: async (payload, options) => {
      calls.settingsUpsert = { payload, options }
      return { error: null }
    }
  }

  return {
    calls,
    client: {
      auth: {
        getSession: async () => ({ data: { session }, error: null }),
        signInAnonymously: async () => ({ data: { user: anonymousUser }, error: null }),
        signInWithOAuth: async (payload) => {
          calls.signInWithOAuth = payload
          return { data: oauthData, error: null }
        },
        signOut: async (options) => {
          calls.signOut = options
          return { error: null }
        }
      },
      from: (tableName) => tableName === 'player_settings' ? settingsTable : table,
      rpc: async (functionName, payload) => {
        calls[functionName] = payload
        return { error: null }
      }
    }
  }
}

test('starts Google sign-in from a guest session so existing identities can log in', async () => {
  const { client, calls } = createAccountClient()
  const service = createAccountService({
    supabaseClient: client,
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'public-key',
    redirectTo: 'http://127.0.0.1:5173/'
  })

  const result = await service.connectGoogle()

  assert.equal(result.source, 'redirect')
  assert.equal(result.url, 'https://accounts.google.test/authorize')
  assert.deepEqual(calls.signInWithOAuth, {
    provider: 'google',
    options: { redirectTo: 'http://127.0.0.1:5173/' }
  })
})

test('exposes the signed-in Google account state', async () => {
  const { client } = createAccountClient({
    session: { user: { id: 'user-1', email: 'dani@example.com', is_anonymous: false } }
  })
  const service = createAccountService({
    supabaseClient: client,
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'public-key'
  })

  assert.deepEqual(await service.getAccountState(), {
    source: 'online',
    status: 'signed-in',
    userId: 'user-1',
    email: 'dani@example.com',
    isAnonymous: false,
    error: null
  })
})

test('signs out only the current browser session', async () => {
  const { client, calls } = createAccountClient()
  const service = createAccountService({
    supabaseClient: client,
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'public-key'
  })

  assert.deepEqual(await service.signOut(), { source: 'online', error: null })
  assert.deepEqual(calls.signOut, { scope: 'local' })
})

test('only a signed-in Google account can edit nickname and avatar', () => {
  assert.equal(canEditProfile({ status: 'guest', isAnonymous: true }), false)
  assert.equal(canEditProfile({ status: 'offline', isAnonymous: true }), false)
  assert.equal(canEditProfile({ status: 'signed-in', isAnonymous: false }), true)
})

test('does not persist a custom profile for an anonymous guest', async () => {
  const { client, calls } = createAccountClient({
    anonymousUser: { id: 'anonymous-1', is_anonymous: true }
  })
  const service = createAccountService({
    supabaseClient: client,
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'public-key'
  })

  const result = await service.saveProfile({ nickname: 'Dani', avatarPath: 'anonymous-1/avatar.webp' })

  assert.deepEqual(result, {
    source: 'guest',
    profile: { nickname: 'Guest', avatarPath: null },
    error: null
  })
  assert.equal(calls.upsert, undefined)
})

test('loads and persists the chosen nickname and avatar path remotely', async () => {
  const { client, calls } = createAccountClient({
    session: { user: { id: 'user-1', email: 'dani@example.com', is_anonymous: false } },
    profile: { nickname: 'Dani', avatar_path: 'user-1/avatar.webp' }
  })
  const service = createAccountService({
    supabaseClient: client,
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'public-key'
  })

  assert.deepEqual(await service.loadProfile(), {
    source: 'online',
    profile: { nickname: 'Dani', avatarPath: 'user-1/avatar.webp' },
    error: null
  })

  const result = await service.saveProfile({ nickname: 'Ana', avatarPath: 'user-1/avatar.webp' })

  assert.equal(result.source, 'online')
  assert.deepEqual(calls.upsert, {
    payload: {
      player_id: 'user-1',
      nickname: 'Ana',
      avatar_path: 'user-1/avatar.webp'
    },
    options: { onConflict: 'player_id' }
  })
  assert.deepEqual(calls.sync_profile_score_identity, {
    new_nickname: 'Ana',
    new_avatar_path: 'user-1/avatar.webp'
  })
})

test('loads and persists gameplay settings for a signed-in account', async () => {
  const { client, calls } = createAccountClient({
    session: { user: { id: 'user-1', email: 'dani@example.com', is_anonymous: false } },
    settings: {
      controls: { pause: 'Space' },
      sound_enabled: false,
      music_enabled: true,
      music_volume: 0.35,
      soft_drop_multiplier: 4
    }
  })
  const service = createAccountService({
    supabaseClient: client,
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'public-key'
  })

  assert.deepEqual(await service.loadSettings(), {
    source: 'online',
    settings: {
      controls: {
        moveLeft: 'ArrowLeft',
        moveRight: 'ArrowRight',
        softDrop: 'ArrowDown',
        rotate: 'ArrowUp',
        hold: 'KeyS',
        pause: 'Space',
        restart: 'Enter'
      },
      soundEnabled: false,
      musicEnabled: true,
      musicVolume: 0.35,
      softDropMultiplier: 4
    },
    error: null
  })

  const result = await service.saveSettings({
    controls: { pause: 'KeyP' },
    soundEnabled: true,
    musicEnabled: false,
    musicVolume: 0.8,
    softDropMultiplier: 8
  })

  assert.equal(result.source, 'online')
  assert.deepEqual(calls.settingsUpsert, {
    payload: {
      player_id: 'user-1',
      controls: {
        moveLeft: 'ArrowLeft',
        moveRight: 'ArrowRight',
        softDrop: 'ArrowDown',
        rotate: 'ArrowUp',
        hold: 'KeyS',
        pause: 'KeyP',
        restart: 'Enter'
      },
      sound_enabled: true,
      music_enabled: false,
      music_volume: 0.8,
      soft_drop_multiplier: 8
    },
    options: { onConflict: 'player_id' }
  })
})

function signedInClient (overrides = {}) {
  const user = { id: 'user-1', email: 'dani@example.com', is_anonymous: false }
  return {
    auth: {
      getSession: async () => ({ data: { session: { user } }, error: null }),
      signInAnonymously: async () => ({ data: { user }, error: null }),
      signInWithOAuth: async () => ({ data: { url: 'https://oauth.test' }, error: null }),
      signOut: async () => ({ error: null }),
      ...overrides.auth
    },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) })
      }),
      upsert: async () => ({ error: null })
    }),
    ...overrides
  }
}

function onlineService (client) {
  return createAccountService({
    supabaseClient: client,
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'public-key'
  })
}

test('handles offline, guest and authentication failure states', async () => {
  const offline = createAccountService()
  assert.equal(offline.isOnline(), false)
  assert.equal((await offline.getAccountState()).status, 'offline')
  assert.equal((await offline.connectGoogle()).source, 'offline')
  assert.equal((await offline.signOut()).source, 'offline')
  assert.equal((await offline.loadProfile()).source, 'offline')
  assert.equal((await offline.saveProfile({})).source, 'offline')
  assert.equal((await offline.loadSettings()).source, 'offline')
  assert.equal((await offline.saveSettings({})).source, 'offline')

  const guest = onlineService(createAccountClient().client)
  assert.equal((await guest.getAccountState()).status, 'guest')
  assert.equal((await guest.loadProfile()).source, 'guest')
  assert.equal((await guest.loadSettings()).source, 'guest')
  assert.equal((await guest.saveSettings({})).source, 'guest')

  const noEmail = onlineService(signedInClient())
  const state = await noEmail.getAccountState()
  assert.equal(state.email, 'dani@example.com')

  const broken = onlineService({ auth: { getSession: async () => ({ data: null, error: new Error('session down') }) } })
  assert.deepEqual(await broken.getAccountState(), {
    source: 'offline',
    status: 'offline',
    userId: null,
    email: null,
    isAnonymous: true,
    error: 'session down'
  })
})

test('handles Google and sign-out failures without throwing', async () => {
  const alreadySignedIn = onlineService(signedInClient())
  assert.deepEqual(await alreadySignedIn.connectGoogle(), { source: 'online', url: null, error: null })

  const oauthClient = createAccountClient({ oauthData: null }).client
  oauthClient.auth.signInWithOAuth = async () => ({ data: null, error: new Error('oauth down') })
  assert.equal((await onlineService(oauthClient).connectGoogle()).error, 'oauth down')

  const signOutClient = signedInClient({ auth: { signOut: async () => ({ error: new Error('sign out failed') }) } })
  assert.equal((await onlineService(signOutClient).signOut()).error, 'sign out failed')
})

test('handles profile and settings load/save failures and missing optional RPC', async () => {
  const noData = onlineService(signedInClient())
  assert.equal((await noData.loadProfile()).profile, null)
  assert.equal((await noData.loadSettings()).settings.controls.pause, 'KeyP')

  const noRpcClient = signedInClient()
  delete noRpcClient.rpc
  const noRpcResult = await onlineService(noRpcClient).saveProfile({ nickname: 'Ana' })
  assert.equal(noRpcResult.source, 'online')

  const profileErrorClient = signedInClient()
  profileErrorClient.from = () => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: { message: 'profile read failed' } }) }) }),
    upsert: async () => ({ error: { message: 'profile write failed' } })
  })
  const profileErrorService = onlineService(profileErrorClient)
  assert.equal((await profileErrorService.loadProfile()).error, 'profile read failed')
  assert.equal((await profileErrorService.saveProfile({})).error, 'profile write failed')

  const rpcErrorClient = signedInClient()
  rpcErrorClient.rpc = async () => ({ error: { message: 'sync failed' } })
  assert.equal((await onlineService(rpcErrorClient).saveProfile({})).error, 'sync failed')

  const settingsErrorClient = signedInClient()
  settingsErrorClient.from = () => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: { message: 'settings read failed' } }) }) }),
    upsert: async () => ({ error: { message: 'settings write failed' } })
  })
  const settingsErrorService = onlineService(settingsErrorClient)
  assert.equal((await settingsErrorService.loadSettings()).error, 'settings read failed')
  assert.equal((await settingsErrorService.saveSettings({})).error, 'settings write failed')
})

test('uses the browser origin as the OAuth redirect when available', async () => {
  const previousWindow = globalThis.window
  globalThis.window = { location: { origin: 'https://tetris.example' } }

  try {
    const { client, calls } = createAccountClient()
    const service = createAccountService({
      supabaseClient: client,
      supabaseUrl: 'https://example.supabase.co',
      supabaseKey: 'public-key'
    })
    await service.connectGoogle()
    assert.equal(calls.signInWithOAuth.options.redirectTo, 'https://tetris.example')
  } finally {
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
  }
})
