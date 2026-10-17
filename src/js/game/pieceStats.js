import { PIECES } from '../config/config.js'

export const PIECE_STATS_META = Object.freeze(PIECES.map(({ id, label, shortLabel, color }) => Object.freeze({
  id,
  label,
  shortLabel,
  color
})))

export function createPieceStats () {
  return PIECE_STATS_META.reduce((stats, piece) => {
    stats[piece.id] = 0
    return stats
  }, {})
}

export function recordPieceDrop (stats, pieceId) {
  if (!Object.hasOwn(stats, pieceId)) return stats

  return {
    ...stats,
    [pieceId]: stats[pieceId] + 1
  }
}

export function getPieceStatsView (stats = {}) {
  const counts = PIECE_STATS_META.map((piece) => Math.max(0, Number(stats[piece.id]) || 0))
  const total = counts.reduce((sum, count) => sum + count, 0)
  const max = Math.max(1, ...counts)

  return {
    total,
    max,
    rows: PIECE_STATS_META.map((piece, index) => ({
      ...piece,
      count: counts[index],
      width: Math.round((counts[index] / max) * 100)
    }))
  }
}
