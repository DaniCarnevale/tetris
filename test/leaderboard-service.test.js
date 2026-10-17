import test from 'node:test'
import assert from 'node:assert/strict'

import { createLeaderboardService } from '../src/js/leaderboard/leaderboardService.js'

function createStorage () {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  }
}

test('guest mode persists scores locally when Supabase is not configured', async () => {
  const storage = createStorage()
  const service = createLeaderboardService({ storage, profileStorage: storage })

  service.setNickname('ana')
  const saved = await service.submitScore({ score: 1200, level: 3, lines: 4, stageId: 'fresh' })
  const ranking = await service.getLeaderboard()

  assert.equal(saved.source, 'local')
  assert.equal(ranking.source, 'local')
  assert.deepEqual(ranking.entries[0], {
    nickname: 'Ana',
    score: 1200,
    level: 3,
    lines: 4,
    stageId: 'fresh',
    startLevel: 1,
    avatarPath: null,
    createdAt: ranking.entries[0].createdAt
  })
})

test('submits only a server-verified run result online', async () => {
  const storage = createStorage()
  const invoked = []
  const supabaseClient = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      signInAnonymously: async () => ({ data: { user: { id: 'user-1' } }, error: null })
    },
    functions: {
      invoke: async (name, options) => {
        invoked.push({ name, options })
        if (name === 'start-run') return { data: { runId: 'run-1', seed: 123456 }, error: null }
        return {
          data: {
            entry: {
              nickname: 'Ana',
              score: 0,
              level: 1,
              lines: 0,
              stageId: 'fresh',
              startLevel: 1,
              avatarPath: 'user-1/avatar.webp',
              createdAt: '2026-10-17T12:00:00.000Z'
            }
          },
          error: null
        }
      }
    }
  }
  const service = createLeaderboardService({
    storage,
    profileStorage: storage,
    supabaseClient,
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'public-key'
  })

  service.setNickname('ana')
  const run = await service.startRun({ stageId: 'fresh', startLevel: 1 })
  const saved = await service.submitScore({ run, actions: ['down'] })

  assert.equal(saved.source, 'online')
  assert.equal(saved.score, 0)
  assert.deepEqual(invoked.map(({ name }) => name), ['start-run', 'submit-score'])
  assert.equal(invoked[1].options.body.runId, 'run-1')
  assert.deepEqual(invoked[1].options.body.actions, ['down'])
})

test('warms the auth session once and invalidates it after sign out', async () => {
  let sessionCalls = 0
  let anonymousCalls = 0
  let authStateListener
  const user = { id: 'guest-1', is_anonymous: true }
  const client = {
    auth: {
      getSession: async () => {
        sessionCalls += 1
        return { data: { session: { user } }, error: null }
      },
      signInAnonymously: async () => {
        anonymousCalls += 1
        return { data: { user }, error: null }
      },
      onAuthStateChange: (listener) => {
        authStateListener = listener
        return { data: { subscription: { unsubscribe: () => {} } } }
      }
    }
  }
  const service = createLeaderboardService({
    supabaseClient: client,
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'public-key'
  })

  assert.equal((await Promise.all([service.prepareSession(), service.prepareSession()]))[0], user)
  assert.equal(sessionCalls, 1)
  assert.equal(anonymousCalls, 0)

  authStateListener('SIGNED_OUT', null)
  assert.equal(await service.prepareSession(), user)
  assert.equal(sessionCalls, 2)
})

test('allows the auth warmup to retry after a transient failure', async () => {
  let attempts = 0
  const user = { id: 'guest-2', is_anonymous: true }
  const client = {
    auth: {
      getSession: async () => {
        attempts += 1
        if (attempts === 1) return { data: null, error: new Error('temporary auth failure') }
        return { data: { session: { user } }, error: null }
      }
    }
  }
  const service = createLeaderboardService({
    supabaseClient: client,
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'public-key'
  })

  await assert.rejects(service.prepareSession(), /temporary auth failure/)
  assert.equal(await service.prepareSession(), user)
  assert.equal(attempts, 2)
})

