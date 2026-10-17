/* global document, localStorage, performance, window */

import { BLOCK_SIZE, BOARD_HEIGHT, BOARD_WIDTH } from './config/config.js'
import { levels } from './utils/levels.js'
import { getCurrentLevel } from './managers/levelManager.js'
import { createGame, holdActivePiece, moveActivePiece, resetGame, rotateActivePiece } from './game/engine.js'
import { hasCollision } from './game/board.js'
import { clonePiece } from './game/pieces.js'
import {
  createControls,
  findActionByCode,
  getKeyLabel,
  readStoredControls,
  updateControl
} from './input/controls.js'
import '../styles/style.css'

const CONTROLS_STORAGE_KEY = 'tetris.controls'
const ACTION_LABELS = {
  moveLeft: 'mover a la izquierda',
  moveRight: 'mover a la derecha',
  softDrop: 'bajar rápido',
  rotate: 'rotar',
  hold: 'guardar la ficha',
  restart: 'reiniciar la partida'
}

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
const settingsToggle = document.querySelector('#settingsToggle')
const openSettingsLink = document.querySelector('#openSettingsLink')
const settingsClose = document.querySelector('#settingsClose')
const settingsBackdrop = document.querySelector('#settingsBackdrop')
const settingsPanel = document.querySelector('#settingsPanel')
const settingsFeedback = document.querySelector('#settingsFeedback')
const resetControlsButton = document.querySelector('#resetControls')
const restartButton = document.querySelector('#restartButton')
const boardContext = boardCanvas.getContext('2d')
const nextContext = nextCanvas.getContext('2d')
const savedContext = savedCanvas.getContext('2d')

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
let dropCounter = 0
let lastTime = 0
let latestInput = null
let listeningAction = null

function loadControls () {
  try {
    return readStoredControls(localStorage.getItem(CONTROLS_STORAGE_KEY))
  } catch {
    return createControls()
  }
}

function saveControls () {
  try {
    localStorage.setItem(CONTROLS_STORAGE_KEY, JSON.stringify(controls))
  } catch {
    showSettingsFeedback('No se pudo guardar la configuración en este navegador.', true)
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
  boardContext.fillStyle = '#0a0f1c'
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

function updateLevelProgress () {
  const currentLevel = getCurrentLevel(game.score)
  const nextLevel = levels.find((level) => level.limit > game.score)
  const progress = nextLevel
    ? ((game.score - currentLevel.limit) / (nextLevel.limit - currentLevel.limit)) * 100
    : 100

  levelProgressElement.style.width = `${Math.max(0, Math.min(progress, 100))}%`
}

function updateHud () {
  const currentLevel = getCurrentLevel(game.score)
  scoreElement.textContent = game.score
  levelElement.textContent = currentLevel.level
  stateLabel.textContent = game.gameOver ? 'Partida terminada' : 'En partida'
  stateDot.classList.toggle('game-over', game.gameOver)
  statusElement.textContent = game.gameOver
    ? `Fin de partida · pulsá ${getKeyLabel(controls.restart)} para volver a jugar`
    : 'En juego · prepará tu próxima jugada'
  controlHint.textContent = `${getKeyLabel(controls.rotate)} rotar · ${getKeyLabel(controls.softDrop)} bajar`
  holdKey.textContent = getKeyLabel(controls.hold)
  restartKey.textContent = getKeyLabel(controls.restart)
  heldEmpty.hidden = Boolean(game.heldPiece)
  updateLevelProgress()
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

function showSettingsFeedback (message, isError = false) {
  settingsFeedback.textContent = message
  settingsFeedback.classList.toggle('is-error', isError)
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
  settingsToggle.focus()
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

function restartGame () {
  game = resetGame(game)
  dropCounter = 0
  lastTime = performance.now()
  draw()
}

function handleInput () {
  if (latestInput === null) return

  if (latestInput === 'restart' && game.gameOver) {
    restartGame()
    latestInput = null
    return
  }

  if (game.gameOver) return

  switch (latestInput) {
    case 'rotate':
      rotateActivePiece(game)
      break
    case 'hold':
      holdActivePiece(game)
      break
    case 'left':
    case 'right':
    case 'down':
      moveActivePiece(game, latestInput)
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

  if (!game.gameOver) {
    const currentLevel = getCurrentLevel(game.score)
    dropCounter += deltaTime

    if (dropCounter >= currentLevel.speed) {
      moveActivePiece(game, 'down')
      dropCounter = 0
    }
  }

  draw()
  window.requestAnimationFrame(update)
}

document.querySelectorAll('[data-binding]').forEach((button) => {
  button.addEventListener('click', () => startListening(button.dataset.binding))
})

settingsToggle.addEventListener('click', openSettings)
openSettingsLink.addEventListener('click', openSettings)
settingsClose.addEventListener('click', closeSettings)
settingsBackdrop.addEventListener('click', closeSettings)
resetControlsButton.addEventListener('click', resetControls)
restartButton.addEventListener('click', restartGame)

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

  const action = findActionByCode(controls, event.code)
  if (!action) return

  event.preventDefault()
  latestInput = {
    moveLeft: 'left',
    moveRight: 'right',
    softDrop: 'down',
    rotate: 'rotate',
    hold: 'hold',
    restart: 'restart'
  }[action]
})

renderControlLabels()
draw()
window.requestAnimationFrame(update)
