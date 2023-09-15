import * as vite from 'vite'
import solid from 'vite-plugin-solid'

export default vite.defineConfig({
    server: {
        port: 3000,
    },
    plugins: [
        solid({
            hot: false,
        }),
    ],
})
