/* global URL, document, localStorage, performance, window */

import { BLOCK_SIZE, BOARD_HEIGHT, BOARD_WIDTH } from './config/config.js'
import { getCurrentLevel } from './managers/levelManager.js'
import { levels } from './utils/levels.js'
import { hasCollision } from './game/board.js'
import { clonePiece } from './game/pieces.js'
import { createGame, holdActivePiece, moveActivePiece, rotateActivePiece, togglePause } from './game/engine.js'
import { canReturnToStartScreen, GAME_OVER_ANIMATION_MS, getGameOverSummary } from './game/gameFlow.js'
import { shouldAutoPause } from './game/focusPause.js'
import { getBackdropForLevel, getStage, STAGES } from './game/stages.js'
import { createLineClearAnimation, getLineClearProgress, isLineClearAnimationActive } from './game/lineClearAnimation.js'
import { getGameLayoutMode, getGameViewportState, getPieceStatsLayout } from './game/layout.js'
import { getPieceStatsView } from './game/pieceStats.js'
import { getLevelLedFeedback } from './game/levelLed.js'
import { createSoundManager } from './audio/soundManager.js'
import { createLeaderboardService } from './leaderboard/leaderboardService.js'
import { createAvatarService, validateAvatarFile } from './leaderboard/avatarService.js'
import { canEditProfile, createAccountService, GUEST_PROFILE_NICKNAME } from './leaderboard/accountService.js'
import { createSupabaseClient } from './leaderboard/supabaseClient.js'
import { createSeededRandom } from './leaderboard/runSecurity.js'
import {
  consumeProfileSetupPending,
  createProfileCardModel,
  hasProfileChanges,
  markProfileSetupPending
} from './leaderboard/profilePresentation.js'
import { createProfileAccessModel } from './leaderboard/profileView.js'
import {
  createUserSettings,
  readStoredSettings,
  serializeUserSettings,
  USER_SETTINGS_STORAGE_KEY
} from './settings/settingsModel.js'
import {
  createControls,
  findActionByCode,
  getKeyLabel,
  readStoredControls,
  updateControl
} from './input/controls.js'
import { createInputBuffer, drainInputActions, enqueueInputAction, getHeldInputAction, releaseInputAction } from './input/inputState.js'
import buenosAiresArt from '../assets/backgrounds/buenos-aires.svg'
import rosarioArt from '../assets/backgrounds/rosario.svg'
import humahuacaArt from '../assets/backgrounds/humahuaca.svg'
import saltaArt from '../assets/backgrounds/salta.svg'
import cordobaArt from '../assets/backgrounds/cordoba.svg'
import iguazuArt from '../assets/backgrounds/iguazu.svg'
import mendozaArt from '../assets/backgrounds/mendoza.svg'
import marDelPlataArt from '../assets/backgrounds/mar-del-plata.svg'
import patagoniaArt from '../assets/backgrounds/patagonia.svg'
import peritoMorenoArt from '../assets/backgrounds/perito-moreno.svg'
import '../styles/style.css'

const CONTROLS_STORAGE_KEY = 'tetris.controls'
const SOUND_STORAGE_KEY = 'tetris.sound.enabled'
const HORIZONTAL_REPEAT_MS = 72
const SCORE_FORMATTER = new Intl.NumberFormat('es-AR')
const ACTION_LABELS = {
  moveLeft: 'mover a la izquierda',
  moveRight: 'mover a la derecha',
  softDrop: 'bajar rápido',
  rotate: 'rotar',
  hold: 'guardar la ficha',
  pause: 'pausar la partida',
  restart: 'reiniciar la partida'
}
const GAME_INPUT_ACTIONS = {
  moveLeft: 'left',
  moveRight: 'right',
  softDrop: 'down',
  rotate: 'rotate',
  hold: 'hold',
  pause: 'pause',
  restart: 'restart'
}
const BACKGROUND_ART = {
  'buenos-aires': buenosAiresArt,
  rosario: rosarioArt,
  humahuaca: humahuacaArt,
  salta: saltaArt,
  cordoba: cordobaArt,
  iguazu: iguazuArt,
  mendoza: mendozaArt,
  'mar-del-plata': marDelPlataArt,
  patagonia: patagoniaArt,
  'perito-moreno': peritoMorenoArt
}
const SCENE_COPY = {
  'buenos-aires': {
    label: 'Buenos Aires',
    description: 'Velocidad baja.'
  },
  rosario: {
    label: 'Rosario',
    description: 'Ritmo urbano.'
  },
  humahuaca: {
    label: 'Quebrada de Humahuaca',
    description: 'Color de montaña.'
  },
  salta: {
    label: 'Salta',
    description: 'Atardecer dorado.'
  },
  cordoba: {
    label: 'Córdoba serrana',
    description: 'Pulso serrano.'
  },
  iguazu: {
    label: 'Cataratas del Iguazú',
    description: 'Energía tropical.'
  },
  mendoza: {
    label: 'Mendoza y los Andes',
    description: 'Aire de cordillera.'
  },
  'mar-del-plata': {
    label: 'Mar del Plata',
    description: 'Marea rápida.'
  },
  patagonia: {
    label: 'Patagonia nocturna',
    description: 'Horizonte extremo.'
  },
  'perito-moreno': {
    label: 'Glaciar Perito Moreno',
    description: 'Desafío final.'
  }
}

