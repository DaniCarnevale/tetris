/* global URL, document, localStorage, performance, window */

import { BLOCK_SIZE, BOARD_HEIGHT, BOARD_WIDTH } from './config/config.js'
import { getCurrentLevel } from './managers/levelManager.js'
import { levels } from './utils/levels.js'
import { hasCollision } from './game/board.js'
import { clonePiece } from './game/pieces.js'
import { createGame, holdActivePiece, moveActivePiece, resetGame, rotateActivePiece, togglePause } from './game/engine.js'
import { canReturnToStartScreen, GAME_OVER_ANIMATION_MS, getGameOverSummary } from './game/gameFlow.js'
import { getBackdropForLevel, getStage, STAGES } from './game/stages.js'
import { createSoundManager } from './audio/soundManager.js'
import { createLeaderboardService } from './leaderboard/leaderboardService.js'
import { createAvatarService, validateAvatarFile } from './leaderboard/avatarService.js'
import { canEditProfile, createAccountService, GUEST_PROFILE_NICKNAME } from './leaderboard/accountService.js'
import {
  consumeProfileSetupPending,
  createProfileCardModel,
  markProfileSetupPending
} from './leaderboard/profilePresentation.js'
import {
  createControls,
  findActionByCode,
  getKeyLabel,
  readStoredControls,
  updateControl
} from './input/controls.js'
import buenosAiresArt from '../assets/backgrounds/buenos-aires.svg'
import humahuacaArt from '../assets/backgrounds/humahuaca.svg'
import iguazuArt from '../assets/backgrounds/iguazu.svg'
import patagoniaArt from '../assets/backgrounds/patagonia.svg'
import '../styles/style.css'

