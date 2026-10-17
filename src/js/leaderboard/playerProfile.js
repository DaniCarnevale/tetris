/* global localStorage */

import { normalizeNickname } from './leaderboardModel.js'

export const PLAYER_PROFILE_STORAGE_KEY = 'tetris.player.profile'

export function createGuestProfile ({ nickname = 'Jugador', id = createGuestId(), avatarPath = null } = {}) {
  return {
    id: typeof id === 'string' && id.length > 0 ? id : createGuestId(),
    nickname: normalizeNickname(nickname),
    avatarPath: normalizeAvatarPath(avatarPath)
  }
}

export function loadGuestProfile (storage = getStorage(), createId = createGuestId) {
  if (!storage) return createGuestProfile({ id: createId() })

  try {
    const rawProfile = storage.getItem(PLAYER_PROFILE_STORAGE_KEY)
    if (!rawProfile) return createGuestProfile({ id: createId() })

    const parsedProfile = JSON.parse(rawProfile)
    return createGuestProfile({
      id: parsedProfile?.id || createId(),
      nickname: parsedProfile?.nickname,
      avatarPath: parsedProfile?.avatarPath
    })
  } catch {
    return createGuestProfile({ id: createId() })
  }
}

export function saveGuestProfile (nickname, storage = getStorage(), id, avatarPath = null) {
  const profile = createGuestProfile({ nickname, id, avatarPath })

  try {
    storage?.setItem(PLAYER_PROFILE_STORAGE_KEY, JSON.stringify(profile))
  } catch {
    // Storage is optional; the current session can still use the profile.
  }

  return profile
}

function createGuestId () {
  return `guest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function getStorage () {
  return typeof localStorage === 'undefined' ? null : localStorage
}

function normalizeAvatarPath (avatarPath) {
  return typeof avatarPath === 'string' && avatarPath.length > 0 ? avatarPath : null
}
