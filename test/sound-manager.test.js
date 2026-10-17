import test from 'node:test'
import assert from 'node:assert/strict'

import { createSoundManager } from '../src/js/audio/soundManager.js'

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
  }

  connect () {}

  start (time) {
    this.startTime = time
  }

  stop (time) {
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
    this.state = 'running'
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
