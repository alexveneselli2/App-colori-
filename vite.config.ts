import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// CAPACITOR=true  → base './' (file:// loading on device)
// default         → base '/App-colori-/' (GitHub Pages)
const isCapacitor = process.env.CAPACITOR === 'true'

export default defineConfig({
  plugins: [react()],
  base: isCapacitor ? './' : '/App-colori-/',
})