const startScreen = document.querySelector('#startScreen')
const gameScreen = document.querySelector('#gameScreen')
const startLevelSelect = document.querySelector('#startLevel')
const stageSelector = document.querySelector('#stageSelector')
const startSceneLabel = document.querySelector('#startSceneLabel')
const startSceneDescription = document.querySelector('#startSceneDescription')
const startHint = document.querySelector('#startHint')
const startGameButton = document.querySelector('#startGameButton')
const startGameButtonLabel = document.querySelector('#startGameButtonLabel')
const startSettingsButton = document.querySelector('#startSettingsButton')
const leaderboardButton = document.querySelector('#leaderboardButton')
const profileAccessButton = document.querySelector('#profileAccessButton')
const startProfileAvatarImage = document.querySelector('#startProfileAvatarImage')
const startProfileInitials = document.querySelector('#startProfileInitials')
const startProfileName = document.querySelector('#startProfileName')
const startProfileStatus = document.querySelector('#startProfileStatus')
const playerNickname = document.querySelector('#playerNickname')
const avatarInput = document.querySelector('#avatarInput')
const avatarUploadButton = document.querySelector('#avatarUploadButton')
const avatarPreviewImage = document.querySelector('#avatarPreviewImage')
const avatarInitials = document.querySelector('#avatarInitials')
const avatarRemoveButton = document.querySelector('#avatarRemoveButton')
const avatarFeedback = document.querySelector('#avatarFeedback')
const accountStatus = document.querySelector('#accountStatus')
const accountHint = document.querySelector('#accountHint')
const accountFeedback = document.querySelector('#accountFeedback')
const googleSignInButton = document.querySelector('#googleSignInButton')
const googleSignInLabel = document.querySelector('#googleSignInLabel')
const accountSignOutButton = document.querySelector('#accountSignOutButton')
const saveProfileButton = document.querySelector('#saveProfileButton')
const profileSetupSection = document.querySelector('#profileSetupSection')
const profileSetupPrompt = document.querySelector('#profileSetupPrompt')
const profileSetupPromptText = document.querySelector('#profileSetupPromptText')
const stageArt = document.querySelector('#stageArt')
const boardCanvas = document.querySelector('#board')
const nextCanvas = document.querySelector('.next')
const savedCanvas = document.querySelector('.saved')
const scoreElement = document.querySelector('#score')
const levelElement = document.querySelector('#level')
const levelProgressElement = document.querySelector('#levelProgress')
const statsCard = document.querySelector('.stats-card')
const levelLedTargets = [boardCanvas, statsCard]
const statusElement = document.querySelector('#status')
const stateDot = document.querySelector('#stateDot')
const heldEmpty = document.querySelector('#heldEmpty')
const holdKey = document.querySelector('#holdKey')
const pauseOverlay = document.querySelector('#pauseOverlay')
const resumeButton = document.querySelector('#resumeButton')
const gameOverOverlay = document.querySelector('#gameOverOverlay')
const gameOverDialog = document.querySelector('.game-over-dialog')
const gameOverSummary = document.querySelector('#gameOverSummary')
const gameOverSaveStatus = document.querySelector('#gameOverSaveStatus')
const gameOverLeaderboardButton = document.querySelector('#gameOverLeaderboardButton')
const gameLeaderboardButton = document.querySelector('#gameLeaderboardButton')
const leaderboardBackdrop = document.querySelector('#leaderboardBackdrop')
const leaderboardPanel = document.querySelector('#leaderboardPanel')
const leaderboardClose = document.querySelector('#leaderboardClose')
const leaderboardTitle = document.querySelector('#leaderboardTitle')
const leaderboardStatus = document.querySelector('#leaderboardStatus')
const leaderboardList = document.querySelector('#leaderboardList')
const leaderboardRefresh = document.querySelector('#leaderboardRefresh')
const leaderboardStage = document.querySelector('#leaderboardStage')
const leaderboardStartLevel = document.querySelector('#leaderboardStartLevel')
const settingsToggle = document.querySelector('#settingsToggle')
const openSettingsLink = document.querySelector('#openSettingsLink')
const settingsClose = document.querySelector('#settingsClose')
const settingsBackdrop = document.querySelector('#settingsBackdrop')
const settingsPanel = document.querySelector('#settingsPanel')
const settingsFeedback = document.querySelector('#settingsFeedback')
const resetControlsButton = document.querySelector('#resetControls')
const soundToggle = document.querySelector('#soundToggle')
const soundToggleLabel = document.querySelector('#soundToggleLabel')
const musicToggle = document.querySelector('#musicToggle')
const musicToggleLabel = document.querySelector('#musicToggleLabel')
const musicVolumeInput = document.querySelector('#musicVolume')
const musicVolumeLabel = document.querySelector('#musicVolumeLabel')
const softDropMultiplierInput = document.querySelector('#softDropMultiplier')
const gameProfile = document.querySelector('#gameProfile')
const gameProfileAvatarImage = document.querySelector('#gameProfileAvatarImage')
const gameProfileInitials = document.querySelector('#gameProfileInitials')
const gameProfileNickname = document.querySelector('#gameProfileNickname')
const gameProfileAccount = document.querySelector('#gameProfileAccount')
const gameProfileMenu = document.querySelector('#gameProfileMenu')
const profileMenuProfile = document.querySelector('#profileMenuProfile')
const recordScoreElement = document.querySelector('#recordScore')
const recordStageLabel = document.querySelector('#recordStageLabel')
const pieceStatsTotal = document.querySelector('#pieceStatsTotal')
const pieceStatsList = document.querySelector('#pieceStatsList')
const profileBackdrop = document.querySelector('#profileBackdrop')
const profilePanel = document.querySelector('#profilePanel')
const profileClose = document.querySelector('#profileClose')
const profileIntro = document.querySelector('#profileIntro')
const boardContext = boardCanvas.getContext('2d')
const nextContext = nextCanvas.getContext('2d')
const savedContext = savedCanvas.getContext('2d')
const soundManager = createSoundManager()
const supabaseClient = createSupabaseClient()
const leaderboardService = createLeaderboardService({ supabaseClient })
const avatarService = createAvatarService({ supabaseClient })
const accountService = createAccountService({ supabaseClient })

// Warm the auth session while the start screen is visible so starting a game
// only waits for the authoritative run creation, not for guest sign-in too.
leaderboardService.prepareSession().catch(() => {})

boardCanvas.width = BLOCK_SIZE * BOARD_WIDTH
boardCanvas.height = BLOCK_SIZE * BOARD_HEIGHT
boardContext.scale(BLOCK_SIZE, BLOCK_SIZE)

nextCanvas.width = BLOCK_SIZE * 4
nextCanvas.height = BLOCK_SIZE * 4
nextContext.scale(BLOCK_SIZE, BLOCK_SIZE)

savedCanvas.width = BLOCK_SIZE * 4
savedCanvas.height = BLOCK_SIZE * 4
savedContext.scale(BLOCK_SIZE, BLOCK_SIZE)

let game = createGame()
let userSettings = loadUserSettings()
let controls = userSettings.controls
let selectedStage = 'fresh'
let gameStarted = false
let dropCounter = 0
let horizontalRepeatCounter = 0
let lastTime = 0
const inputBuffer = createInputBuffer()
let listeningAction = null
let lastRenderedLevel = 0
let gameOverAnimationFinished = false
let gameOverTimer = null
let lineClearAnimation = null
let leaderboardSaveRequest = 0
let leaderboardRefreshRequest = 0
let stageRecordRequest = 0
let leaderboardUnsubscribe = () => {}
let temporaryAvatarPreviewUrl = null
let profileEditingEnabled = false
let currentAccount = { status: 'guest', isAnonymous: true }
let persistedProfile = null
let lastRenderedPieceStats = ''
let levelLedTimer = null
let activeRun = null
let runActions = []
let runStartRequest = 0

function syncGameViewport () {
  const viewport = window.visualViewport
  const width = viewport?.width ?? window.innerWidth
  const height = viewport?.height ?? window.innerHeight
  const viewportState = getGameViewportState(gameStarted)
  const pieceStatsLayout = getPieceStatsLayout({ width, height })

  document.body.classList.toggle('is-game-active', viewportState.isGameActive)
  document.body.dataset.gameLayout = getGameLayoutMode({ width, height })
  document.body.dataset.pieceStatsOrientation = pieceStatsLayout.orientation
  document.body.dataset.pieceStatsLabels = pieceStatsLayout.showLongLabels ? 'long' : 'short'
}

function loadUserSettings () {
  try {
    const storedSettings = localStorage.getItem(USER_SETTINGS_STORAGE_KEY)
    if (storedSettings) return readStoredSettings(storedSettings)

    return createUserSettings({
      controls: readStoredControls(localStorage.getItem(CONTROLS_STORAGE_KEY)),
      soundEnabled: localStorage.getItem(SOUND_STORAGE_KEY) !== 'false'
    })
  } catch {
    return createUserSettings()
  }
}

function getCurrentSettings () {
  return createUserSettings({
    ...userSettings,
    controls,
    soundEnabled: soundManager.isEnabled(),
    musicEnabled: soundManager.isMusicEnabled(),
    musicVolume: soundManager.getMusicVolume()
  })
}

function persistUserSettings () {
  userSettings = getCurrentSettings()
  try {
    localStorage.setItem(USER_SETTINGS_STORAGE_KEY, serializeUserSettings(userSettings))
  } catch {
    showSettingsFeedback('No se pudo guardar la configuración en este navegador.', true)
  }

  if (canEditProfile(currentAccount)) {
    accountService.saveSettings(userSettings).then((result) => {
      if (result.source !== 'online') showSettingsFeedback(result.error ?? 'No se pudo sincronizar tu configuración.', true)
    }).catch(() => {
      showSettingsFeedback('No se pudo sincronizar tu configuración.', true)
    })
  }
}

function applyUserSettings (settings) {
  userSettings = createUserSettings(settings)
  controls = userSettings.controls
  soundManager.setEnabled(userSettings.soundEnabled)
  soundManager.setMusicEnabled(userSettings.musicEnabled)
  soundManager.setMusicVolume(userSettings.musicVolume)
  renderSoftDropSettings()
  renderSoundToggle()
  renderMusicSettings()
  renderControlLabels()
}

function saveControls () {
  persistUserSettings()
}

function saveSoundSetting () {
  persistUserSettings()
}

function renderMusicSettings () {
  const enabled = soundManager.isMusicEnabled()
  const volume = Math.round(soundManager.getMusicVolume() * 100)
  musicToggle.classList.toggle('is-on', enabled)
  musicToggle.setAttribute('aria-pressed', String(enabled))
  musicToggleLabel.textContent = enabled ? 'Activada' : 'Silenciada'
  musicVolumeInput.value = String(volume)
  musicVolumeLabel.textContent = `${volume}%`
}

