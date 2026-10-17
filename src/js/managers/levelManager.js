import { levels } from '../utils/levels.js'

export function getCurrentLevel (score) {
  return levels.reduce((currentLevel, level) => {
    return score >= level.limit ? level : currentLevel
  }, levels[0])
}
