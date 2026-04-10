import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/App-colori-/',
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // React separato — cambia raramente, cacheable a lungo
          'react-vendor':    ['react', 'react-dom', 'react-router-dom'],
          // Supabase client — pesante e indipendente
          'supabase-vendor': ['@supabase/supabase-js'],
          // Librerie usate solo nell'export — caricate solo quando serve
          'export-vendor':   ['html-to-image'],
          // Confetti — usato solo dopo il salvataggio
          'confetti-vendor': ['canvas-confetti'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