const CONTROLS_STORAGE_KEY = 'tetris.controls'
const SOUND_STORAGE_KEY = 'tetris.sound.enabled'
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
const BACKGROUND_ART = {
  'buenos-aires': buenosAiresArt,
  humahuaca: humahuacaArt,
  iguazu: iguazuArt,
  patagonia: patagoniaArt
}
const SCENE_COPY = {
  'buenos-aires': {
    label: 'Buenos Aires',
    description: 'Velocidad baja.'
  },
  humahuaca: {
    label: 'Quebrada de Humahuaca',
    description: 'Velocidad media.'
  },
  iguazu: {
    label: 'Cataratas del Iguazú',
    description: 'Velocidad alta.'
  },
  patagonia: {
    label: 'Patagonia nocturna',
    description: 'Máxima velocidad.'
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
const startSettingsButton = document.querySelector('#startSettingsButton')
const leaderboardButton = document.querySelector('#leaderboardButton')
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
const statusElement = document.querySelector('#status')
const stateLabel = document.querySelector('#stateLabel')
const stateDot = document.querySelector('#stateDot')
const heldEmpty = document.querySelector('#heldEmpty')
const controlHint = document.querySelector('#controlHint')
const holdKey = document.querySelector('#holdKey')
const restartKey = document.querySelector('#restartKey')
const pauseKey = document.querySelector('#pauseKey')
const pauseButton = document.querySelector('#pauseButton')
const pauseButtonLabel = document.querySelector('#pauseButtonLabel')
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
const leaderboardStatus = document.querySelector('#leaderboardStatus')
const leaderboardList = document.querySelector('#leaderboardList')
const leaderboardRefresh = document.querySelector('#leaderboardRefresh')
const settingsToggle = document.querySelector('#settingsToggle')
const openSettingsLink = document.querySelector('#openSettingsLink')
const settingsClose = document.querySelector('#settingsClose')
const settingsBackdrop = document.querySelector('#settingsBackdrop')
const settingsPanel = document.querySelector('#settingsPanel')
const settingsFeedback = document.querySelector('#settingsFeedback')
const resetControlsButton = document.querySelector('#resetControls')
const restartButton = document.querySelector('#restartButton')
const soundToggle = document.querySelector('#soundToggle')
const soundToggleLabel = document.querySelector('#soundToggleLabel')
const gameProfile = document.querySelector('#gameProfile')
const gameProfileAvatarImage = document.querySelector('#gameProfileAvatarImage')
const gameProfileInitials = document.querySelector('#gameProfileInitials')
const gameProfileNickname = document.querySelector('#gameProfileNickname')
const gameProfileAccount = document.querySelector('#gameProfileAccount')
const boardContext = boardCanvas.getContext('2d')
const nextContext = nextCanvas.getContext('2d')
const savedContext = savedCanvas.getContext('2d')
const soundManager = createSoundManager()
const leaderboardService = createLeaderboardService()
const avatarService = createAvatarService()
const accountService = createAccountService()

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
let controls = loadControls()
let selectedStage = 'fresh'
let gameStarted = false
let dropCounter = 0
let lastTime = 0
let latestInput = null
let listeningAction = null
let lastRenderedLevel = 0
let gameOverAnimationFinished = false
let gameOverTimer = null
let leaderboardSaveRequest = 0
let leaderboardUnsubscribe = () => {}
let temporaryAvatarPreviewUrl = null
let profileEditingEnabled = false

function loadControls () {
  try {
    return readStoredControls(localStorage.getItem(CONTROLS_STORAGE_KEY))
  } catch {
    return createControls()
  }
}

function loadSoundSetting () {
  try {
    return localStorage.getItem(SOUND_STORAGE_KEY) !== 'false'
  } catch {
    return true
  }
}

function saveControls () {
  try {
    localStorage.setItem(CONTROLS_STORAGE_KEY, JSON.stringify(controls))
  } catch {
    showSettingsFeedback('No se pudo guardar la configuración en este navegador.', true)
  }
}

function saveSoundSetting () {
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, String(soundManager.isEnabled()))
  } catch {
    showSettingsFeedback('No se pudo guardar la preferencia de sonido.', true)
  }
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

function updateHud () {
  const currentLevel = getCurrentLevel(game.score, game.startLevel)
  const isPaused = game.paused && !game.gameOver
  scoreElement.textContent = game.score
  levelElement.textContent = currentLevel.level
  stateLabel.textContent = game.gameOver ? 'Partida terminada' : isPaused ? 'En pausa' : 'En partida'
  stateDot.classList.toggle('game-over', game.gameOver)
  stateDot.classList.toggle('is-paused', isPaused)
  statusElement.textContent = game.gameOver
    ? `Fin de partida · pulsá ${getKeyLabel(controls.restart)} para volver a jugar`
    : isPaused
      ? `Juego en pausa · pulsá ${getKeyLabel(controls.pause)} para continuar`
      : 'En juego · prepará tu próxima jugada'
  controlHint.textContent = `${getKeyLabel(controls.rotate)} rotar · ${getKeyLabel(controls.softDrop)} bajar · ${getKeyLabel(controls.pause)} pausar`
  holdKey.textContent = getKeyLabel(controls.hold)
  restartKey.textContent = getKeyLabel(controls.restart)
  pauseKey.textContent = getKeyLabel(controls.pause)
  pauseButtonLabel.textContent = isPaused ? 'Reanudar' : 'Pausar'
  pauseButton.setAttribute('aria-pressed', String(isPaused))
  pauseButton.disabled = game.gameOver
  pauseOverlay.hidden = !isPaused
  heldEmpty.hidden = Boolean(game.heldPiece)
  updateLevelProgress()

  if (lastRenderedLevel !== currentLevel.level) {
    lastRenderedLevel = currentLevel.level
    updateStageArt(currentLevel.level)
  }
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

function savePlayerNickname () {
  if (!profileEditingEnabled) return setGuestProfile()

  const profile = leaderboardService.setNickname(playerNickname.value)
  playerNickname.value = profile.nickname
  accountService.saveProfile(profile).catch(() => {})
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
}

function setGuestProfile () {
  const profile = leaderboardService.setProfile({
    nickname: GUEST_PROFILE_NICKNAME,
    avatarPath: null
  })
  playerNickname.value = profile.nickname
  renderProfileAvatar(profile)
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
  gameProfile.setAttribute('aria-label', `Perfil del jugador: ${model.nickname}`)
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
}

function showAvatarFeedback (message, isError = false) {
  avatarFeedback.textContent = message
  avatarFeedback.classList.toggle('is-error', isError)
}

async function handleAvatarSelection () {
  if (!profileEditingEnabled) {
    avatarInput.value = ''
    showAvatarFeedback('Modo guest: vinculá Google para personalizar tu avatar.', true)
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
    renderProfileAvatar(leaderboardService.getProfile(), result.url)
    accountService.saveProfile(leaderboardService.getProfile()).catch(() => {})
    showAvatarFeedback('Avatar guardado. Se reemplazó el anterior.')
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
    showAvatarFeedback('Modo guest: vinculá Google para personalizar tu avatar.', true)
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
    renderProfileAvatar()
    accountService.saveProfile(leaderboardService.getProfile()).catch(() => {})
    showAvatarFeedback('Avatar eliminado.')
    return
  }

  showAvatarFeedback(result.error ?? 'No se pudo eliminar el avatar.', true)
}

function showProfileSetupPrompt (message) {
  profileSetupPromptText.textContent = message
  profileSetupPrompt.hidden = false
  profileSetupSection.classList.add('is-priority')
  profileSetupSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
  playerNickname.focus({ preventScroll: true })
}

function renderAccountState (account) {
  const isSignedIn = account.status === 'signed-in'
  const editable = canEditProfile(account)

  setProfileEditingEnabled(editable)
  renderGameProfile(leaderboardService.getProfile(), isSignedIn ? 'Google conectado' : 'Invitado')
  accountStatus.textContent = isSignedIn ? (account.email ?? 'Google conectado') : 'Guest'
  accountHint.textContent = isSignedIn
    ? 'Tu ranking, nickname y avatar están asociados a Google.'
    : 'Modo guest: vinculá Google para personalizar tu nickname y avatar.'
  googleSignInLabel.textContent = isSignedIn ? 'Google conectado' : 'Vincular Google'
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
    avatarFeedback.textContent = 'Perfil guest fijo · vinculá Google para personalizarlo.'
    avatarFeedback.classList.remove('is-error')
  }
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

  const remoteProfile = await accountService.loadProfile()
  if (remoteProfile.source !== 'online') return

  if (remoteProfile.profile) {
    const profile = leaderboardService.setProfile(remoteProfile.profile)
    playerNickname.value = profile.nickname
    renderProfileAvatar(profile)
    if (profileSetupPending) {
      showProfileSetupPrompt('Tu perfil fue recuperado. Podés ajustar tu nickname o avatar antes de empezar.')
    }
    return
  }

  await accountService.saveProfile(leaderboardService.getProfile())
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
    meta.textContent = `Nivel ${entry.level} · ${entry.lines} líneas`
    score.className = 'leaderboard-score'
    score.textContent = SCORE_FORMATTER.format(entry.score)
    details.append(nickname, meta)
    row.append(avatar, details, score)
    leaderboardList.append(row)
  })
}