function saveMusicSetting () {
  persistUserSettings()
}

function renderSoftDropSettings () {
  softDropMultiplierInput.value = String(userSettings.softDropMultiplier)
}

function saveSoftDropSetting () {
  userSettings = createUserSettings({
    ...getCurrentSettings(),
    softDropMultiplier: Number(softDropMultiplierInput.value)
  })
  persistUserSettings()
  renderSoftDropSettings()
}

function hexToRgb (hex) {
  const normalized = hex.replace('#', '')
  const value = normalized.length === 3
    ? normalized.split('').map((character) => character + character).join('')
    : normalized

  return {
    red: parseInt(value.slice(0, 2), 16),
    green: parseInt(value.slice(2, 4), 16),
    blue: parseInt(value.slice(4, 6), 16)
  }
}

function shadeColor (color, amount) {
  const { red, green, blue } = hexToRgb(color)
  const target = amount > 0 ? 255 : 0
  const strength = Math.abs(amount)
  const shade = (channel) => Math.round(channel + (target - channel) * strength)
  return `rgb(${shade(red)}, ${shade(green)}, ${shade(blue)})`
}

function drawRoundedCell (context, x, y, color, { ghost = false, glow = false } = {}) {
  const inset = 0.065
  const size = 0.87

  context.save()
  context.beginPath()
  context.roundRect(x + inset, y + inset, size, size, 0.13)

  if (ghost) {
    context.globalAlpha = 0.32
    context.strokeStyle = color
    context.lineWidth = 0.06
    context.stroke()
    context.restore()
    return
  }

  if (glow) {
    context.shadowBlur = 0.28
    context.shadowColor = color
  }

  const gradient = context.createLinearGradient(x, y, x + 0.8, y + 0.9)
  gradient.addColorStop(0, shadeColor(color, 0.42))
  gradient.addColorStop(0.48, color)
  gradient.addColorStop(1, shadeColor(color, -0.34))
  context.fillStyle = gradient
  context.fill()
  context.shadowBlur = 0

  context.strokeStyle = shadeColor(color, -0.42)
  context.lineWidth = 0.045
  context.stroke()

  context.globalAlpha = 0.42
  context.fillStyle = '#ffffff'
  context.fillRect(x + 0.18, y + 0.16, 0.42, 0.055)
  context.fillRect(x + 0.18, y + 0.16, 0.055, 0.33)
  context.restore()
}

function drawBoardGrid () {
  const boardBackground = boardContext.createLinearGradient(0, 0, 0, BOARD_HEIGHT)
  boardBackground.addColorStop(0, '#0c1527')
  boardBackground.addColorStop(0.52, '#080f1d')
  boardBackground.addColorStop(1, '#070b15')
  boardContext.fillStyle = boardBackground
  boardContext.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT)
  boardContext.lineWidth = 0.025

  for (let x = 0; x <= BOARD_WIDTH; x += 1) {
    boardContext.strokeStyle = 'rgba(148, 163, 184, 0.035)'
    boardContext.beginPath()
    boardContext.moveTo(x, 0)
    boardContext.lineTo(x, BOARD_HEIGHT)
    boardContext.stroke()
  }

  for (let y = 0; y <= BOARD_HEIGHT; y += 1) {
    boardContext.strokeStyle = 'rgba(148, 163, 184, 0.022)'
    boardContext.beginPath()
    boardContext.moveTo(0, y)
    boardContext.lineTo(BOARD_WIDTH, y)
    boardContext.stroke()
  }
}

function drawPiecePreview (context, piece) {
  context.fillStyle = '#0a0f1c'
  context.fillRect(0, 0, 4, 4)

  if (!piece) return

  const height = piece.shape.length
  const width = piece.shape[0].length
  const offsetX = (4 - width) / 2
  const offsetY = (4 - height) / 2

  piece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) drawRoundedCell(context, x + offsetX, y + offsetY, piece.color, { glow: true })
    })
  })
}

function getGhostPiece () {
  const ghost = clonePiece(game.activePiece)

  while (true) {
    ghost.position.y++
    if (hasCollision(ghost, game.board)) {
      ghost.position.y--
      return ghost
    }
  }
}

function drawLineClearAnimation () {
  if (!lineClearAnimation) return

  const now = performance.now()
  const progress = getLineClearProgress(lineClearAnimation, now)

  if (!isLineClearAnimationActive(lineClearAnimation, now)) {
    lineClearAnimation = null
    boardCanvas.classList.remove('is-line-clearing')
    return
  }

  const collapse = 1 - Math.pow(1 - progress, 3)
  const flash = Math.sin(progress * Math.PI)

  boardContext.save()
  lineClearAnimation.rows.forEach(({ y, cells }, rowIndex) => {
    const beam = boardContext.createLinearGradient(0, y, BOARD_WIDTH, y)
    beam.addColorStop(0, 'rgba(113, 183, 255, 0)')
    beam.addColorStop(0.5, `rgba(213, 247, 255, ${0.2 + flash * 0.45})`)
    beam.addColorStop(1, 'rgba(113, 183, 255, 0)')
    boardContext.globalAlpha = 0.7
    boardContext.fillStyle = beam
    boardContext.fillRect(0, y, BOARD_WIDTH, 1)

    cells.forEach((color, x) => {
      if (color === null) return

      const scale = Math.max(0.16, 1 - collapse * 0.84)
      const driftDirection = x % 2 === 0 ? -1 : 1
      const drift = driftDirection * collapse * (0.14 + (x % 3) * 0.04)
      const rise = collapse * (0.12 + ((x + rowIndex) % 4) * 0.04)

      boardContext.save()
      boardContext.globalAlpha = 1 - progress
      boardContext.translate(x + 0.5 + drift, y + 0.5 - rise)
      boardContext.scale(scale, scale)
      boardContext.translate(-0.5, -0.5)
      drawRoundedCell(boardContext, 0, 0, color, { glow: true })
      boardContext.restore()
    })
  })
  boardContext.restore()
  boardCanvas.classList.add('is-line-clearing')
}

function drawBoard () {
  drawBoardGrid()

  game.board.forEach((row, y) => {
    row.forEach((color, x) => {
      if (color !== null) drawRoundedCell(boardContext, x, y, color)
    })
  })

  const ghostPiece = getGhostPiece()
  ghostPiece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) drawRoundedCell(boardContext, x + ghostPiece.position.x, y + ghostPiece.position.y, ghostPiece.color, { ghost: true })
    })
  })

  game.activePiece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) drawRoundedCell(boardContext, x + game.activePiece.position.x, y + game.activePiece.position.y, game.activePiece.color, { glow: true })
    })
  })

  drawLineClearAnimation()
}

function renderStagePicker () {
  stageSelector.replaceChildren()

  STAGES.forEach((stage, index) => {
    const button = document.createElement('button')
    const icon = document.createElement('span')
    const copy = document.createElement('span')
    const title = document.createElement('strong')
    const description = document.createElement('small')

    button.type = 'button'
    button.className = 'stage-option'
    button.dataset.stageId = stage.id
    button.setAttribute('aria-pressed', String(stage.id === selectedStage))
    icon.className = `stage-option-icon stage-icon-${index + 1}`
    icon.setAttribute('aria-hidden', 'true')
    copy.className = 'stage-option-copy'
    title.textContent = stage.name
    description.textContent = stage.description
    copy.append(title, description)
    button.append(icon, copy)
    button.addEventListener('click', () => selectStage(stage.id))
    stageSelector.append(button)
  })
}

function selectStage (stageId) {
  selectedStage = getStage(stageId).id
  document.querySelectorAll('[data-stage-id]').forEach((button) => {
    button.classList.toggle('is-selected', button.dataset.stageId === selectedStage)
    button.setAttribute('aria-pressed', String(button.dataset.stageId === selectedStage))
  })
  updateStartScene()
  refreshStageRecord(selectedStage)
}

