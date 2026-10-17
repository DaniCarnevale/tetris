/* global localStorage */

import { loadGuestProfile, saveGuestProfile } from './playerProfile.js'
import { createSupabaseClient, ensureAnonymousUser, getEnvironmentValue } from './supabaseClient.js'

export const AVATAR_BUCKET = 'avatars'
export const AVATAR_MAX_BYTES = 2.5 * 1024 * 1024
export const AVATAR_UPLOAD_COOLDOWN_MS = 30 * 1000
export const AVATAR_UPLOAD_STORAGE_KEY = 'tetris.avatar.last-upload'

const AVATAR_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function createAvatarService ({
  storage = getStorage(),
  profileStorage = storage,
  supabaseClient,
  supabaseUrl = getEnvironmentValue('VITE_SUPABASE_URL'),
  supabaseKey = getEnvironmentValue('VITE_SUPABASE_PUBLISHABLE_KEY') || getEnvironmentValue('VITE_SUPABASE_ANON_KEY'),
  now = () => Date.now(),
  cooldownMs = AVATAR_UPLOAD_COOLDOWN_MS
} = {}) {
  const client = supabaseClient ?? createSupabaseClient(supabaseUrl, supabaseKey)
  const online = Boolean(client && supabaseUrl && supabaseKey)

  return {
    isOnline: () => online,
    getAvatarUrl: (avatarPath) => getAvatarUrl(client, online, avatarPath),
    uploadAvatar: (file) => uploadAvatar({
      client,
      online,
      file,
      storage,
      profileStorage,
      now,
      cooldownMs
    }),
    removeAvatar: () => removeAvatar({ client, online, profileStorage })
  }
}

export function validateAvatarFile (file) {
  if (!file || typeof file.type !== 'string') {
    return { valid: false, message: 'Elegí una imagen para usar como avatar.' }
  }

  if (!AVATAR_MIME_TYPES.has(file.type)) {
    return { valid: false, message: 'Usá una imagen JPG, PNG o WebP.' }
  }

  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { valid: false, message: 'La imagen está vacía o no se pudo leer.' }
  }

  if (file.size > AVATAR_MAX_BYTES) {
    return { valid: false, message: 'La imagen no puede superar los 2,5 MB.' }
  }

  return { valid: true, message: null }
}

export function buildAvatarPath (userId) {
  if (typeof userId !== 'string' || !/^[a-zA-Z0-9-]+$/.test(userId)) return null
  return `${userId}/avatar.webp`
}

async function uploadAvatar ({ client, online, file, storage, profileStorage, now, cooldownMs }) {
  const profile = loadGuestProfile(profileStorage)
  const validation = validateAvatarFile(file)

  if (!validation.valid) return createResult('blocked', profile, validation.message)
  if (!online) return createResult('local', profile, 'Supabase todavía no está configurado.')

  const storedLastUpload = storage?.getItem(AVATAR_UPLOAD_STORAGE_KEY)
  const lastUpload = storedLastUpload === null || storedLastUpload === undefined
    ? Number.NaN
    : Number(storedLastUpload)
  const elapsed = now() - lastUpload
  if (Number.isFinite(lastUpload) && elapsed < cooldownMs) {
    const waitSeconds = Math.ceil((cooldownMs - elapsed) / 1000)
    return createResult('blocked', profile, `Esperá ${waitSeconds} segundos antes de cambiar el avatar nuevamente.`)
  }

  try {
    const user = await ensureAnonymousUser(client)
    if (user.is_anonymous) return createResult('blocked', profile, 'Vinculá Google para usar un avatar.')
    const avatarPath = buildAvatarPath(user.id)
    if (!avatarPath) throw new Error('La sesión no tiene un identificador válido.')

    const bucket = client.storage.from(AVATAR_BUCKET)
    const { error } = await bucket.upload(avatarPath, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: true
    })
    if (error) throw error

    if (profile.avatarPath && profile.avatarPath !== avatarPath) {
      const cleanup = await bucket.remove([profile.avatarPath])
      if (cleanup.error) throw cleanup.error
    }

    saveGuestProfile(profile.nickname, profileStorage, profile.id, avatarPath)
    try {
      storage?.setItem(AVATAR_UPLOAD_STORAGE_KEY, String(now()))
    } catch {
      // The server-side Storage policy remains the source of truth for rate limiting.
    }

    return {
      source: 'online',
      avatarPath,
      url: getAvatarUrl(client, online, avatarPath),
      error: null
    }
  } catch (error) {
    return createResult('local', profile, getErrorMessage(error))
  }
}

async function removeAvatar ({ client, online, profileStorage }) {
  const profile = loadGuestProfile(profileStorage)
  if (!profile.avatarPath) return createResult('local', profile, null)
  if (!online) return createResult('local', profile, 'Supabase todavía no está configurado.')

  try {
    const user = await ensureAnonymousUser(client)
    if (user.is_anonymous) return createResult('blocked', profile, 'Vinculá Google para usar un avatar.')
    const { error } = await client.storage.from(AVATAR_BUCKET).remove([profile.avatarPath])
    if (error) throw error
    saveGuestProfile(profile.nickname, profileStorage, profile.id, null)
    return { source: 'online', avatarPath: null, url: null, error: null }
  } catch (error) {
    return createResult('local', profile, getErrorMessage(error))
  }
}

function createResult (source, profile, error) {
  return {
    source,
    avatarPath: profile.avatarPath,
    url: null,
    error
  }
}

function getAvatarUrl (client, online, avatarPath) {
  if (!online || typeof avatarPath !== 'string' || avatarPath.length === 0) return null

  try {
    return client.storage.from(AVATAR_BUCKET).getPublicUrl(avatarPath).data?.publicUrl ?? null
  } catch {
    return null
  }
}

function getErrorMessage (error) {
  const message = error instanceof Error ? error.message : String(error?.message ?? error ?? 'Error desconocido')
  if (message.includes('avatar_upload_rate_limited')) {
    return 'Esperá 30 segundos antes de cambiar el avatar nuevamente.'
  }
  if (message.includes('row-level security policy')) {
    return 'No se pudo guardar el avatar. Verificá que tu cuenta de Google siga conectada.'
  }
  return message
}

function getStorage () {
  return typeof localStorage === 'undefined' ? null : localStorage
}
