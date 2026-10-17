import { moveActivePiece, holdActivePiece, rotateActivePiece, createGame } from '../game/engine.js'
import { getStage, STAGES } from '../game/stages.js'
import { getCurrentLevel } from '../managers/levelManager.js'

export const RUN_ACTIONS = Object.freeze(['left', 'right', 'down', 'rotate', 'hold'])
export const MAX_RUN_ACTIONS = 12000

export function createSeededRandom (seed) {
  let state = Number(seed) >>> 0
  if (state === 0) state = 0x6d2b79f5

  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0
    return state / 4294967296
  }
}

export function normalizeRunActions (actions) {
  if (!Array.isArray(actions) || actions.length > MAX_RUN_ACTIONS) return null
  if (actions.some((action) => !RUN_ACTIONS.includes(action))) return null
  return [...actions]
}

export function replayRun ({ seed, stageId, startLevel, actions } = {}) {
  const normalizedActions = normalizeRunActions(actions)
  if (!normalizedActions) throw new Error('invalid_run_actions')
  if (!Number.isInteger(Number(seed)) || Number(seed) < 0) throw new Error('invalid_run_seed')
  if (!Number.isInteger(startLevel) || startLevel < 1 || startLevel > 10) throw new Error('invalid_run_level')
  if (!STAGES.some((stage) => stage.id === stageId)) throw new Error('invalid_run_stage')

  const game = createGame({
    random: createSeededRandom(seed),
    startLevel,
    startingStage: getStage(stageId).id
  })

  normalizedActions.forEach((action) => {
    if (game.gameOver) return

    if (action === 'rotate') rotateActivePiece(game)
    else if (action === 'hold') holdActivePiece(game)
    else moveActivePiece(game, action)
  })

  return {
    score: game.score,
    lines: game.lines,
    level: getCurrentLevel(game.score, game.startLevel).level,
    gameOver: game.gameOver,
    actionCount: normalizedActions.length
  }
}
