const DEFAULT_NICKNAME = 'Jugador'
const MAX_NICKNAME_LENGTH = 16

export function normalizeNickname (nickname) {
  const normalized = String(nickname ?? '')
    .replace(/[^\p{L}\p{N}_ -]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NICKNAME_LENGTH)

  if (normalized.length === 0) return DEFAULT_NICKNAME

  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

export function createLeaderboardEntry ({
  nickname,
  score = 0,
  level = 1,
  lines = 0,
  stageId = 'fresh',
  avatarPath = null,
  createdAt = new Date().toISOString()
} = {}) {
  return {
    nickname: normalizeNickname(nickname),
    score: normalizeNumber(score),
    level: normalizeNumber(level, 1),
    lines: normalizeNumber(lines),
    stageId: typeof stageId === 'string' && stageId.length > 0 ? stageId : 'fresh',
    avatarPath: normalizeAvatarPath(avatarPath),
    createdAt
  }
}

export function sortLeaderboard (entries = [], limit = 10) {
  return entries
    .map((entry) => createLeaderboardEntry(entry))
    .filter((entry) => entry.score >= 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score
      if (right.level !== left.level) return right.level - left.level
      return String(left.createdAt).localeCompare(String(right.createdAt))
    })
    .slice(0, Math.max(0, limit))
}

function normalizeNumber (value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : fallback
}

function normalizeAvatarPath (avatarPath) {
  return typeof avatarPath === 'string' && avatarPath.length > 0 ? avatarPath : null
}