function updateStageArt (level) {
  const backdrop = getBackdropForLevel(level)
  const scene = SCENE_COPY[backdrop.id]
  const nextArt = BACKGROUND_ART[backdrop.id]

  if (stageArt.src !== nextArt) {
    stageArt.classList.remove('is-visible')
    stageArt.src = nextArt
    stageArt.onload = () => stageArt.classList.add('is-visible')
  }

  document.body.dataset.stage = backdrop.id
  return { backdrop, scene }
}

function updateStartScene () {
  const level = Number(startLevelSelect.value)
  const { scene } = updateStageArt(level)
  const stage = getStage(selectedStage)
  startSceneLabel.textContent = `${scene.label} · Nivel ${level}`
  startSceneDescription.textContent = `${scene.description} ${stage.name}.`
}

async function refreshStageRecord (stageId = selectedStage) {
  const requestId = ++stageRecordRequest
  const stage = getStage(stageId)
  recordStageLabel.textContent = `Récord · ${stage.name}`
  recordScoreElement.textContent = '—'

  try {
    const result = await leaderboardService.getLeaderboard({ stageId, limit: 1 })
    if (requestId !== stageRecordRequest || stageId !== selectedStage) return

    const bestScore = result.entries[0]?.score
    recordScoreElement.textContent = bestScore === undefined ? '—' : SCORE_FORMATTER.format(bestScore)
  } catch {
    if (requestId === stageRecordRequest) recordScoreElement.textContent = '—'
  }
}

function getEffectiveScore (score, startLevel) {
  return score + (startLevel - 1) * 1000
}

function updateLevelProgress () {
  const currentLevel = getCurrentLevel(game.score, game.startLevel)
  const effectiveScore = getEffectiveScore(game.score, game.startLevel)
  const nextLevel = levels.find((level) => level.limit > effectiveScore)
  const progress = nextLevel
    ? ((effectiveScore - currentLevel.limit) / (nextLevel.limit - currentLevel.limit)) * 100
    : 100

  levelProgressElement.style.width = `${Math.max(0, Math.min(progress, 100))}%`
}

function clearLevelLedFeedback () {
  if (levelLedTimer !== null) window.clearTimeout(levelLedTimer)
  levelLedTimer = null

  levelLedTargets.forEach((target) => {
    target.classList.remove('is-level-led', 'is-level-led-accent', 'is-level-led-danger', 'is-level-led-pulse', 'is-level-led-steady')
    target.style.removeProperty('--level-led-pulse-duration')
  })
}

function updateLevelLedFeedback (level, { celebrate = false } = {}) {
  clearLevelLedFeedback()
  const feedback = getLevelLedFeedback(level)

  if (!feedback.persistent && !celebrate) return

  levelLedTargets.forEach((target) => {
    target.classList.add('is-level-led', `is-level-led-${feedback.tone}`, `is-level-led-${feedback.mode}`)
    if (feedback.pulseDurationMs) target.style.setProperty('--level-led-pulse-duration', `${feedback.pulseDurationMs}ms`)
  })

  if (!feedback.persistent) {
    levelLedTimer = window.setTimeout(clearLevelLedFeedback, feedback.activeDurationMs)
  }
}

function updateHud () {
  const currentLevel = getCurrentLevel(game.score, game.startLevel)
  const isPaused = game.paused && !game.gameOver
  scoreElement.textContent = game.score
  levelElement.textContent = currentLevel.level
  stateDot.classList.toggle('game-over', game.gameOver)
  stateDot.classList.toggle('is-paused', isPaused)
  const stateCopy = game.gameOver ? 'Partida terminada' : isPaused ? 'En pausa' : 'En partida'
  statusElement.textContent = stateCopy
  holdKey.textContent = getKeyLabel(controls.hold)
  pauseOverlay.hidden = !isPaused
  heldEmpty.hidden = Boolean(game.heldPiece)
  updateLevelProgress()
  renderPieceStats()

  if (lastRenderedLevel !== currentLevel.level) {
    const celebrateLevelUp = lastRenderedLevel > 0
    lastRenderedLevel = currentLevel.level
    updateStageArt(currentLevel.level)
    updateLevelLedFeedback(currentLevel.level, { celebrate: celebrateLevelUp })
  }
}

function renderPieceStats () {
  const view = getPieceStatsView(game.pieceStats)
  const statsKey = view.rows.map((row) => row.count).join(',')
  if (statsKey === lastRenderedPieceStats) return

  lastRenderedPieceStats = statsKey
  pieceStatsTotal.textContent = `${view.total} ${view.total === 1 ? 'ficha' : 'fichas'}`
  pieceStatsList.replaceChildren()

  view.rows.forEach((row) => {
    const item = document.createElement('div')
    const thumbnail = document.createElement('span')
    const count = document.createElement('strong')
    const track = document.createElement('div')
    const fill = document.createElement('span')
    const meter = document.createElement('div')
    const axis = document.createElement('span')
    const glyph = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const glyphPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')

    item.className = 'piece-stat-row'
    thumbnail.className = 'piece-stat-thumbnail'
    count.className = 'piece-stat-count'
    track.className = 'piece-stat-track'
    fill.className = 'piece-stat-fill'
    meter.className = 'piece-stat-meter'
    axis.className = 'piece-stat-axis'
    glyph.classList.add('piece-stat-glyph')
    glyphPath.classList.add('piece-stat-glyph-path')
    glyph.setAttribute('viewBox', `0 0 ${row.shape[0].length} ${row.shape.length}`)
    glyph.setAttribute('width', String(row.shape[0].length * 8))
    glyph.setAttribute('height', String(row.shape.length * 8))
    glyph.setAttribute('aria-hidden', 'true')
    glyphPath.setAttribute('d', row.glyphPath)
    glyphPath.setAttribute('fill', row.color)
    thumbnail.setAttribute('role', 'img')
    thumbnail.setAttribute('aria-label', row.label)
    fill.style.height = `${row.height}%`
    fill.style.backgroundColor = row.color
    count.textContent = String(row.count)
    track.setAttribute('role', 'progressbar')
    track.setAttribute('aria-label', `${row.label}: ${row.count}`)
    track.setAttribute('aria-valuemin', '0')
    track.setAttribute('aria-valuemax', String(view.max))
    track.setAttribute('aria-valuenow', String(row.count))
    axis.setAttribute('aria-hidden', 'true')

    glyph.append(glyphPath)
    thumbnail.append(glyph)
    track.append(fill)
    meter.append(count, track)
    item.append(meter, axis, thumbnail)
    pieceStatsList.append(item)
  })
}

function renderControlLabels () {
  document.querySelectorAll('[data-control-label]').forEach((element) => {
    const action = element.dataset.controlLabel
    element.textContent = getKeyLabel(controls[action])
  })

  document.querySelectorAll('[data-binding]').forEach((button) => {
    const action = button.dataset.binding
    const label = button.querySelector('[data-control-label]')
    const helper = button.querySelector('span')
    const isListening = listeningAction === action
    button.classList.toggle('is-listening', isListening)
    label.textContent = isListening ? '...' : getKeyLabel(controls[action])
    helper.textContent = isListening ? 'Esc cancela' : 'Editar'
  })
}

function renderSoundToggle () {
  const enabled = soundManager.isEnabled()
  soundToggle.classList.toggle('is-on', enabled)
  soundToggle.setAttribute('aria-pressed', String(enabled))
  soundToggleLabel.textContent = enabled ? 'Activado' : 'Silenciado'
}

function showSettingsFeedback (message, isError = false) {
  settingsFeedback.textContent = message
  settingsFeedback.classList.toggle('is-error', isError)
}

function getProfileDraft () {
  const profile = leaderboardService.getProfile()
  return {
    nickname: playerNickname.value,
    avatarPath: profile.avatarPath
  }
}

function updateProfileSaveState () {
  const hasChanges = profileEditingEnabled && persistedProfile !== null && hasProfileChanges(getProfileDraft(), persistedProfile)
  saveProfileButton.hidden = !hasChanges
  saveProfileButton.disabled = !hasChanges
  saveProfileButton.setAttribute('aria-hidden', String(!hasChanges))
}

