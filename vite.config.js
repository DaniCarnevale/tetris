import { defineConfig } from 'vite'

export default defineConfig({
  root: 'src',
  assetsInclude: ['**/*.mp3'],
  build: {
    outDir: '../dist',
    emptyOutDir: true
  }
})
