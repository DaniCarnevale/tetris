import { STAGES } from '../../../src/js/game/stages.js'
import { createAdminClient, json, options, readJson, requireUser } from '../_shared/http.ts'

const MAX_RUNS_PER_HOUR = 20
const RUN_TTL_MINUTES = 45
const STAGE_IDS = new Set(STAGES.map((stage) => stage.id))

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return options(request)
  if (request.method !== 'POST') return json(request, { error: 'method_not_allowed' }, 405)

  try {
    const admin = createAdminClient()
    const user = await requireUser(request, admin)
    const body = await readJson(request)
    const stageId = typeof body.stageId === 'string' ? body.stageId : ''
    const startLevel = body.startLevel

    if (!STAGE_IDS.has(stageId) || !Number.isInteger(startLevel) || startLevel < 1 || startLevel > 10) {
      return json(request, { error: 'invalid_run_configuration' }, 400)
    }

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count, error: countError } = await admin
      .from('game_runs')
      .select('id', { count: 'exact', head: true })
      .eq('player_id', user.id)
      .gte('created_at', since)
    if (countError) throw countError
    if ((count ?? 0) >= MAX_RUNS_PER_HOUR) {
      return json(request, { error: 'run_rate_limited' }, 429)
    }

    const now = new Date()
    const expiresAt = new Date(now.getTime() + RUN_TTL_MINUTES * 60 * 1000).toISOString()
    const seed = crypto.getRandomValues(new Uint32Array(1))[0]

    const { error: abandonError } = await admin
      .from('game_runs')
      .update({ status: 'abandoned', finished_at: now.toISOString() })
      .eq('player_id', user.id)
      .eq('status', 'open')
    if (abandonError) throw abandonError

    const { data, error } = await admin
      .from('game_runs')
      .insert({
        player_id: user.id,
        stage_id: stageId,
        start_level: startLevel,
        seed,
        expires_at: expiresAt
      })
      .select('id, seed, expires_at')
      .single()
    if (error) throw error

    return json(request, { runId: data.id, seed: Number(data.seed), expiresAt: data.expires_at })
  } catch {
    return json(request, { error: 'run_start_failed' }, 500)
  }
})
