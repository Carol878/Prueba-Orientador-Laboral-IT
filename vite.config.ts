/*import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})*/
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/', // Se sirve en la raíz del dominio propio orientador.fad.es (ver public/CNAME)
  build: {
    // three.js (~530 kB, 131 kB gzip) va en un chunk aparte que solo se carga en el login.
    chunkSizeWarningLimit: 600,
  },
})
