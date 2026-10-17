import { PIECES } from '../config/config.js'

function isSamePoint (first, second) {
  return first[0] === second[0] && first[1] === second[1]
}

export function getPieceGlyphPath (shape) {
  const isFilled = (x, y) => Boolean(shape[y]?.[x])
  const edges = []

  shape.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (!cell) return

      if (!isFilled(x, y - 1)) edges.push([[x, y], [x + 1, y]])
      if (!isFilled(x + 1, y)) edges.push([[x + 1, y], [x + 1, y + 1]])
      if (!isFilled(x, y + 1)) edges.push([[x + 1, y + 1], [x, y + 1]])
      if (!isFilled(x - 1, y)) edges.push([[x, y + 1], [x, y]])
    })
  })

  const remaining = [...edges]
  const paths = []

  while (remaining.length > 0) {
    const [start, end] = remaining.shift()
    const points = [start, end]

    while (!isSamePoint(points[points.length - 1], start)) {
      const current = points[points.length - 1]
      const nextIndex = remaining.findIndex(([edgeStart]) => isSamePoint(edgeStart, current))
      if (nextIndex === -1) break

      const [, nextEnd] = remaining.splice(nextIndex, 1)[0]
      points.push(nextEnd)
    }

    paths.push(`M ${points.map(([x, y]) => `${x} ${y}`).join(' L ')} Z`)
  }

  return paths.join(' ')
}

export const PIECE_STATS_META = Object.freeze(PIECES.map(({ id, label, shape, color }) => Object.freeze({
  id,
  label,
  shape: shape.map((row) => [...row]),
  glyphPath: getPieceGlyphPath(shape),
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