async function saveProfileChanges () {
  if (!profileEditingEnabled) return setGuestProfile()

  saveProfileButton.disabled = true
  accountFeedback.classList.remove('is-error')
  accountFeedback.textContent = 'Guardando cambios...'

  const profile = leaderboardService.setNickname(playerNickname.value)
  playerNickname.value = profile.nickname
  const result = await accountService.saveProfile(profile)

  if (result.source === 'online') {
    persistedProfile = { ...profile }
    accountFeedback.textContent = 'Cambios guardados.'
    refreshLeaderboardIfOpen()
  } else {
    accountFeedback.classList.add('is-error')
    accountFeedback.textContent = result.error ?? 'No se pudieron guardar los cambios.'
  }

  renderGameProfile(profile, 'Google conectado')
  renderStartProfileAccess(profile, currentAccount)
  updateProfileSaveState()
  return profile
}

function getInitials (nickname) {
  const words = String(nickname ?? 'Jugador').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'JU'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
}

function setProfileEditingEnabled (enabled) {
  profileEditingEnabled = enabled
  playerNickname.disabled = !enabled
  avatarInput.disabled = !enabled
  avatarRemoveButton.disabled = !enabled
  avatarUploadButton.classList.toggle('is-disabled', !enabled)
  avatarUploadButton.setAttribute('aria-disabled', String(!enabled))
  updateProfileSaveState()
}

function setGuestProfile () {
  const profile = leaderboardService.setProfile({
    nickname: GUEST_PROFILE_NICKNAME,
    avatarPath: null
  })
  playerNickname.value = profile.nickname
  persistedProfile = { ...profile }
  renderProfileAvatar(profile)
  updateProfileSaveState()
  return profile
}

function clearTemporaryAvatarPreview () {
  if (temporaryAvatarPreviewUrl !== null) URL.revokeObjectURL(temporaryAvatarPreviewUrl)
  temporaryAvatarPreviewUrl = null
}

function renderGameProfile (profile = leaderboardService.getProfile(), accountLabel = null) {
  const model = createProfileCardModel(
    profile,
    accountLabel ?? (profileEditingEnabled ? 'Google conectado' : 'Invitado')
  )
  const avatarUrl = avatarService.getAvatarUrl(model.avatarPath)

  gameProfileAvatarImage.hidden = !avatarUrl
  gameProfileAvatarImage.src = avatarUrl ?? ''
  gameProfileAvatarImage.alt = avatarUrl ? `Avatar de ${model.nickname}` : ''
  gameProfileInitials.hidden = Boolean(avatarUrl)
  gameProfileInitials.textContent = model.initials
  gameProfileNickname.textContent = model.nickname
  gameProfileAccount.textContent = model.accountLabel
  gameProfile.setAttribute('aria-label', `Abrir menú del jugador: ${model.nickname}`)
}

function closeGameProfileMenu ({ restoreFocus = false } = {}) {
  gameProfileMenu.hidden = true
  gameProfile.setAttribute('aria-expanded', 'false')
  if (restoreFocus) gameProfile.focus()
}

function toggleGameProfileMenu () {
  const willOpen = gameProfileMenu.hidden
  gameProfileMenu.hidden = !willOpen
  gameProfile.setAttribute('aria-expanded', String(willOpen))
  if (willOpen) profileMenuProfile.focus()
}

function renderStartProfileAccess (profile = leaderboardService.getProfile(), account = currentAccount) {
  const model = createProfileAccessModel(account, profile)
  const avatarUrl = avatarService.getAvatarUrl(model.signedIn ? profile.avatarPath : null)

  startProfileAvatarImage.hidden = !avatarUrl
  startProfileAvatarImage.src = avatarUrl ?? ''
  startProfileAvatarImage.alt = avatarUrl ? `Avatar de ${model.name}` : ''
  startProfileInitials.hidden = Boolean(avatarUrl)
  startProfileInitials.textContent = getInitials(model.name)
  startProfileName.textContent = model.name
  startProfileStatus.textContent = model.status
  profileAccessButton.setAttribute('aria-label', model.title)
  profileAccessButton.classList.toggle('is-signed-in', model.signedIn)
}

function renderProfileAvatar (profile = leaderboardService.getProfile(), url = null, temporary = false) {
  clearTemporaryAvatarPreview()
  const avatarUrl = url ?? avatarService.getAvatarUrl(profile.avatarPath)

  if (temporary) temporaryAvatarPreviewUrl = avatarUrl

  avatarPreviewImage.hidden = !avatarUrl
  avatarPreviewImage.src = avatarUrl ?? ''
  avatarPreviewImage.alt = avatarUrl ? `Avatar de ${profile.nickname}` : ''
  avatarInitials.hidden = Boolean(avatarUrl)
  avatarInitials.textContent = getInitials(profile.nickname)
  avatarRemoveButton.hidden = !profile.avatarPath && !temporary
  renderGameProfile(profile)
  renderStartProfileAccess(profile)
}

function showAvatarFeedback (message, isError = false) {
  avatarFeedback.textContent = message
  avatarFeedback.classList.toggle('is-error', isError)
}

async function handleAvatarSelection () {
  if (!profileEditingEnabled) {
    avatarInput.value = ''
    showAvatarFeedback('Modo guest: iniciá sesión con Google para personalizar tu avatar.', true)
    return
  }

  const file = avatarInput.files?.[0]
  if (!file) return

  const validation = validateAvatarFile(file)
  if (!validation.valid) {
    showAvatarFeedback(validation.message, true)
    avatarInput.value = ''
    return
  }

  const previousProfile = leaderboardService.getProfile()
  const previewUrl = URL.createObjectURL(file)
  renderProfileAvatar(previousProfile, previewUrl, true)
  showAvatarFeedback('Guardando avatar...')

  const result = await avatarService.uploadAvatar(file)
  avatarInput.value = ''

  if (result.source === 'online') {
    const profile = leaderboardService.getProfile()
    renderProfileAvatar(profile, result.url)
    const saveResult = await accountService.saveProfile(profile)
    if (saveResult.source === 'online') {
      persistedProfile = { ...profile }
      showAvatarFeedback('Avatar guardado. Se reemplazó el anterior.')
      refreshLeaderboardIfOpen()
    } else {
      showAvatarFeedback(saveResult.error ?? 'Avatar cargado, pero no se pudo sincronizar el perfil.', true)
    }
    updateProfileSaveState()
    return
  }

  if (result.source === 'local' && !avatarService.isOnline()) {
    showAvatarFeedback('Vista previa local. Configurá Supabase para guardarlo en el ranking.')
    return
  }

  renderProfileAvatar(previousProfile)
  showAvatarFeedback(result.error ?? 'No se pudo guardar el avatar.', true)
}

async function removeAvatar () {
  if (!profileEditingEnabled) {
    showAvatarFeedback('Modo guest: iniciá sesión con Google para personalizar tu avatar.', true)
    return
  }

  const profile = leaderboardService.getProfile()
  if (!profile.avatarPath && temporaryAvatarPreviewUrl !== null) {
    renderProfileAvatar(profile)
    showAvatarFeedback('Vista previa quitada.')
    return
  }

  const result = await avatarService.removeAvatar()
  if (result.source === 'online') {
    const profile = leaderboardService.getProfile()
    renderProfileAvatar(profile)
    const saveResult = await accountService.saveProfile(profile)
    if (saveResult.source === 'online') {
      persistedProfile = { ...profile }
      showAvatarFeedback('Avatar eliminado.')
      refreshLeaderboardIfOpen()
    } else {
      showAvatarFeedback(saveResult.error ?? 'Avatar eliminado, pero no se pudo sincronizar el perfil.', true)
    }
    updateProfileSaveState()
    return
  }

  showAvatarFeedback(result.error ?? 'No se pudo eliminar el avatar.', true)
}

function showProfileSetupPrompt (message) {
  openProfilePanel()
  profileSetupPromptText.textContent = message
  profileSetupPrompt.hidden = false
  profileSetupSection.classList.add('is-priority')
  profileSetupSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
  playerNickname.focus({ preventScroll: true })
}

