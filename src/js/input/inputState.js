const CONTINUOUS_ACTIONS = new Set(['moveLeft', 'moveRight', 'softDrop', 'left', 'right', 'down'])

export function createInputBuffer () {
  return {
    held: new Set(),
    heldOrder: [],
    queue: []
  }
}

export function enqueueInputAction (input, action, { repeat = false } = {}) {
  if (!input || typeof action !== 'string' || action.length === 0) return

  if (CONTINUOUS_ACTIONS.has(action)) {
    if (!repeat && input.held.has(action)) return
    input.held.add(action)
    input.heldOrder = input.heldOrder.filter((heldAction) => heldAction !== action)
    input.heldOrder.push(action)
  }

  input.queue.push(action)
}

export function releaseInputAction (input, action) {
  if (!input || typeof action !== 'string') return
  input.held.delete(action)
  input.heldOrder = input.heldOrder.filter((heldAction) => heldAction !== action)
}

export function drainInputActions (input) {
  if (!input) return []
  const actions = input.queue.slice()
  input.queue.length = 0
  return actions
}

export function getHeldInputAction (input, actions) {
  if (!input || !Array.isArray(actions) || actions.length === 0) return null

  for (let index = input.heldOrder.length - 1; index >= 0; index -= 1) {
    const action = input.heldOrder[index]
    if (input.held.has(action) && actions.includes(action)) return action
  }

  return null
}
