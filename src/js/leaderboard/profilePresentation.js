export const PROFILE_SETUP_PENDING_STORAGE_KEY = 'tetris.profile.setup.pending'

export function markProfileSetupPending (storage) {
  try {
    storage?.setItem(PROFILE_SETUP_PENDING_STORAGE_KEY, 'true')
  } catch {
    // The prompt is a progressive enhancement and must not block sign-in.
  }
}

export function consumeProfileSetupPending (storage) {
  try {
    const pending = storage?.getItem(PROFILE_SETUP_PENDING_STORAGE_KEY) === 'true'
    if (pending) storage.removeItem(PROFILE_SETUP_PENDING_STORAGE_KEY)
    return pending
  } catch {
    return false
  }
}

export function createProfileCardModel (profile = {}, accountLabel = 'Invitado') {
  const nickname = normalizeNickname(profile.nickname)
  return {
    nickname,
    initials: getInitials(nickname),
    avatarPath: normalizeAvatarPath(profile.avatarPath),
    accountLabel
  }
}

function normalizeNickname (nickname) {
  const normalized = String(nickname ?? '').trim()
  return normalized || 'Guest'
}

function normalizeAvatarPath (avatarPath) {
  const normalized = String(avatarPath ?? '').trim()
  return normalized || null
}

function getInitials (nickname) {
  const words = nickname.split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'GU'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
}
