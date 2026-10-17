import test from 'node:test'
import assert from 'node:assert/strict'

import { createAccountService } from '../src/js/leaderboard/accountService.js'

function createAccountClient ({ session = null, anonymousUser = { id: 'anonymous-1', is_anonymous: true }, profile = null } = {}) {
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

  return {
    calls,
    client: {
      auth: {
        getSession: async () => ({ data: { session }, error: null }),
        signInAnonymously: async () => ({ data: { user: anonymousUser }, error: null }),
        linkIdentity: async (payload) => {
          calls.linkIdentity = payload
          return { data: { url: 'https://accounts.google.test/authorize' }, error: null }
        }
      },
      from: () => table
    }
  }
}

test('links Google to the existing anonymous session instead of creating a new player', async () => {
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
  assert.deepEqual(calls.linkIdentity, {
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
})
