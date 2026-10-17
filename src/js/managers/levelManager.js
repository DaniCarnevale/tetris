import { levels } from '../utils/levels.js'

export function getCurrentLevel (score, startLevel = 1) {
  const levelOffset = (Math.max(1, startLevel) - 1) * 1000

  return levels.reduce((currentLevel, level) => {
    return score + levelOffset >= level.limit ? level : currentLevel
  }, levels[0])
}
