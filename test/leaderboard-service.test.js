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