test('resolves avatar URLs for public leaderboard entries', () => {
  const supabaseClient = {
    storage: {
      from: () => ({
        getPublicUrl: (path) => ({ data: { publicUrl: `https://cdn.example/${path}` } })
      })
    }
  }
  const service = createLeaderboardService({
    supabaseClient,
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'public-key'
  })

  assert.equal(service.getAvatarUrl('user-1/avatar.webp'), 'https://cdn.example/user-1/avatar.webp')
})

test('empty or broken local scores return a safe empty ranking', async () => {
  const storage = createStorage()
  storage.setItem('tetris.leaderboard.local', '{broken')
  const service = createLeaderboardService({ storage, profileStorage: storage })

  const ranking = await service.getLeaderboard()

  assert.deepEqual(ranking.entries, [])
  assert.equal(ranking.error, null)
})

test('realtime subscription is a safe no-op without Supabase', () => {
  const service = createLeaderboardService()
  let updates = 0

  const unsubscribe = service.subscribeToLeaderboard(() => { updates += 1 })

  unsubscribe()
  assert.equal(updates, 0)
})

test('realtime subscription refreshes the ranking and removes its channel', () => {
  let callback
  let removedChannel
  const channel = {
    on: (_event, _filter, handler) => {
      callback = handler
      return channel
    },
    subscribe: () => channel
  }
  const supabaseClient = {
    channel: () => channel,
    removeChannel: (currentChannel) => { removedChannel = currentChannel }
  }
  const service = createLeaderboardService({
    supabaseClient,
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'public-key'
  })
  let updates = 0

  const unsubscribe = service.subscribeToLeaderboard(() => { updates += 1 })
  const realtimePayload = {}
  callback(realtimePayload)
  unsubscribe()

  assert.equal(updates, 1)
  assert.equal(removedChannel, channel)
})

function onlineLeaderboardClient ({ queryResult = { data: [], error: null }, invoke = null, channel = null } = {}) {
  const query = {
    select: () => query,
    order: () => query,
    eq: () => query,
    limit: async () => queryResult
  }
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      signInAnonymously: async () => ({ data: { user: { id: 'user-1' } }, error: null })
    },
    from: () => query,
    functions: { invoke },
    channel: () => channel,
    removeChannel: () => {}
  }
}

test('loads an online ranking with stage and starting-level filters', async () => {
  const client = onlineLeaderboardClient({
    queryResult: {
      data: [{
        nickname: 'Ana',
        score: 900,
        level: 3,
        lines: 6,
        stage_id: 'foundation',
        start_level: 2,
        avatar_path: 'user-1/avatar.webp',
        created_at: '2026-10-17T12:00:00.000Z'
      }],
      error: null
    }
  })
  const service = createLeaderboardService({
    storage: createStorage(),
    profileStorage: createStorage(),
    supabaseClient: client,
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'public-key'
  })

  const result = await service.getLeaderboard({ limit: 5, stageId: 'foundation', startLevel: 2 })
  assert.equal(result.source, 'online')
  assert.deepEqual(result.entries[0], {
    nickname: 'Ana',
    score: 900,
    level: 3,
    lines: 6,
    stageId: 'foundation',
    startLevel: 2,
    avatarPath: 'user-1/avatar.webp',
    createdAt: '2026-10-17T12:00:00.000Z'
  })
})

test('falls back to the local ranking when the online query fails', async () => {
  const storage = createStorage()
  storage.setItem('tetris.leaderboard.local', JSON.stringify([{
    nickname: 'Local',
    score: 100,
    level: 1,
    lines: 0,
    stageId: 'fresh',
    startLevel: 1,
    avatarPath: null,
    createdAt: '2026-10-17T12:00:00.000Z'
  }]))
  const service = createLeaderboardService({
    storage,
    profileStorage: storage,
    supabaseClient: onlineLeaderboardClient({ queryResult: { data: null, error: new Error('query failed') } }),
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'public-key'
  })

  const result = await service.getLeaderboard(1)
  assert.equal(result.source, 'local')
  assert.equal(result.error, 'query failed')
  assert.equal(result.entries[0].nickname, 'Local')
})

