import test from 'node:test'
import assert from 'node:assert/strict'

import { createSoundManager, getMusicSequence } from '../src/js/audio/soundManager.js'

class FakeParam {
  constructor () {
    this.value = 0
    this.calls = []
  }

  setValueAtTime (value, time) {
    this.value = value
    this.calls.push(['set', value, time])
  }

  exponentialRampToValueAtTime (value, time) {
    this.value = value
    this.calls.push(['exponentialRamp', value, time])
  }

  cancelScheduledValues (time) {
    this.calls.push(['cancel', time])
  }
}

class FakeOscillator {
  constructor () {
    this.frequency = new FakeParam()
    this.stops = []
    this.onended = null
    this.throwOnSecondStop = false
  }

  connect () {}

  start (time) {
    this.startTime = time
  }

  stop (time) {
    if (this.throwOnSecondStop && this.stops.length > 0) throw new Error('already stopped')
    this.stops.push(time)
  }
}

class FakeGain {
  constructor () {
    this.gain = new FakeParam()
  }

  connect () {}
}

class FakeAudioContext {
  static instances = []

  constructor () {
    this.currentTime = 10
    this.state = FakeAudioContext.initialState
    this.destination = {}
    this.oscillators = []
    FakeAudioContext.instances.push(this)
  }

  createOscillator () {
    const oscillator = new FakeOscillator()
    this.oscillators.push(oscillator)
    return oscillator
  }

  createGain () {
    return new FakeGain()
  }

  resume () {
    this.state = 'running'
    return Promise.resolve()
  }
}

FakeAudioContext.initialState = 'running'

function createManagerForTest () {
  FakeAudioContext.instances = []
  globalThis.window = {
    AudioContext: FakeAudioContext,
    webkitAudioContext: null,
    setTimeout: () => 1,
    clearTimeout: () => {}
  }
  return createSoundManager()
}

test('stopping music cancels already scheduled notes before resuming', () => {
  const manager = createManagerForTest()
  manager.unlock()

  const context = FakeAudioContext.instances[0]
  const firstLoop = [...context.oscillators]
  assert.equal(firstLoop.length, 14)

  manager.stopMusic()
  assert.ok(firstLoop.every((oscillator) => oscillator.stops.length > 0))

  manager.playMusic()
  assert.equal(context.oscillators.length, 28)
  assert.ok(firstLoop.some((oscillator) => oscillator.stops.some((time) => time <= 10.1)))
  assert.ok(context.oscillators.slice(14).every((oscillator) => oscillator.stops.every((time) => time > 10.1)))
})

test('muting music cancels the active loop immediately', () => {
  const manager = createManagerForTest()
  manager.unlock()

  const context = FakeAudioContext.instances[0]
  manager.setMusicEnabled(false)

  assert.ok(context.oscillators.every((oscillator) => oscillator.stops.length > 0))
  assert.equal(manager.isMusicEnabled(), false)
})

test('resuming music continues at the current note instead of restarting the loop', () => {
  const manager = createManagerForTest()
  manager.unlock()

  const context = FakeAudioContext.instances[0]
  context.currentTime = 10.5
  manager.stopMusic()
  manager.playMusic()

  const resumedLoop = context.oscillators.slice(14)
  assert.equal(resumedLoop[0].frequency.value, getMusicSequence()[1].frequency)
})

test('plays game feedback and supports browser audio fallbacks', () => {
  const manager = createManagerForTest()
  manager.unlock()
  manager.playLineClear(4)
  manager.playLevelUp()
  manager.playGameOver()

  const context = FakeAudioContext.instances[0]
  assert.equal(context.oscillators.length, 26)
  context.oscillators.forEach((oscillator) => oscillator.onended?.())

  globalThis.window = {
    AudioContext: null,
    webkitAudioContext: FakeAudioContext,
    setTimeout: () => 1,
    clearTimeout: () => {}
  }
  const webkitManager = createSoundManager()
  assert.ok(webkitManager.unlock())
})

test('handles browsers without Web Audio and suspended contexts', () => {
  globalThis.window = {
    AudioContext: null,
    webkitAudioContext: null,
    setTimeout: () => 1,
    clearTimeout: () => {}
  }
  const unavailable = createSoundManager()
  assert.equal(unavailable.unlock(), null)
  unavailable.playLineClear(1)
  unavailable.playLevelUp()
  unavailable.playGameOver()
  unavailable.playMusic()
  unavailable.setEnabled(false)
  assert.equal(unavailable.isEnabled(), false)

  FakeAudioContext.instances = []
  FakeAudioContext.initialState = 'suspended'
  globalThis.window.AudioContext = FakeAudioContext
  const suspended = createSoundManager()
  suspended.unlock()
  assert.equal(FakeAudioContext.instances[0].state, 'running')
  FakeAudioContext.initialState = 'running'
})

test('resets the music loop through its timer and ignores stale callbacks', () => {
  FakeAudioContext.instances = []
  let timerCallback
  let clearCalls = 0
  globalThis.window = {
    AudioContext: FakeAudioContext,
    webkitAudioContext: null,
    setTimeout: (callback) => { timerCallback = callback; return 7 },
    clearTimeout: () => { clearCalls += 1 }
  }
  const manager = createSoundManager()
  manager.unlock()
  const context = FakeAudioContext.instances[0]
  const firstCallback = timerCallback
  firstCallback()
  assert.equal(context.oscillators.length, 28)

  context.currentTime = 100
  context.oscillators.forEach((oscillator) => { oscillator.throwOnSecondStop = true })
  manager.stopMusic()
  const oscillatorCount = context.oscillators.length
  firstCallback()
  assert.equal(context.oscillators.length, oscillatorCount)
  assert.ok(clearCalls > 0)
})

test('stops music immediately for disabled and invalid volume settings', () => {
  const manager = createManagerForTest()
  manager.setMusicVolume(2)
  assert.equal(manager.getMusicVolume(), 1)
  manager.setMusicVolume(-1)
  assert.equal(manager.getMusicVolume(), 0)
  manager.setMusicVolume('invalid')
  assert.equal(manager.getMusicVolume(), 0.5)
  manager.setMusicEnabled(false)
  assert.equal(manager.isMusicEnabled(), false)
  manager.setMusicEnabled(true)
  manager.setEnabled(false)
  manager.setEnabled(true)
  assert.equal(manager.isEnabled(), true)
})
