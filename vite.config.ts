import unocss from 'unocss/vite'
import * as vite from 'vite'

export default vite.defineConfig({
    server: {
        port: 3000,
        host: true,
        hmr: false,
    },
    plugins: [
        // congig in ./uno.config.ts
        unocss(),
    ],
})
