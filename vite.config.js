import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // the ~300 rendered icons in src/assets/toy stay separate files (fetched only when shown,
    // cached by the service worker) instead of being inlined into the main bundle
    assetsInlineLimit: (file) => (/[\\/]assets[\\/]toy[\\/]/.test(file) ? false : undefined),
    // Two parts of the startup code get their own files, loaded alongside the entry script: React, and the
    // crop tables. Neither changes from one deploy to the next, so a returning visitor keeps them cached and
    // only re-downloads the app code that did change.
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'crop-data', test: /src[\\/]data[\\/](crops|regional-overrides)\.js$/ },
          ],
        },
      },
    },
  },
})
