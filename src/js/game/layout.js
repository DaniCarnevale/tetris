export function getGameLayoutMode ({ width, height }) {
  if (width <= 560) return 'mobile'
  if (width <= 900 || height <= 760) return 'compact'
  return 'desktop'
}

export function getGameViewportState (isGameActive) {
  return {
    isGameActive: Boolean(isGameActive),
    shouldLockScroll: Boolean(isGameActive)
  }
}

export function getPieceStatsLayout () {
  return {
    orientation: 'horizontal',
    showLongLabels: false
  }
}
