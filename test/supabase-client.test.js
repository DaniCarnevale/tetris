import test from 'node:test'
import assert from 'node:assert/strict'

import { createSupabaseClient, ensureAnonymousUser } from '../src/js/leaderboard/supabaseClient.js'

test('returns no client when Supabase configuration is incomplete or invalid', () => {
  assert.equal(createSupabaseClient('', 'key'), null)
  assert.equal(createSupabaseClient('https://example.supabase.co', ''), null)
  assert.equal(createSupabaseClient('not-a-valid-supabase-url', 'key'), null)
  assert.ok(createSupabaseClient('https://example.supabase.co', 'key'))
})

test('reuses an existing session without creating an anonymous user', async () => {
  const user = { id: 'user-1', is_anonymous: false }
  let anonymousCalls = 0
  const client = {
    auth: {
      getSession: async () => ({ data: { session: { user } }, error: null }),
      signInAnonymously: async () => { anonymousCalls += 1; return { data: { user }, error: null } }
    }
  }

  assert.equal(await ensureAnonymousUser(client), user)
  assert.equal(anonymousCalls, 0)
})

test('creates an anonymous user and reports auth failures safely', async () => {
  const user = { id: 'guest-1', is_anonymous: true }
  const client = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      signInAnonymously: async () => ({ data: { user }, error: null })
    }
  }
  assert.equal(await ensureAnonymousUser(client), user)

  await assert.rejects(
    ensureAnonymousUser({ auth: { getSession: async () => ({ data: { session: null }, error: new Error('session failed') }) } }),
    /session failed/
  )
  await assert.rejects(
    ensureAnonymousUser({ auth: { getSession: async () => ({ data: { session: null }, error: null }), signInAnonymously: async () => ({ data: null, error: new Error('sign in failed') }) } }),
    /sign in failed/
  )
  await assert.rejects(
    ensureAnonymousUser({ auth: { getSession: async () => ({ data: { session: null }, error: null }), signInAnonymously: async () => ({ data: {}, error: null }) } }),
    /No se pudo crear/
  )
})
