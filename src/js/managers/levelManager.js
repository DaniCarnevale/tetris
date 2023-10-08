import { levels } from "../utils/levels";

export function getCurrentLevel(score) {
  let currentLevel = levels[0];
  for (let level of levels) {
    if (score >= level.limit) {
      currentLevel = level;
    }
  }
  return currentLevel;
}
