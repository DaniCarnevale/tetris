import { STAGES } from '../../../src/js/game/stages.js'
import { createAdminClient, json, options, readJson, requireUser } from '../_shared/http.ts'

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

    const seed = crypto.getRandomValues(new Uint32Array(1))[0]

    const { data, error } = await admin.rpc('start_game_run', {
      p_player_id: user.id,
      p_stage_id: stageId,
      p_start_level: startLevel,
      p_seed: seed
    })
    if (error?.message === 'run_rate_limited') {
      return json(request, { error: 'run_rate_limited' }, 429)
    }
    if (error) throw error
    if (!data?.runId || !Number.isInteger(Number(data.seed))) throw new Error('invalid_run_response')

    return json(request, { runId: data.runId, seed: Number(data.seed), expiresAt: data.expiresAt })
  } catch {
    return json(request, { error: 'run_start_failed' }, 500)
  }
})
