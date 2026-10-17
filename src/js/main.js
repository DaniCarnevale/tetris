/* global document, window */

import { BLOCK_SIZE, BOARD_HEIGHT, BOARD_WIDTH } from './config/config.js'
import { createGame, holdActivePiece, moveActivePiece, resetGame, rotateActivePiece } from './game/engine.js'
import { getCurrentLevel } from './managers/levelManager.js'
import '../styles/style.css'

const boardCanvas = document.querySelector('#board')
const nextCanvas = document.querySelector('.next')
const savedCanvas = document.querySelector('.saved')
const scoreElement = document.querySelector('#score')
const levelElement = document.querySelector('#level')
const statusElement = document.querySelector('#status')
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
let dropCounter = 0
let lastTime = 0
let latestInput = null

function drawPiecePreview (context, canvas, piece) {
  context.fillStyle = '#000'
  context.fillRect(0, 0, canvas.width, canvas.height)

  if (!piece) return

  piece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        context.fillStyle = piece.color
        context.fillRect(x, y, 1, 1)
      }
    })
  })
}

function drawBoard () {
  boardContext.fillStyle = '#000'
  boardContext.fillRect(0, 0, boardCanvas.width, boardCanvas.height)

  game.board.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== null) {
        boardContext.fillStyle = value
        boardContext.fillRect(x, y, 1, 1)
      }
    })
  })

  game.activePiece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        boardContext.fillStyle = game.activePiece.color
        boardContext.fillRect(
          x + game.activePiece.position.x,
          y + game.activePiece.position.y,
          1,
          1
        )
      }
    })
  })
}

function updateHud () {
  const currentLevel = getCurrentLevel(game.score)
  scoreElement.textContent = game.score
  levelElement.textContent = currentLevel.level
  statusElement.textContent = game.gameOver
    ? 'Game over — press Enter to restart'
    : 'Arrows move · Up rotates · S holds'
}

function draw () {
  drawBoard()
  drawPiecePreview(nextContext, nextCanvas, game.nextPiece)
  drawPiecePreview(savedContext, savedCanvas, game.heldPiece)
  updateHud()
}

function handleInput () {
  if (latestInput === null) return

  if (latestInput === 'restart' && game.gameOver) {
    game = resetGame(game)
    dropCounter = 0
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

const keyActions = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowDown: 'down',
  ArrowUp: 'rotate',
  s: 'hold',
  S: 'hold',
  Enter: 'restart'
}

document.addEventListener('keydown', (event) => {
  const action = keyActions[event.key]
  if (!action) return

  event.preventDefault()
  latestInput = action
})

draw()
window.requestAnimationFrame(update)
