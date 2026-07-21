import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // O plugin do Tailwind v4 substitui o antigo tailwind.config.js + postcss.
  plugins: [react(), tailwindcss()],
})
