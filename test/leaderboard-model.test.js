import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createLeaderboardEntry,
  normalizeNickname,
  sortLeaderboard
} from '../src/js/leaderboard/leaderboardModel.js'

test('normalizes nicknames for safe display and storage', () => {
  assert.equal(normalizeNickname('  Dani  Carnevale  '), 'Dani Carnevale')
  assert.equal(normalizeNickname(''), 'Jugador')
  assert.equal(normalizeNickname('un nombre demasiado largo para el ranking'), 'Un nombre demasi')
})

test('creates a leaderboard entry with safe numeric values', () => {
  assert.deepEqual(createLeaderboardEntry({
    nickname: '  dani ',
    score: '1200',
    level: '3',
    lines: '8',
    stageId: 'foundation',
    createdAt: '2026-10-17T12:00:00.000Z'
  }), {
    nickname: 'Dani',
    score: 1200,
    level: 3,
    lines: 8,
    stageId: 'foundation',
    startLevel: 1,
    avatarPath: null,
    createdAt: '2026-10-17T12:00:00.000Z'
  })
})

test('keeps the avatar path attached to a leaderboard entry', () => {
  assert.equal(createLeaderboardEntry({
    nickname: 'dani',
    avatarPath: 'user-1/avatar.webp'
  }).avatarPath, 'user-1/avatar.webp')
})

test('sorts leaderboard by score, then level and date', () => {
  const entries = [
    { nickname: 'B', score: 900, level: 4, createdAt: '2026-10-17T12:00:00.000Z' },
    { nickname: 'C', score: 1200, level: 2, createdAt: '2026-10-17T12:00:00.000Z' },
    { nickname: 'A', score: 1200, level: 2, createdAt: '2026-10-17T11:00:00.000Z' },
    { nickname: 'D', score: 1200, level: 3, createdAt: '2026-10-17T10:00:00.000Z' }
  ]

  assert.deepEqual(sortLeaderboard(entries).map((entry) => entry.nickname), ['D', 'A', 'C', 'B'])
})

test('limits leaderboard results and ignores invalid entries', () => {
  const entries = [
    { nickname: 'A', score: 100, level: 1, createdAt: '2026-10-17T10:00:00.000Z' },
    { nickname: 'B', score: -1, level: 1, createdAt: '2026-10-17T10:00:00.000Z' },
    { nickname: 'C', score: 200, level: 1, createdAt: '2026-10-17T10:00:00.000Z' }
  ]

  assert.deepEqual(sortLeaderboard(entries, 1).map((entry) => entry.nickname), ['C'])
})
