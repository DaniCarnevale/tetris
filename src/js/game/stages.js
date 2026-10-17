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
  { level: 3, id: 'humahuaca' },
  { level: 6, id: 'iguazu' },
  { level: 9, id: 'patagonia' }
]

export function getStage (stageId) {
  return STAGES.find((stage) => stage.id === stageId) ?? STAGES[0]
}

export function createStageBoard (stageId) {
  const board = createBoard()
  const stage = getStage(stageId)

  stage.rows.forEach((pattern, rowIndex) => {
    const boardRow = board[BOARD_HEIGHT - 1 - rowIndex]
    pattern.padEnd(BOARD_WIDTH, '.').slice(0, BOARD_WIDTH).split('').forEach((cell, column) => {
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
