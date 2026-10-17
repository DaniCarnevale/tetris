export const CONTROL_ACTIONS = [
  'moveLeft',
  'moveRight',
  'softDrop',
  'rotate',
  'hold',
  'restart'
]

export const DEFAULT_CONTROLS = Object.freeze({
  moveLeft: 'ArrowLeft',
  moveRight: 'ArrowRight',
  softDrop: 'ArrowDown',
  rotate: 'ArrowUp',
  hold: 'KeyS',
  restart: 'Enter'
})

const KEY_LABELS = {
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowDown: '↓',
  ArrowUp: '↑',
  Space: 'Espacio',
  Enter: 'Enter',
  Escape: 'Esc'
}

export function createControls (overrides = {}) {
  return CONTROL_ACTIONS.reduce((controls, action) => {
    const code = overrides[action]
    controls[action] = typeof code === 'string' && code.length > 0
      ? code
      : DEFAULT_CONTROLS[action]
    return controls
  }, {})
}

export function readStoredControls (storedValue) {
  if (typeof storedValue !== 'string') return createControls()

  try {
    const parsed = JSON.parse(storedValue)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return createControls()
    }

    return createControls(parsed)
  } catch {
    return createControls()
  }
}

export function updateControl (controls, action, code) {
  if (!CONTROL_ACTIONS.includes(action) || typeof code !== 'string' || code.length === 0) {
    return createControls(controls)
  }

  return createControls({ ...controls, [action]: code })
}

export function findActionByCode (controls, code) {
  return CONTROL_ACTIONS.find((action) => controls[action] === code) ?? null
}

export function getKeyLabel (code) {
  if (KEY_LABELS[code]) return KEY_LABELS[code]
  if (code.startsWith('Key')) return code.slice(3)
  if (code.startsWith('Digit')) return code.slice(5)
  return code
}