function renderAccountState (account) {
  const isSignedIn = account.status === 'signed-in'
  const editable = canEditProfile(account)

  currentAccount = account
  setProfileEditingEnabled(editable)
  renderGameProfile(leaderboardService.getProfile(), isSignedIn ? 'Google conectado' : 'Invitado')
  renderStartProfileAccess(leaderboardService.getProfile(), account)
  profileIntro.textContent = isSignedIn
    ? 'Actualizá tu nickname y avatar cuando quieras.'
    : 'Iniciá sesión para personalizar cómo aparecés en el ranking.'
  accountStatus.textContent = isSignedIn ? 'Google conectado' : 'Guest'
  accountHint.textContent = isSignedIn
    ? 'Tu ranking, nickname y avatar están asociados a Google.'
    : 'Modo guest: iniciá sesión con Google para personalizar tu nickname y avatar.'
  googleSignInLabel.textContent = isSignedIn ? 'Google conectado' : 'Continuar con Google'
  googleSignInButton.hidden = isSignedIn
  googleSignInButton.disabled = isSignedIn
  accountSignOutButton.hidden = !isSignedIn
  accountSignOutButton.disabled = false
  accountFeedback.textContent = account.error
    ? account.error
    : isSignedIn
      ? 'Perfil sincronizado con Supabase.'
      : 'Nickname y avatar bloqueados mientras jugás como guest.'
  accountFeedback.classList.toggle('is-error', Boolean(account.error))

  if (!editable) {
    playerNickname.value = GUEST_PROFILE_NICKNAME
    avatarFeedback.textContent = 'Perfil guest fijo · iniciá sesión con Google para personalizarlo.'
    avatarFeedback.classList.remove('is-error')
  }

  updateProfileSaveState()
}

function openProfilePanel () {
  closeGameProfileMenu()
  profilePanel.hidden = false
  profileBackdrop.hidden = false
  profilePanel.setAttribute('aria-hidden', 'false')
  profileAccessButton.setAttribute('aria-expanded', 'true')
  profileClose.focus()
}

function closeProfilePanel () {
  profilePanel.hidden = true
  profileBackdrop.hidden = true
  profilePanel.setAttribute('aria-hidden', 'true')
  profileAccessButton.setAttribute('aria-expanded', 'false')
  closeGameProfileMenu()
  if (gameScreen.hidden) profileAccessButton.focus()
  else gameProfile.focus()
}

async function disconnectGoogle () {
  accountSignOutButton.disabled = true
  accountFeedback.classList.remove('is-error')
  accountFeedback.textContent = 'Cerrando sesión...'

  const result = await accountService.signOut()
  if (result.source === 'online') {
    profileSetupPrompt.hidden = true
    profileSetupSection.classList.remove('is-priority')
    await syncRemoteProfile()
    accountFeedback.textContent = 'Sesión cerrada. Estás jugando como guest.'
    return
  }

  accountSignOutButton.disabled = false
  accountFeedback.classList.add('is-error')
  accountFeedback.textContent = result.error ?? 'No se pudo cerrar la sesión.'
}

async function syncRemoteProfile () {
  const account = await accountService.getAccountState()
  renderAccountState(account)
  if (!canEditProfile(account)) {
    setGuestProfile()
    return
  }
  const profileSetupPending = consumeProfileSetupPending(localStorage)
  if (!accountService.isOnline()) return

  const remoteSettings = await accountService.loadSettings()
  if (remoteSettings.source === 'online') applyUserSettings(remoteSettings.settings)

  const remoteProfile = await accountService.loadProfile()
  if (remoteProfile.source !== 'online') return

  if (remoteProfile.profile) {
    const profile = leaderboardService.setProfile(remoteProfile.profile)
    persistedProfile = { ...profile }
    playerNickname.value = profile.nickname
    renderProfileAvatar(profile)
    if (profileSetupPending) {
      showProfileSetupPrompt('Tu perfil fue recuperado. Podés ajustar tu nickname o avatar antes de empezar.')
    }
    return
  }

  const profile = leaderboardService.getProfile()
  const saveResult = await accountService.saveProfile(profile)
  if (saveResult.source === 'online') persistedProfile = { ...profile }
  if (profileSetupPending) {
    showProfileSetupPrompt('Elegí tu nickname y cargá una imagen para completar tu perfil.')
  }
}

async function connectGoogle () {
  googleSignInButton.disabled = true
  accountFeedback.classList.remove('is-error')
  accountFeedback.textContent = 'Abriendo Google...'

  const result = await accountService.connectGoogle()
  if (result.source === 'redirect' && result.url) {
    markProfileSetupPending(localStorage)
    window.location.assign(result.url)
    return
  }

  if (result.source === 'online') {
    await syncRemoteProfile()
    return
  }

  googleSignInButton.disabled = false
  accountFeedback.classList.add('is-error')
  accountFeedback.textContent = result.error ?? 'No se pudo conectar con Google.'
}

function renderLeaderboard (entries) {
  leaderboardList.replaceChildren()

  if (entries.length === 0) {
    const empty = document.createElement('li')
    empty.className = 'leaderboard-empty'
    empty.textContent = 'Todavía no hay puntuaciones. Sé el primero en entrar al ranking.'
    leaderboardList.append(empty)
    return
  }

  entries.forEach((entry, index) => {
    const row = document.createElement('li')
    const avatar = document.createElement('span')
    const details = document.createElement('div')
    const nickname = document.createElement('span')
    const meta = document.createElement('span')
    const score = document.createElement('strong')

    row.className = `leaderboard-row${index === 0 ? ' is-top' : ''}`
    avatar.className = 'leaderboard-avatar'
    const avatarUrl = leaderboardService.getAvatarUrl(entry.avatarPath)
    if (avatarUrl) {
      const image = document.createElement('img')
      image.src = avatarUrl
      image.alt = `Avatar de ${entry.nickname}`
      avatar.append(image)
    } else {
      avatar.textContent = getInitials(entry.nickname)
    }
    nickname.className = 'leaderboard-player'
    nickname.textContent = entry.nickname
    meta.className = 'leaderboard-meta'
    meta.textContent = `Nivel ${entry.level} · salida ${entry.startLevel} · ${entry.lines} líneas`
    score.className = 'leaderboard-score'
    score.textContent = SCORE_FORMATTER.format(entry.score)
    details.append(nickname, meta)
    row.append(avatar, details, score)
    leaderboardList.append(row)
  })
}

function renderLeaderboardFilters () {
  leaderboardStage.replaceChildren()
  STAGES.forEach((stage) => {
    const option = document.createElement('option')
    option.value = stage.id
    option.textContent = stage.name
    leaderboardStage.append(option)
  })

  for (let level = 1; level <= 10; level += 1) {
    const option = document.createElement('option')
    option.value = String(level)
    option.textContent = `Nivel ${level}`
    leaderboardStartLevel.append(option)
  }
}

function syncLeaderboardFilters () {
  const stageId = gameScreen.hidden ? selectedStage : game.stageId
  const startLevel = gameScreen.hidden ? Number(startLevelSelect.value) : game.startLevel
  leaderboardStage.value = stageId
  leaderboardStartLevel.value = String(startLevel)
}

function getLeaderboardFilters () {
  return {
    stageId: leaderboardStage.value,
    startLevel: leaderboardStartLevel.value === 'all' ? null : Number(leaderboardStartLevel.value)
  }
}

function getLeaderboardContext () {
  const stage = getStage(leaderboardStage.value)
  const startLevel = leaderboardStartLevel.value === 'all'
    ? 'todos los niveles'
    : `nivel ${leaderboardStartLevel.value}`
  return {
    title: `Ranking · ${stage.name}`,
    label: `Mejores puntuaciones · ${startLevel}`
  }
}

