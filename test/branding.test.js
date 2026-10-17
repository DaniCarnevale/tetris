import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const indexHtml = await readFile(new URL('../src/index.html', import.meta.url), 'utf8')

test('uses the MK Tetris identity in document metadata', () => {
  assert.match(indexHtml, /<title>MK Tetris — Neon Stack<\/title>/)
  assert.match(indexHtml, /<link rel="icon" type="image\/png" href="\.\/assets\/mk-tetris-logo\.png" \/>/)
})

test('uses the generated MK emblem in both visible brand lockups', () => {
  const logoReferences = indexHtml.match(/src="\.\/assets\/mk-tetris-logo\.png"/g) ?? []

  assert.equal(logoReferences.length, 2)
  assert.equal((indexHtml.match(/<h1>MK TETRIS<\/h1>/g) ?? []).length, 2)
  assert.doesNotMatch(indexHtml, /<div class="brand-mark"[^>]*>✦<\/div>/)
})