async function refreshLeaderboard () {
  leaderboardStatus.textContent = 'Cargando puntuaciones...'
  const result = await leaderboardService.getLeaderboard()
  renderLeaderboard(result.entries)

  if (result.source === 'online') {
    leaderboardStatus.textContent = leaderboardService.isOnline()
      ? 'Ranking histórico · actualizado en vivo'
      : 'Ranking histórico · mejores puntuaciones'
    return
  }

  leaderboardStatus.textContent = leaderboardService.isOnline()
    ? 'Sin conexión al ranking. Mostrando puntuaciones de este dispositivo.'
    : 'Modo invitado · ranking guardado en este dispositivo'
}

function openLeaderboard () {
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
  else gameLeaderboardButton.focus()
}

async function submitGameScore () {
  const requestId = ++leaderboardSaveRequest
  const currentLevel = getCurrentLevel(game.score, game.startLevel).level
  gameOverSaveStatus.className = 'game-over-save-status'
  gameOverSaveStatus.textContent = 'Guardando puntuación...'

  const result = await leaderboardService.submitScore({
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
    return
  }

  gameOverSaveStatus.classList.add('is-warning')
  gameOverSaveStatus.textContent = leaderboardService.isOnline()
    ? 'Sin conexión: guardada en este dispositivo.'
    : 'Modo invitado: guardada en este dispositivo.'
}

function openSettings () {
  settingsPanel.hidden = false
  settingsBackdrop.hidden = false
  settingsPanel.setAttribute('aria-hidden', 'false')
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
  else settingsToggle.focus()
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
  gameStarted = false
  gameScreen.hidden = true
  startScreen.hidden = false
  startHint.textContent = 'Listo para jugar.'
  updateStartScene()
  startGameButton.focus()
  return true
}

function restartGame () {
  hideGameOverOverlay()
  game = resetGame(game)
  gameStarted = true
  dropCounter = 0
  lastTime = performance.now()
  soundManager.unlock()
  draw()
}

function togglePauseGame () {
  if (game.gameOver) return
  togglePause(game)
  draw()
}

function processGameEvents (previousLevel, wasGameOver) {
  const event = game.lastEvent
  const currentLevel = getCurrentLevel(game.score, game.startLevel).level

  if (event?.lines > 0) soundManager.playLineClear(event.lines)
  if (currentLevel > previousLevel) soundManager.playLevelUp()
  if (event?.gameOver || (!wasGameOver && game.gameOver)) {
    soundManager.playGameOver()
    showGameOverOverlay()
  }
  game.lastEvent = null
}

function runGameAction (action) {
  const previousLevel = getCurrentLevel(game.score, game.startLevel).level
  const wasGameOver = game.gameOver
  const result = action()
  processGameEvents(previousLevel, wasGameOver)
  return result
}

function handleInput () {
  if (latestInput === null) return

  if (latestInput === 'pause') {
    togglePauseGame()
    latestInput = null
    return
  }

  if (game.gameOver || game.paused) return

  switch (latestInput) {
    case 'rotate':
      runGameAction(() => rotateActivePiece(game))
      break
    case 'hold':
      runGameAction(() => holdActivePiece(game))
      break
    case 'left':
    case 'right':
    case 'down':
      runGameAction(() => moveActivePiece(game, latestInput))
      break
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

  handleInput()
  latestInput = null

  if (gameStarted && !game.gameOver && !game.paused) {
    const currentLevel = getCurrentLevel(game.score, game.startLevel)
    dropCounter += deltaTime

    if (dropCounter >= currentLevel.speed) {
      runGameAction(() => moveActivePiece(game, 'down'))
      dropCounter = 0
    }
  }

  draw()
  window.requestAnimationFrame(update)
}

function startGame () {
  const startLevel = Number(startLevelSelect.value)
  savePlayerNickname()
  hideGameOverOverlay()
  game = createGame({ startLevel, startingStage: selectedStage })
  gameStarted = true
  lastRenderedLevel = 0
  startScreen.hidden = true
  gameScreen.hidden = false
  soundManager.unlock()
  updateStageArt(startLevel)
  lastTime = performance.now()
  startHint.textContent = `Stage ${getStage(selectedStage).name} · nivel ${startLevel}. Buena suerte.`
  draw()
}

renderStagePicker()
selectStage(selectedStage)
const initialProfile = leaderboardService.getProfile()
playerNickname.value = initialProfile.nickname
renderProfileAvatar(initialProfile)
soundManager.setEnabled(loadSoundSetting())
renderSoundToggle()
renderControlLabels()
draw()
syncRemoteProfile().catch(() => {})
window.requestAnimationFrame(update)

startLevelSelect.addEventListener('change', updateStartScene)
startGameButton.addEventListener('click', startGame)
avatarInput.addEventListener('change', handleAvatarSelection)
avatarRemoveButton.addEventListener('click', removeAvatar)
googleSignInButton.addEventListener('click', connectGoogle)
accountSignOutButton.addEventListener('click', disconnectGoogle)
playerNickname.addEventListener('input', () => {
  if (!profileEditingEnabled) {
    playerNickname.value = GUEST_PROFILE_NICKNAME
    return
  }
  avatarInitials.textContent = getInitials(playerNickname.value)
})
startSettingsButton.addEventListener('click', openSettings)
leaderboardButton.addEventListener('click', openLeaderboard)
gameLeaderboardButton.addEventListener('click', openLeaderboard)
gameOverLeaderboardButton.addEventListener('click', openLeaderboard)
leaderboardClose.addEventListener('click', closeLeaderboard)
leaderboardBackdrop.addEventListener('click', closeLeaderboard)
leaderboardRefresh.addEventListener('click', refreshLeaderboard)
pauseButton.addEventListener('click', togglePauseGame)
resumeButton.addEventListener('click', togglePauseGame)
settingsToggle.addEventListener('click', openSettings)
openSettingsLink.addEventListener('click', openSettings)
settingsClose.addEventListener('click', closeSettings)
settingsBackdrop.addEventListener('click', closeSettings)
resetControlsButton.addEventListener('click', resetControls)
restartButton.addEventListener('click', restartGame)
soundToggle.addEventListener('click', () => {
  soundManager.setEnabled(!soundManager.isEnabled())
  if (soundManager.isEnabled()) soundManager.unlock()
  saveSoundSetting()
  renderSoundToggle()
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
  latestInput = {
    moveLeft: 'left',
    moveRight: 'right',
    softDrop: 'down',
    rotate: 'rotate',
    hold: 'hold',
    pause: 'pause',
    restart: 'restart'
  }[action]
})
