import { defineConfig } from 'vite'

export default defineConfig({
  root: 'src',
  envDir: '..',
  assetsInclude: ['**/*.mp3'],
  build: {
    outDir: '../dist',
    emptyOutDir: true
  }
})
