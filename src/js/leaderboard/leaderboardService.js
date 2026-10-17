/* global localStorage */

import { createLeaderboardEntry, filterLeaderboardEntries, sortLeaderboard } from './leaderboardModel.js'
import { loadGuestProfile, saveGuestProfile } from './playerProfile.js'
import { getAvatarUrl } from './avatarService.js'
import { createSupabaseClient, ensureAnonymousUser, getEnvironmentValue } from './supabaseClient.js'

export const LEADERBOARD_STORAGE_KEY = 'tetris.leaderboard.local'

export function createLeaderboardService ({
  storage = getStorage(),
  profileStorage = storage,
  supabaseClient,
  supabaseUrl = getEnvironmentValue('VITE_SUPABASE_URL'),
  supabaseKey = getEnvironmentValue('VITE_SUPABASE_PUBLISHABLE_KEY') || getEnvironmentValue('VITE_SUPABASE_ANON_KEY')
} = {}) {
  const client = supabaseClient ?? createSupabaseClient(supabaseUrl, supabaseKey)
  const online = Boolean(client && supabaseUrl && supabaseKey)

  return {
    isOnline: () => online,
    getProfile: () => loadGuestProfile(profileStorage),
    setProfile: (profile) => {
      const currentProfile = loadGuestProfile(profileStorage)
      return saveGuestProfile(
        profile?.nickname ?? currentProfile.nickname,
        profileStorage,
        currentProfile.id,
        profile?.avatarPath ?? null
      )
    },
    setNickname: (nickname) => {
      const currentProfile = loadGuestProfile(profileStorage)
      return saveGuestProfile(nickname, profileStorage, currentProfile.id, currentProfile.avatarPath)
    },
    getAvatarUrl: (avatarPath) => getAvatarUrl(client, online, avatarPath),
    getLeaderboard: (options = {}) => {
      const filters = typeof options === 'number' ? { limit: options } : options
      return getLeaderboard({
        client,
        online,
        limit: Number(filters?.limit) || 10,
        stageId: filters?.stageId ?? null,
        startLevel: filters?.startLevel ?? null,
        storage
      })
    },
    submitScore: (details) => submitScore({ client, online, details, profileStorage, storage }),
    subscribeToLeaderboard: (onInsert) => subscribeToLeaderboard({ client, online, onInsert })
  }
}

function subscribeToLeaderboard ({ client, online, onInsert }) {
  if (!online || typeof onInsert !== 'function') return () => {}

  try {
    const channel = client
      .channel('leaderboard-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'scores' },
        onInsert
      )
      .subscribe()

    return () => {
      client.removeChannel(channel)
    }
  } catch {
    return () => {}
  }
}

async function getLeaderboard ({ client, online, limit, stageId, startLevel, storage }) {
  if (!online) return localResult(storage, limit, { stageId, startLevel })

  try {
    let query = client
      .from('scores')
      .select('nickname, score, level, lines, stage_id, avatar_path, start_level, created_at')
      .order('score', { ascending: false })
      .order('level', { ascending: false })
      .order('created_at', { ascending: true })
    if (stageId) query = query.eq('stage_id', stageId)
    if (startLevel !== null && startLevel !== undefined) query = query.eq('start_level', Number(startLevel))
    const { data, error } = await query.limit(limit)

    if (error) throw error

    return {
      entries: sortLeaderboard((data ?? []).map(mapRemoteEntry), limit),
      source: 'online',
      error: null
    }
  } catch (error) {
    return localResult(storage, limit, { stageId, startLevel }, getErrorMessage(error))
  }
}

async function submitScore ({ client, online, details, profileStorage, storage }) {
  const profile = loadGuestProfile(profileStorage)
  const entry = createLeaderboardEntry({ ...details, nickname: profile.nickname, avatarPath: profile.avatarPath })

  if (!online) {
    saveLocalEntry(entry, storage)
    return { ...entry, source: 'local', error: null }
  }

  try {
    const user = await ensureAnonymousUser(client)
    const { error } = await client.from('scores').insert({
      player_id: user.id,
      nickname: entry.nickname,
      score: entry.score,
      level: entry.level,
      lines: entry.lines,
      stage_id: entry.stageId,
      avatar_path: entry.avatarPath,
      start_level: entry.startLevel
    })

    if (error) throw error

    return { ...entry, source: 'online', error: null }
  } catch (error) {
    saveLocalEntry(entry, storage)
    return { ...entry, source: 'local', error: getErrorMessage(error) }
  }
}

function localResult (storage, limit, filters, error = null) {
  return {
    entries: loadLocalEntries(storage, limit, filters),
    source: 'local',
    error
  }
}

function loadLocalEntries (storage, limit = 10, filters = {}) {
  if (!storage) return []

  try {
    const stored = storage.getItem(LEADERBOARD_STORAGE_KEY)
    const entries = stored ? JSON.parse(stored) : []
    return filterLeaderboardEntries(Array.isArray(entries) ? entries : [], filters).slice(0, Math.max(0, limit))
  } catch {
    return []
  }
}

function saveLocalEntry (entry, storage) {
  if (!storage) return

  try {
    const entries = loadLocalEntries(storage, Number.MAX_SAFE_INTEGER)
    storage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify([...entries, entry]))
  } catch {
    // Local persistence is optional and must not interrupt a finished game.
  }
}

function mapRemoteEntry (entry) {
  return {
    nickname: entry.nickname,
    score: entry.score,
    level: entry.level,
    lines: entry.lines,
    stageId: entry.stage_id,
    startLevel: entry.start_level,
    avatarPath: entry.avatar_path,
    createdAt: entry.created_at
  }
}

function getErrorMessage (error) {
  return error instanceof Error ? error.message : String(error?.message ?? error ?? 'Error desconocido')
}

function getStorage () {
  return typeof localStorage === 'undefined' ? null : localStorage
}
