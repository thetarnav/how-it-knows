import * as wasm from '../wasm/js/runtime.js'

export const {odin_exports, wasm_memory} = await wasm.runWasm('wasm/dist/lib.wasm')
