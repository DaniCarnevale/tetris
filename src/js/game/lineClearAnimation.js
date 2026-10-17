export const LINE_CLEAR_ANIMATION_MS = 560

export function createLineClearAnimation (rows, startedAt = 0) {
  if (!Array.isArray(rows) || rows.length === 0) return null

  return {
    startedAt,
    duration: LINE_CLEAR_ANIMATION_MS,
    rows: rows.map(({ y, cells }) => ({
      y,
      cells: Array.isArray(cells) ? [...cells] : []
    }))
  }
}

export function getLineClearProgress (animation, now) {
  if (!animation) return 1

  const elapsed = Number.isFinite(now) ? now - animation.startedAt : animation.duration
  return Math.min(1, Math.max(0, elapsed / animation.duration))
}

export function isLineClearAnimationActive (animation, now) {
  return Boolean(animation && getLineClearProgress(animation, now) < 1)
}