async function refreshLeaderboard () {
  const requestId = ++leaderboardRefreshRequest
  const context = getLeaderboardContext()
  leaderboardTitle.textContent = context.title
  leaderboardStatus.textContent = 'Cargando puntuaciones...'
  const result = await leaderboardService.getLeaderboard({ limit: 10, ...getLeaderboardFilters() })
  if (requestId !== leaderboardRefreshRequest) return
  renderLeaderboard(result.entries)

  if (result.source === 'online') {
    leaderboardStatus.textContent = leaderboardService.isOnline()
      ? `${context.label} · actualizado en vivo`
      : `${context.label} · mejores puntuaciones`
    return
  }

  leaderboardStatus.textContent = leaderboardService.isOnline()
    ? `${context.label} · sin conexión, usando este dispositivo`
    : `${context.label} · modo invitado`
}

function refreshLeaderboardIfOpen () {
  if (!leaderboardPanel.hidden) refreshLeaderboard()
}

function openLeaderboard () {
  closeGameProfileMenu()
  syncLeaderboardFilters()
  leaderboardPanel.hidden = false
  leaderboardBackdrop.hidden = false
  leaderboardPanel.setAttribute('aria-hidden', 'false')
  leaderboardUnsubscribe()
  leaderboardUnsubscribe = leaderboardService.subscribeToLeaderboard(() => {
    if (!leaderboardPanel.hidden) refreshLeaderboard()
  })
  refreshLeaderboard()
  leaderboardClose.focus()
}

function closeLeaderboard () {
  leaderboardUnsubscribe()
  leaderboardUnsubscribe = () => {}
  leaderboardPanel.hidden = true
  leaderboardBackdrop.hidden = true
  leaderboardPanel.setAttribute('aria-hidden', 'true')

  if (!gameOverOverlay.hidden) gameOverLeaderboardButton.focus()
  else if (gameScreen.hidden) leaderboardButton.focus()
  else gameProfile.focus()
}

async function submitGameScore () {
  const requestId = ++leaderboardSaveRequest
  const currentLevel = getCurrentLevel(game.score, game.startLevel).level
  gameOverSaveStatus.className = 'game-over-save-status'
  gameOverSaveStatus.textContent = 'Guardando puntuación...'

  const result = await leaderboardService.submitScore({
    run: activeRun,
    actions: [...runActions],
    score: game.score,
    level: currentLevel,
    lines: game.lines,
    stageId: game.stageId,
    startLevel: game.startLevel
  })

  if (requestId !== leaderboardSaveRequest) return

  if (result.source === 'online') {
    gameOverSaveStatus.classList.add('is-success')
    gameOverSaveStatus.textContent = 'Puntuación guardada en el ranking histórico.'
    refreshStageRecord(game.stageId)
    return
  }

  gameOverSaveStatus.classList.add('is-warning')
  gameOverSaveStatus.textContent = leaderboardService.isOnline()
    ? 'No se pudo validar en servidor: guardada solo en este dispositivo.'
    : 'Modo invitado: guardada en este dispositivo.'
}

function openSettings () {
  settingsPanel.hidden = false
  settingsBackdrop.hidden = false
  settingsPanel.setAttribute('aria-hidden', 'false')
  closeGameProfileMenu()
  settingsToggle.setAttribute('aria-expanded', 'true')
  showSettingsFeedback('Elegí una acción para cambiar su tecla.')
  settingsClose.focus()
}

function closeSettings () {
  listeningAction = null
  settingsPanel.hidden = true
  settingsBackdrop.hidden = true
  settingsPanel.setAttribute('aria-hidden', 'true')
  settingsToggle.setAttribute('aria-expanded', 'false')
  renderControlLabels()
  if (gameScreen.hidden) startSettingsButton.focus()
  else gameProfile.focus()
}

function resetControls () {
  controls = createControls()
  listeningAction = null
  saveControls()
  renderControlLabels()
  showSettingsFeedback('Controles restaurados a sus valores originales.')
}

function startListening (action) {
  listeningAction = action
  showSettingsFeedback(`Presioná una tecla para ${ACTION_LABELS[action]}.`)
  renderControlLabels()
}

function hideGameOverOverlay () {
  if (gameOverTimer !== null) {
    window.clearTimeout(gameOverTimer)
    gameOverTimer = null
  }

  gameOverAnimationFinished = false
  gameOverOverlay.hidden = true
  gameOverOverlay.classList.remove('is-active', 'is-ready')
  gameOverOverlay.setAttribute('aria-hidden', 'true')
}

function showGameOverOverlay () {
  if (gameOverTimer !== null) window.clearTimeout(gameOverTimer)

  const currentLevel = getCurrentLevel(game.score, game.startLevel).level
  gameOverAnimationFinished = false
  gameOverSummary.textContent = getGameOverSummary({ score: game.score, level: currentLevel })
  gameOverOverlay.hidden = false
  gameOverOverlay.classList.remove('is-active', 'is-ready')
  gameOverOverlay.setAttribute('aria-hidden', 'false')
  gameOverOverlay.classList.add('is-active')
  gameOverDialog.focus()
  submitGameScore()

  gameOverTimer = window.setTimeout(() => {
    gameOverAnimationFinished = true
    gameOverOverlay.classList.add('is-ready')
    gameOverTimer = null
  }, GAME_OVER_ANIMATION_MS)
}

function returnToStartScreen (keyCode) {
  const canReturn = canReturnToStartScreen({
    gameOver: game.gameOver,
    animationFinished: gameOverAnimationFinished,
    keyCode
  })

  if (!canReturn) return false

  hideGameOverOverlay()
  soundManager.stopMusic()
  clearLevelLedFeedback()
  gameStarted = false
  gameScreen.hidden = true
  startScreen.hidden = false
  window.scrollTo({ top: 0, left: 0 })
  syncGameViewport()
  startHint.textContent = 'Listo para jugar.'
  updateStartScene()
  startGameButton.focus()
  return true
}

function togglePauseGame () {
  if (game.gameOver) return
  togglePause(game)
  if (game.paused) soundManager.stopMusic()
  else soundManager.playMusic()
  draw()
}

function pauseOnFocusLoss () {
  if (shouldAutoPause({ gameStarted, gameOver: game.gameOver, paused: game.paused })) togglePauseGame()
}

function processGameEvents (previousLevel, wasGameOver) {
  const event = game.lastEvent
  const currentLevel = getCurrentLevel(game.score, game.startLevel).level

  if (event?.lines > 0) {
    lineClearAnimation = createLineClearAnimation(event.clearedRows, performance.now())
    if (lineClearAnimation) boardCanvas.classList.add('is-line-clearing')
    soundManager.playLineClear(event.lines)
  }
  if (currentLevel > previousLevel) soundManager.playLevelUp()
  if (event?.gameOver || (!wasGameOver && game.gameOver)) {
    soundManager.stopMusic()
    soundManager.playGameOver()
    showGameOverOverlay()
  }
  game.lastEvent = null
}

function runGameAction (action, actionType = null) {
  const previousLevel = getCurrentLevel(game.score, game.startLevel).level
  const wasGameOver = game.gameOver
  const result = action()
  if (actionType && activeRun) runActions.push(actionType)
  processGameEvents(previousLevel, wasGameOver)
  return result
}

function handleSoftDrop () {
  for (let step = 0; step < userSettings.softDropMultiplier; step += 1) {
    if (game.gameOver || game.paused) break
    runGameAction(() => moveActivePiece(game, 'down'), 'down')
  }
}

function handleInput (deltaTime) {
  const actions = drainInputActions(inputBuffer)

  for (const action of actions) {
    if (action === 'pause') {
      togglePauseGame()
      continue
    }

    if (game.gameOver || game.paused) break

    switch (action) {
      case 'rotate':
        runGameAction(() => rotateActivePiece(game), 'rotate')
        break
      case 'hold':
        runGameAction(() => holdActivePiece(game), 'hold')
        break
      case 'left':
      case 'right':
        runGameAction(() => moveActivePiece(game, action), action)
        break
      case 'down':
        handleSoftDrop()
        break
    }
  }

  if (!gameStarted || game.gameOver || game.paused) {
    horizontalRepeatCounter = 0
    return
  }

  const heldHorizontalAction = getHeldInputAction(inputBuffer, ['left', 'right'])
  if (heldHorizontalAction === null) {
    horizontalRepeatCounter = 0
    return
  }

  horizontalRepeatCounter += deltaTime
  while (horizontalRepeatCounter >= HORIZONTAL_REPEAT_MS) {
    runGameAction(() => moveActivePiece(game, heldHorizontalAction), heldHorizontalAction)
    horizontalRepeatCounter -= HORIZONTAL_REPEAT_MS
    if (game.gameOver) break
  }
}

