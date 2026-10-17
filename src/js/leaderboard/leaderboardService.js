/* global localStorage */

import { createClient } from '@supabase/supabase-js'

import { createLeaderboardEntry, sortLeaderboard } from './leaderboardModel.js'
import { loadGuestProfile, saveGuestProfile } from './playerProfile.js'

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
    setNickname: (nickname) => {
      const currentProfile = loadGuestProfile(profileStorage)
      return saveGuestProfile(nickname, profileStorage, currentProfile.id, currentProfile.avatarPath)
    },
    getLeaderboard: (limit = 10) => getLeaderboard({ client, online, limit, storage }),
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

async function getLeaderboard ({ client, online, limit, storage }) {
  if (!online) return localResult(storage, limit)

  try {
    const { data, error } = await client
      .from('scores')
      .select('nickname, score, level, lines, stage_id, avatar_path, created_at')
      .order('score', { ascending: false })
      .order('level', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) throw error

    return {
      entries: sortLeaderboard((data ?? []).map(mapRemoteEntry), limit),
      source: 'online',
      error: null
    }
  } catch (error) {
    return localResult(storage, limit, getErrorMessage(error))
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
      start_level: Number(details?.startLevel) || 1
    })

    if (error) throw error

    return { ...entry, source: 'online', error: null }
  } catch (error) {
    saveLocalEntry(entry, storage)
    return { ...entry, source: 'local', error: getErrorMessage(error) }
  }
}

async function ensureAnonymousUser (client) {
  const { data: sessionData, error: sessionError } = await client.auth.getSession()
  if (sessionError) throw sessionError
  if (sessionData?.session?.user) return sessionData.session.user

  const { data, error } = await client.auth.signInAnonymously()
  if (error) throw error
  if (!data?.user) throw new Error('No se pudo crear la sesión invitada.')
  return data.user
}

function localResult (storage, limit, error = null) {
  return {
    entries: loadLocalEntries(storage, limit),
    source: 'local',
    error
  }
}

function loadLocalEntries (storage, limit = 10) {
  if (!storage) return []

  try {
    const stored = storage.getItem(LEADERBOARD_STORAGE_KEY)
    const entries = stored ? JSON.parse(stored) : []
    return sortLeaderboard(Array.isArray(entries) ? entries : [], limit)
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
    avatarPath: entry.avatar_path,
    createdAt: entry.created_at
  }
}

function createSupabaseClient (url, key) {
  if (!url || !key) return null

  try {
    return createClient(url, key)
  } catch {
    return null
  }
}

function getEnvironmentValue (name) {
  const environment = typeof import.meta.env === 'object' ? import.meta.env : {}
  return environment[name]
}

function getErrorMessage (error) {
  return error instanceof Error ? error.message : String(error?.message ?? error ?? 'Error desconocido')
}

function getStorage () {
  return typeof localStorage === 'undefined' ? null : localStorage
}
