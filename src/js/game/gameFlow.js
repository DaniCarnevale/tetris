export const GAME_OVER_ANIMATION_MS = 1200

export function canReturnToStartScreen ({ gameOver, animationFinished, keyCode }) {
  return Boolean(gameOver && animationFinished && keyCode)
}

export function getGameOverSummary ({ score, level }) {
  return `Puntuación ${score} · Nivel ${level}`
}