function draw () {
  drawBoard()
  drawPiecePreview(nextContext, game.nextPiece)
  drawPiecePreview(savedContext, game.heldPiece)
  updateHud()
}

function update (time = 0) {
  const deltaTime = Math.min(time - lastTime, 1000)
  lastTime = time

  handleInput(deltaTime)

  if (gameStarted && !game.gameOver && !game.paused) {
    const currentLevel = getCurrentLevel(game.score, game.startLevel)
    dropCounter += deltaTime

    if (dropCounter >= currentLevel.speed) {
      runGameAction(() => moveActivePiece(game, 'down'), 'down')
      dropCounter = 0
    }
  }

  draw()
  window.requestAnimationFrame(update)
}

async function startGame () {
  const startLevel = Number(startLevelSelect.value)
  const requestId = ++runStartRequest
  startGameButton.disabled = true
  startGameButton.classList.add('is-loading')
  startGameButton.setAttribute('aria-busy', 'true')
  startGameButtonLabel.textContent = 'Preparando partida…'
  startHint.textContent = 'Validando una partida segura…'
  hideGameOverOverlay()
  try {
    const run = await leaderboardService.startRun({ stageId: selectedStage, startLevel })
    if (requestId !== runStartRequest) return

    activeRun = run.source === 'online' ? run : null
    runActions = []
    const random = run.source === 'online' ? createSeededRandom(run.seed) : Math.random
    game = createGame({ random, startLevel, startingStage: selectedStage })
    gameStarted = true
    syncGameViewport()
    lastRenderedLevel = 0
    startScreen.hidden = true
    gameScreen.hidden = false
    window.scrollTo({ top: 0, left: 0 })
    soundManager.unlock()
    soundManager.playMusic()
    updateStageArt(startLevel)
    lastTime = performance.now()
    startHint.textContent = `Stage ${getStage(selectedStage).name} · nivel ${startLevel}. Buena suerte.`
    draw()
  } finally {
    if (requestId === runStartRequest) {
      startGameButton.disabled = false
      startGameButton.classList.remove('is-loading')
      startGameButton.removeAttribute('aria-busy')
      startGameButtonLabel.textContent = 'Empezar juego'
    }
  }
}

renderStagePicker()
selectStage(selectedStage)
renderLeaderboardFilters()
const initialProfile = leaderboardService.getProfile()
persistedProfile = { ...initialProfile }
playerNickname.value = initialProfile.nickname
renderProfileAvatar(initialProfile)
applyUserSettings(userSettings)
syncGameViewport()
draw()
syncRemoteProfile().catch(() => {})
window.requestAnimationFrame(update)

startLevelSelect.addEventListener('change', updateStartScene)
window.addEventListener('resize', syncGameViewport)
window.visualViewport?.addEventListener('resize', syncGameViewport)
startGameButton.addEventListener('click', startGame)
avatarInput.addEventListener('change', handleAvatarSelection)
avatarRemoveButton.addEventListener('click', removeAvatar)
saveProfileButton.addEventListener('click', saveProfileChanges)
googleSignInButton.addEventListener('click', connectGoogle)
accountSignOutButton.addEventListener('click', disconnectGoogle)
playerNickname.addEventListener('input', () => {
  if (!profileEditingEnabled) {
    playerNickname.value = GUEST_PROFILE_NICKNAME
    return
  }
  avatarInitials.textContent = getInitials(playerNickname.value)
  updateProfileSaveState()
})
startSettingsButton.addEventListener('click', openSettings)
leaderboardButton.addEventListener('click', openLeaderboard)
profileAccessButton.addEventListener('click', openProfilePanel)
profileClose.addEventListener('click', closeProfilePanel)
profileBackdrop.addEventListener('click', closeProfilePanel)
gameLeaderboardButton.addEventListener('click', openLeaderboard)
gameOverLeaderboardButton.addEventListener('click', openLeaderboard)
gameProfile.addEventListener('click', toggleGameProfileMenu)
profileMenuProfile.addEventListener('click', openProfilePanel)
leaderboardClose.addEventListener('click', closeLeaderboard)
leaderboardBackdrop.addEventListener('click', closeLeaderboard)
leaderboardRefresh.addEventListener('click', refreshLeaderboard)
leaderboardStage.addEventListener('change', refreshLeaderboard)
leaderboardStartLevel.addEventListener('change', refreshLeaderboard)
resumeButton.addEventListener('click', togglePauseGame)
settingsToggle.addEventListener('click', openSettings)
openSettingsLink.addEventListener('click', openSettings)
settingsClose.addEventListener('click', closeSettings)
settingsBackdrop.addEventListener('click', closeSettings)
resetControlsButton.addEventListener('click', resetControls)
soundToggle.addEventListener('click', () => {
  soundManager.setEnabled(!soundManager.isEnabled())
  if (soundManager.isEnabled()) soundManager.unlock()
  saveSoundSetting()
  renderSoundToggle()
})
musicToggle.addEventListener('click', () => {
  soundManager.setMusicEnabled(!soundManager.isMusicEnabled())
  if (soundManager.isMusicEnabled()) soundManager.playMusic()
  else soundManager.stopMusic()
  saveMusicSetting()
  renderMusicSettings()
})
musicVolumeInput.addEventListener('input', () => {
  soundManager.setMusicVolume(Number(musicVolumeInput.value) / 100)
  renderMusicSettings()
})
musicVolumeInput.addEventListener('change', () => {
  saveMusicSetting()
})
softDropMultiplierInput.addEventListener('change', saveSoftDropSetting)

document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseOnFocusLoss()
})
window.addEventListener('blur', pauseOnFocusLoss)

document.addEventListener('click', (event) => {
  if (gameProfileMenu.hidden) return
  if (gameProfile.contains(event.target) || gameProfileMenu.contains(event.target)) return
  closeGameProfileMenu()
})

document.querySelectorAll('[data-binding]').forEach((button) => {
  button.addEventListener('click', () => startListening(button.dataset.binding))
})

document.addEventListener('keydown', (event) => {
  if (listeningAction !== null) {
    event.preventDefault()

    if (event.code === 'Escape') {
      listeningAction = null
      showSettingsFeedback('Cambio cancelado.')
      renderControlLabels()
      return
    }

    const existingAction = findActionByCode(controls, event.code)
    if (existingAction !== null && existingAction !== listeningAction) {
      showSettingsFeedback(`La tecla ${getKeyLabel(event.code)} ya está asignada a ${ACTION_LABELS[existingAction]}.`, true)
      return
    }

    controls = updateControl(controls, listeningAction, event.code)
    saveControls()
    showSettingsFeedback(`${ACTION_LABELS[listeningAction]} ahora usa ${getKeyLabel(event.code)}.`)
    listeningAction = null
    renderControlLabels()
    return
  }

  if (!settingsPanel.hidden) {
    if (event.code === 'Escape') closeSettings()
    return
  }

  if (!gameProfileMenu.hidden) {
    if (event.code === 'Escape') closeGameProfileMenu({ restoreFocus: true })
    return
  }

  if (!profilePanel.hidden) {
    if (event.code === 'Escape') closeProfilePanel()
    return
  }

  if (!leaderboardPanel.hidden) {
    if (event.code === 'Escape') closeLeaderboard()
    return
  }

  if (gameScreen.hidden) return

  if (game.gameOver) {
    event.preventDefault()
    returnToStartScreen(event.code)
    return
  }

  const action = findActionByCode(controls, event.code)
  if (!action) return

  event.preventDefault()
  enqueueInputAction(inputBuffer, GAME_INPUT_ACTIONS[action], { repeat: event.repeat })
})

document.addEventListener('keyup', (event) => {
  const action = findActionByCode(controls, event.code)
  if (action) releaseInputAction(inputBuffer, GAME_INPUT_ACTIONS[action])
})
