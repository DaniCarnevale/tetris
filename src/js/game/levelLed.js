const TRANSIENT_PULSE_DURATIONS = [1800, 1620, 1440, 1260, 1080, 900, 720, 640]
const TRANSIENT_ACTIVE_DURATION_MS = 2400

function normalizeLevel (level) {
  const numericLevel = Number(level)
  if (!Number.isFinite(numericLevel)) return 1
  return Math.max(1, Math.min(10, Math.floor(numericLevel)))
}

export function getLevelLedFeedback (level) {
  const normalizedLevel = normalizeLevel(level)

  if (normalizedLevel === 10) {
    return {
      tone: 'danger',
      mode: 'steady',
      persistent: true,
      pulseDurationMs: null,
      activeDurationMs: null
    }
  }

  if (normalizedLevel === 9) {
    return {
      tone: 'danger',
      mode: 'pulse',
      persistent: true,
      pulseDurationMs: 420,
      activeDurationMs: null
    }
  }

  return {
    tone: 'accent',
    mode: 'pulse',
    persistent: false,
    pulseDurationMs: TRANSIENT_PULSE_DURATIONS[normalizedLevel - 1],
    activeDurationMs: TRANSIENT_ACTIVE_DURATION_MS
  }
}
