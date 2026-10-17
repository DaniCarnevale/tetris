import test from 'node:test'
import assert from 'node:assert/strict'

import { filterLeaderboardEntries } from '../src/js/leaderboard/leaderboardModel.js'

const entries = [
  { nickname: 'Fundación 1', score: 100, stageId: 'foundation', startLevel: 1 },
  { nickname: 'Fundación 3', score: 300, stageId: 'foundation', startLevel: 3 },
  { nickname: 'Ascenso 3', score: 500, stageId: 'ascent', startLevel: 3 }
]

test('keeps rankings isolated by stage and optionally by starting level', () => {
  assert.deepEqual(filterLeaderboardEntries(entries, { stageId: 'foundation', startLevel: 3 }).map((entry) => entry.nickname), ['Fundación 3'])
  assert.deepEqual(filterLeaderboardEntries(entries, { stageId: 'foundation', startLevel: null }).map((entry) => entry.nickname), ['Fundación 3', 'Fundación 1'])
})

test('rejects unknown stages instead of merging them into a ranking', () => {
  assert.deepEqual(filterLeaderboardEntries(entries, { stageId: 'unknown', startLevel: null }), [])
})
