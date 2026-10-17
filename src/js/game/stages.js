import { BOARD_HEIGHT, BOARD_WIDTH } from '../config/config.js'
import { createBoard } from './board.js'

const COLORS = {
  a: '#5be7c4',
  b: '#71b7ff',
  c: '#f7c75b',
  d: '#cf83ff'
}

export const STAGES = Object.freeze([
  {
    id: 'fresh',
    name: 'Tablero limpio',
    description: 'Tablero vacío.',
    rows: []
  },
  {
    id: 'foundation',
    name: 'Fundación',
    description: 'Base baja.',
    rows: [
      '...aaa....bb...',
      '....aa..bbb...',
      '..cc......c...'
    ]
  },
  {
    id: 'ascent',
    name: 'Ascenso',
    description: 'Base irregular.',
    rows: [
      '...aaa....bb...',
      '...aaa...bbb...',
      '..ccaa...bbb...',
      '..cc....dd....',
      '.cc.....dd....'
    ]
  }
])

const BACKDROP_PROGRESS = [
  { level: 1, id: 'buenos-aires' },
  { level: 2, id: 'rosario' },
  { level: 3, id: 'humahuaca' },
  { level: 4, id: 'salta' },
  { level: 5, id: 'cordoba' },
  { level: 6, id: 'iguazu' },
  { level: 7, id: 'mendoza' },
  { level: 8, id: 'mar-del-plata' },
  { level: 9, id: 'patagonia' },
  { level: 10, id: 'perito-moreno' }
]

const CENTER_WELL_COLUMNS = new Set([
  Math.floor(BOARD_WIDTH / 2) - 1,
  Math.floor(BOARD_WIDTH / 2)
])

function randomIndex (random, length) {
  const value = Number(typeof random === 'function' ? random() : Math.random())
  const normalized = Number.isFinite(value) ? Math.min(Math.max(value, 0), 0.999999) : 0
  return Math.floor(normalized * length)
}

function randomizePattern (pattern, random) {
  const cells = pattern
    .padEnd(BOARD_WIDTH, '.')
    .slice(0, BOARD_WIDTH)
    .split('')
    .filter((cell) => COLORS[cell])

  if (cells.length === 0) return pattern

  const availableColumns = Array.from({ length: BOARD_WIDTH }, (_, column) => column)
    .filter((column) => !CENTER_WELL_COLUMNS.has(column))

  for (let index = availableColumns.length - 1; index > 0; index--) {
    const swapIndex = randomIndex(random, index + 1)
    const currentColumn = availableColumns[index]
    availableColumns[index] = availableColumns[swapIndex]
    availableColumns[swapIndex] = currentColumn
  }

  const randomizedColumns = availableColumns
    .slice(0, cells.length)
    .sort((left, right) => left - right)
  const randomizedPattern = Array(BOARD_WIDTH).fill('.')

  randomizedColumns.forEach((column, index) => {
    randomizedPattern[column] = cells[index]
  })

  return randomizedPattern.join('')
}

export function getStage (stageId) {
  return STAGES.find((stage) => stage.id === stageId) ?? STAGES[0]
}

export function createStageBoard (stageId, random = Math.random) {
  const board = createBoard()
  const stage = getStage(stageId)

  stage.rows.forEach((pattern, rowIndex) => {
    const boardRow = board[BOARD_HEIGHT - 1 - rowIndex]
    randomizePattern(pattern, random).split('').forEach((cell, column) => {
      if (COLORS[cell]) boardRow[column] = COLORS[cell]
    })
  })

  return board
}

export function getBackdropForLevel (level) {
  return BACKDROP_PROGRESS.reduce((currentBackdrop, backdrop) => {
    return level >= backdrop.level ? backdrop : currentBackdrop
  }, BACKDROP_PROGRESS[0])
}
