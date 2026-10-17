import { createClient, type SupabaseClient, type User } from 'https://esm.sh/@supabase/supabase-js@2.118.0'

const productionOrigin = 'https://tetris2mk.netlify.app'
const allowedOrigins = new Set([
  productionOrigin,
  'http://localhost:5173',
  'http://127.0.0.1:5173'
])

export function getCorsHeaders (request: Request): Record<string, string> {
  const requestOrigin = request.headers.get('origin') ?? ''
  const configuredOrigin = Deno.env.get('TETRIS_APP_ORIGIN')
  const origin = configuredOrigin && requestOrigin === configuredOrigin
    ? configuredOrigin
    : allowedOrigins.has(requestOrigin) ? requestOrigin : productionOrigin

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  }
}

export function json (request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(request), 'Content-Type': 'application/json' }
  })
}

export function options (request: Request): Response {
  return new Response('ok', { headers: getCorsHeaders(request) })
}

export async function readJson (request: Request): Promise<Record<string, unknown>> {
  const body = await request.json()
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('invalid_json')
  return body as Record<string, unknown>
}

export function createAdminClient (): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceRoleKey) throw new Error('supabase_admin_not_configured')

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

export async function requireUser (request: Request, admin: SupabaseClient): Promise<User> {
  const authorization = request.headers.get('authorization') ?? ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!token) throw new Error('missing_authorization')

  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) throw new Error('invalid_authorization')
  return data.user
}
