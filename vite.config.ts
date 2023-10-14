import unocss from 'unocss/vite'
import {defineConfig} from 'vitest/config'

export default defineConfig({
    server: {
        port: 3000,
        host: true,
        hmr: false,
    },
    plugins: [
        // congig in ./uno.config.ts
        unocss(),
    ],
    test: {
        watch: false,
        environment: 'node',
        isolate: false,
        setupFiles: 'vitest.setup.ts',
    },
})
