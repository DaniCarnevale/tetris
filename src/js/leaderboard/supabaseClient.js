import { createClient } from '@supabase/supabase-js'

export function createSupabaseClient (url = getEnvironmentValue('VITE_SUPABASE_URL'), key = getEnvironmentValue('VITE_SUPABASE_PUBLISHABLE_KEY') || getEnvironmentValue('VITE_SUPABASE_ANON_KEY')) {
  if (!url || !key) return null

  try {
    return createClient(url, key)
  } catch {
    return null
  }
}

export async function ensureAnonymousUser (client) {
  const { data: sessionData, error: sessionError } = await client.auth.getSession()
  if (sessionError) throw sessionError
  if (sessionData?.session?.user) return sessionData.session.user

  const { data, error } = await client.auth.signInAnonymously()
  if (error) throw error
  if (!data?.user) throw new Error('No se pudo crear la sesión invitada.')
  return data.user
}

export function getEnvironmentValue (name) {
  const environment = typeof import.meta.env === 'object' ? import.meta.env : {}
  return environment[name]
}
