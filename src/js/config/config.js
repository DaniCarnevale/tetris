export const BLOCK_SIZE = 20
export const BOARD_WIDTH = 14
export const BOARD_HEIGHT = 30
export const PIECES = [
  { id: 'o', label: 'Cuadrado', shortLabel: 'O', shape: [[1, 1], [1, 1]], color: '#0D0DC6' },
  { id: 'i', label: 'Línea', shortLabel: 'I', shape: [[1, 1, 1, 1]], color: '#FD151B' },
  { id: 't', label: 'T', shortLabel: 'T', shape: [[0, 1, 0], [1, 1, 1]], color: '#FDE74C' },
  { id: 's', label: 'S', shortLabel: 'S', shape: [[1, 1, 0], [0, 1, 1]], color: '#53A548' },
  { id: 'z', label: 'Z', shortLabel: 'Z', shape: [[0, 1, 1], [1, 1, 0]], color: '#9A039A' },
  { id: 'j', label: 'J', shortLabel: 'J', shape: [[1, 1], [0, 1], [0, 1]], color: '#05B2DC' },
  { id: 'l', label: 'L', shortLabel: 'L', shape: [[1, 1], [1, 0], [1, 0]], color: '#E59500' }
]
