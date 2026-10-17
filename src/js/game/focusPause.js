export function shouldAutoPause ({ gameStarted = false, gameOver = false, paused = false } = {}) {
  return gameStarted && !gameOver && !paused
}
