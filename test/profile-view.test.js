import test from 'node:test'
import assert from 'node:assert/strict'

import { createProfileAccessModel } from '../src/js/leaderboard/profileView.js'

test('guest profile access invites the player to sign in', () => {
  assert.deepEqual(createProfileAccessModel({ status: 'guest' }, { nickname: 'Guest' }), {
    name: 'Guest',
    status: 'Iniciar sesión',
    title: 'Iniciar sesión con Google para personalizar tu perfil',
    signedIn: false
  })
})

test('signed-in profile access exposes the editable profile hub', () => {
  assert.deepEqual(createProfileAccessModel({ status: 'signed-in' }, { nickname: 'Dani' }), {
    name: 'Dani',
    status: 'Mi perfil',
    title: 'Abrir el perfil de Dani',
    signedIn: true
  })
})
