/* global window */

const LINE_CLEAR_SEQUENCES = {
  1: [523.25],
  2: [523.25, 659.25],
  3: [523.25, 659.25, 783.99],
  4: [523.25, 659.25, 783.99, 1046.5, 1318.51]
}

export function getLineClearSequence (lines) {
  return LINE_CLEAR_SEQUENCES[Math.min(Math.max(lines, 1), 4)]
}

function getAudioContextConstructor () {
  return window.AudioContext || window.webkitAudioContext || null
}

function scheduleTone (context, frequency, startTime, duration, type, volume) {
  const oscillator = context.createOscillator()
  const gain = context.createGain()

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, startTime)
  gain.gain.setValueAtTime(0.0001, startTime)
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.018)
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(startTime)
  oscillator.stop(startTime + duration + 0.03)
}

export function createSoundManager () {
  let context = null
  let enabled = true

  function ensureContext () {
    if (!enabled) return null

    const AudioContextConstructor = getAudioContextConstructor()
    if (!AudioContextConstructor) return null

    if (!context) context = new AudioContextConstructor()
    if (context.state === 'suspended') context.resume()
    return context
  }

  function playLineClear (lines) {
    const audioContext = ensureContext()
    const sequence = getLineClearSequence(lines)
    if (!audioContext || !sequence) return

    const startTime = audioContext.currentTime
    const interval = lines === 4 ? 0.085 : 0.12
    sequence.forEach((frequency, index) => {
      scheduleTone(audioContext, frequency, startTime + index * interval, lines === 4 ? 0.28 : 0.2, lines === 4 ? 'sawtooth' : 'triangle', lines === 4 ? 0.055 : 0.07)
    })
  }

  function playLevelUp () {
    const audioContext = ensureContext()
    if (!audioContext) return

    const startTime = audioContext.currentTime
    const sequence = [392, 523.25, 659.25, 783.99]
    sequence.forEach((frequency, index) => {
      scheduleTone(audioContext, frequency, startTime + index * 0.105, 0.26, 'sine', 0.065)
    })
  }

  function playGameOver () {
    const audioContext = ensureContext()
    if (!audioContext) return

    const startTime = audioContext.currentTime
    const sequence = [392, 329.63, 261.63]
    sequence.forEach((frequency, index) => {
      scheduleTone(audioContext, frequency, startTime + index * 0.16, 0.28, 'sine', 0.06)
    })
  }

  return {
    unlock: ensureContext,
    playLineClear,
    playLevelUp,
    playGameOver,
    setEnabled (value) {
      enabled = Boolean(value)
    },
    isEnabled () {
      return enabled
    }
  }
}
