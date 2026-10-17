import { normalizeNickname } from '../../../src/js/leaderboard/leaderboardModel.js'
import { normalizeRunActions, replayRun } from '../../../src/js/leaderboard/runSecurity.js'
import { createAdminClient, json, options, readJson, requireUser } from '../_shared/http.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return options(request)
  if (request.method !== 'POST') return json(request, { error: 'method_not_allowed' }, 405)

  try {
    const admin = createAdminClient()
    const user = await requireUser(request, admin)
    const body = await readJson(request)
    const runId = typeof body.runId === 'string' ? body.runId : ''
    const actions = normalizeRunActions(body.actions)

    if (!runId || !actions) return json(request, { error: 'invalid_run_actions' }, 400)

    const { data: run, error: runError } = await admin
      .from('game_runs')
      .select('id, player_id, stage_id, start_level, seed, status, expires_at')
      .eq('id', runId)
      .eq('player_id', user.id)
      .maybeSingle()
    if (runError) throw runError
    if (!run) return json(request, { error: 'run_not_found' }, 404)
    if (run.status !== 'open') return json(request, { error: 'run_already_finalized' }, 409)
    if (new Date(run.expires_at).getTime() <= Date.now()) return json(request, { error: 'run_expired' }, 409)

    const replay = replayRun({
      seed: Number(run.seed),
      stageId: run.stage_id,
      startLevel: run.start_level,
      actions
    })
    if (!replay.gameOver) return json(request, { error: 'run_not_finished' }, 409)

    let profile = null
    if (!user.is_anonymous) {
      const { data, error: profileError } = await admin
        .from('player_profiles')
        .select('nickname, avatar_path')
        .eq('player_id', user.id)
        .maybeSingle()
      if (profileError) throw profileError
      profile = data
    }

    const nickname = user.is_anonymous
      ? 'Guest'
      : normalizeNickname(profile?.nickname ?? user.user_metadata?.name ?? 'Jugador')
    const avatarPath = typeof profile?.avatar_path === 'string' ? profile.avatar_path : null
    const { data: entry, error: finalizeError } = await admin.rpc('finalize_game_run', {
      p_run_id: run.id,
      p_player_id: user.id,
      p_nickname: nickname,
      p_avatar_path: avatarPath,
      p_score: replay.score,
      p_level: replay.level,
      p_lines: replay.lines,
      p_action_count: replay.actionCount
    })
    if (finalizeError) throw finalizeError

    return json(request, { entry })
  } catch {
    return json(request, { error: 'score_verification_failed' }, 500)
  }
})
