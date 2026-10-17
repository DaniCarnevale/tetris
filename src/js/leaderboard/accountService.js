/* global window */

import { normalizeNickname } from './leaderboardModel.js'
import { createSupabaseClient, ensureAnonymousUser, getEnvironmentValue } from './supabaseClient.js'
import { createUserSettings } from '../settings/settingsModel.js'

export const PLAYER_PROFILE_TABLE = 'player_profiles'
export const PLAYER_SETTINGS_TABLE = 'player_settings'
export const GUEST_PROFILE_NICKNAME = 'Guest'

export function canEditProfile (account) {
  return account?.status === 'signed-in' && account.isAnonymous === false
}

export function createAccountService ({
  supabaseClient,
  supabaseUrl = getEnvironmentValue('VITE_SUPABASE_URL'),
  supabaseKey = getEnvironmentValue('VITE_SUPABASE_PUBLISHABLE_KEY') || getEnvironmentValue('VITE_SUPABASE_ANON_KEY'),
  redirectTo = getDefaultRedirectTo()
} = {}) {
  const client = supabaseClient ?? createSupabaseClient(supabaseUrl, supabaseKey)
  const online = Boolean(client && supabaseUrl && supabaseKey)

  return {
    isOnline: () => online,
    getAccountState: () => getAccountState({ client, online }),
    connectGoogle: () => connectGoogle({ client, online, redirectTo }),
    signOut: () => signOut({ client, online }),
    loadProfile: () => loadProfile({ client, online }),
    saveProfile: (profile) => saveProfile({ client, online, profile }),
    loadSettings: () => loadSettings({ client, online }),
    saveSettings: (settings) => saveSettings({ client, online, settings })
  }
}

async function getAccountState ({ client, online }) {
  if (!online) return createAccountState('offline', null, null, 'Supabase todavía no está configurado.')

  try {
    const { data, error } = await client.auth.getSession()
    if (error) throw error
    const user = data?.session?.user
    if (!user) return createAccountState('guest', null, null, null)

    return createAccountState(user.is_anonymous ? 'guest' : 'signed-in', user.id, user.email ?? null, null, user.is_anonymous)
  } catch (error) {
    return createAccountState('offline', null, null, getErrorMessage(error))
  }
}

async function connectGoogle ({ client, online, redirectTo }) {
  if (!online) return { source: 'offline', url: null, error: 'Supabase todavía no está configurado.' }

  try {
    const user = await ensureAnonymousUser(client)
    if (user.is_anonymous === false) return { source: 'online', url: null, error: null }

    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    })
    if (error) throw error

    return { source: 'redirect', url: data?.url ?? null, error: null }
  } catch (error) {
    return { source: 'offline', url: null, error: getErrorMessage(error) }
  }
}

async function signOut ({ client, online }) {
  if (!online) return { source: 'offline', error: 'Supabase todavía no está configurado.' }

  try {
    const { error } = await client.auth.signOut({ scope: 'local' })
    if (error) throw error
    return { source: 'online', error: null }
  } catch (error) {
    return { source: 'offline', error: getErrorMessage(error) }
  }
}

async function loadProfile ({ client, online }) {
  if (!online) return { source: 'offline', profile: null, error: 'Supabase todavía no está configurado.' }

  try {
    const user = await ensureAnonymousUser(client)
    if (user.is_anonymous) return createGuestProfileResult()
    const { data, error } = await client
      .from(PLAYER_PROFILE_TABLE)
      .select('nickname, avatar_path')
      .eq('player_id', user.id)
      .maybeSingle()
    if (error) throw error

    return {
      source: 'online',
      profile: data
        ? { nickname: normalizeNickname(data.nickname), avatarPath: normalizeAvatarPath(data.avatar_path) }
        : null,
      error: null
    }
  } catch (error) {
    return { source: 'offline', profile: null, error: getErrorMessage(error) }
  }
}

async function saveProfile ({ client, online, profile }) {
  if (!online) return { source: 'offline', error: 'Supabase todavía no está configurado.' }

  try {
    const user = await ensureAnonymousUser(client)
    if (user.is_anonymous) return createGuestProfileResult()
    const payload = {
      player_id: user.id,
      nickname: normalizeNickname(profile?.nickname),
      avatar_path: normalizeAvatarPath(profile?.avatarPath)
    }
    const { error } = await client
      .from(PLAYER_PROFILE_TABLE)
      .upsert(payload, { onConflict: 'player_id' })
    if (error) throw error

    return { source: 'online', profile: { nickname: payload.nickname, avatarPath: payload.avatar_path }, error: null }
  } catch (error) {
    return { source: 'offline', error: getErrorMessage(error) }
  }
}

async function loadSettings ({ client, online }) {
  if (!online) return createSettingsResult('offline', null, 'Supabase todavía no está configurado.')

  try {
    const user = await ensureAnonymousUser(client)
    if (user.is_anonymous) return createSettingsResult('guest')
    const { data, error } = await client
      .from(PLAYER_SETTINGS_TABLE)
      .select('controls, sound_enabled, music_enabled, music_volume')
      .eq('player_id', user.id)
      .maybeSingle()
    if (error) throw error

    return createSettingsResult('online', data
      ? createUserSettings({
        controls: data.controls,
        soundEnabled: data.sound_enabled,
        musicEnabled: data.music_enabled,
        musicVolume: data.music_volume
      })
      : createUserSettings())
  } catch (error) {
    return createSettingsResult('offline', null, getErrorMessage(error))
  }
}

async function saveSettings ({ client, online, settings }) {
  if (!online) return createSettingsResult('offline', null, 'Supabase todavía no está configurado.')

  try {
    const user = await ensureAnonymousUser(client)
    if (user.is_anonymous) return createSettingsResult('guest')
    const normalized = createUserSettings(settings)
    const { error } = await client
      .from(PLAYER_SETTINGS_TABLE)
      .upsert({
        player_id: user.id,
        controls: normalized.controls,
        sound_enabled: normalized.soundEnabled,
        music_enabled: normalized.musicEnabled,
        music_volume: normalized.musicVolume
      }, { onConflict: 'player_id' })
    if (error) throw error

    return createSettingsResult('online', normalized)
  } catch (error) {
    return createSettingsResult('offline', null, getErrorMessage(error))
  }
}

function createSettingsResult (source, settings = createUserSettings(), error = null) {
  return { source, settings, error }
}

function createGuestProfileResult () {
  return {
    source: 'guest',
    profile: { nickname: GUEST_PROFILE_NICKNAME, avatarPath: null },
    error: null
  }
}

function createAccountState (status, userId, email, error, isAnonymous = true) {
  return { source: status === 'offline' ? 'offline' : 'online', status, userId, email, isAnonymous, error }
}

function normalizeAvatarPath (avatarPath) {
  return typeof avatarPath === 'string' && avatarPath.length > 0 ? avatarPath : null
}

function getDefaultRedirectTo () {
  return typeof window === 'undefined' ? undefined : window.location.origin
}

function getErrorMessage (error) {
  return error instanceof Error ? error.message : String(error?.message ?? error ?? 'Error desconocido')
}