test('handles missing and throwing realtime integrations safely', () => {
  const noCallback = createLeaderboardService({
    supabaseClient: onlineLeaderboardClient(),
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'public-key'
  })
  assert.doesNotThrow(() => noCallback.subscribeToLeaderboard())

  const throwingClient = onlineLeaderboardClient()
  throwingClient.channel = () => { throw new Error('realtime unavailable') }
  const service = createLeaderboardService({
    supabaseClient: throwingClient,
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'public-key'
  })
  const unsubscribe = service.subscribeToLeaderboard(() => {})
  assert.doesNotThrow(unsubscribe)
})

test('falls back safely when a secure run cannot be started or submitted', async () => {
  const storage = createStorage()
  const offline = createLeaderboardService({ storage, profileStorage: storage })
  assert.deepEqual(await offline.startRun({ stageId: 'fresh', startLevel: 1 }), {
    source: 'local', runId: null, seed: null, error: null
  })

  const missingFunctionClient = onlineLeaderboardClient()
  delete missingFunctionClient.functions
  assert.equal((await createLeaderboardService({
    storage,
    profileStorage: storage,
    supabaseClient: missingFunctionClient,
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'public-key'
  }).startRun({})).error, 'secure_run_unavailable')

  const errorFunctionClient = onlineLeaderboardClient({ invoke: async () => ({ data: null, error: new Error('function failed') }) })
  assert.equal((await createLeaderboardService({
    storage,
    profileStorage: storage,
    supabaseClient: errorFunctionClient,
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'public-key'
  }).startRun({})).error, 'function failed')

  const invalidResponseClient = onlineLeaderboardClient({ invoke: async () => ({ data: { runId: 42, seed: -1 }, error: null }) })
  assert.equal((await createLeaderboardService({
    storage,
    profileStorage: storage,
    supabaseClient: invalidResponseClient,
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'public-key'
  }).startRun({})).error, 'invalid_run_response')

  const submitMissing = createLeaderboardService({
    storage,
    profileStorage: storage,
    supabaseClient: onlineLeaderboardClient({ invoke: async () => ({ data: null, error: null }) }),
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'public-key'
  })
  assert.equal((await submitMissing.submitScore({ actions: [] })).error, 'secure_run_required')

  const submitError = createLeaderboardService({
    storage,
    profileStorage: storage,
    supabaseClient: onlineLeaderboardClient({ invoke: async () => ({ data: null, error: 'submit failed' }) }),
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'public-key'
  })
  assert.equal((await submitError.submitScore({ run: { runId: 'run-1' }, actions: [] })).error, 'submit failed')

  const invalidScore = createLeaderboardService({
    storage,
    profileStorage: storage,
    supabaseClient: onlineLeaderboardClient({ invoke: async () => ({ data: { entry: null }, error: null }) }),
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'public-key'
  })
  assert.equal((await invalidScore.submitScore({ run: { runId: 'run-1' }, actions: [] })).error, 'invalid_score_response')
})

test('protects local persistence when storage is absent or throws', async () => {
  const noStorage = createLeaderboardService({ storage: null, profileStorage: null })
  assert.deepEqual((await noStorage.getLeaderboard()).entries, [])

  const throwingStorage = {
    getItem: () => '[]',
    setItem: () => { throw new Error('quota exceeded') }
  }
  const service = createLeaderboardService({ storage: throwingStorage, profileStorage: throwingStorage })
  const saved = await service.submitScore({ score: 10, level: 1, lines: 0, stageId: 'fresh' })
  assert.equal(saved.source, 'local')
  assert.equal((await service.getLeaderboard()).entries.length, 0)
})

test('updates local profile fields without losing the current identity', () => {
  const storage = createStorage()
  const service = createLeaderboardService({ storage, profileStorage: storage })
  assert.equal(service.isOnline(), false)

  service.setNickname('Ana')
  const profile = service.setProfile({ avatarPath: 'user-1/avatar.webp' })
  assert.deepEqual(profile, { id: profile.id, nickname: 'Ana', avatarPath: 'user-1/avatar.webp' })
  assert.equal(service.getProfile().avatarPath, 'user-1/avatar.webp')
  assert.equal(service.setProfile({ nickname: 'Marta' }).nickname, 'Marta')
})
