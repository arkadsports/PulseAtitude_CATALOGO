import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/** Em desenvolvimento, serve /img/* de IMG_DIR — as fotos ficam fora do projeto
 *  (e do OneDrive), numa pasta como C:\PulseFotos. Em produção quem serve é o R2. */
function fotosDeFora(dir: string | undefined): Plugin {
  return {
    name: 'fotos-de-fora',
    apply: 'serve',
    configureServer(server) {
      if (!dir) return
      const raiz = path.resolve(dir)
      server.middlewares.use('/img', (req, res, next) => {
        const arquivo = path.join(raiz, decodeURIComponent((req.url || '').split('?')[0]))
        if (!arquivo.startsWith(raiz) || !fs.existsSync(arquivo)) return next()
        res.setHeader('Content-Type', 'image/webp')
        fs.createReadStream(arquivo).pipe(res)
      })
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), fotosDeFora(loadEnv(mode, process.cwd(), '').IMG_DIR)],
  resolve: {
    // "@/..." aponta para src/ — é o caminho que os componentes shadcn/ui usam.
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
}))
