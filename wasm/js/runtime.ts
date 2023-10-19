/*

Copied and modified from Odin's wasm vendor library:
https://github.com/odin-lang/Odin/blob/master/vendor/wasm/js/runtime.js

*/

import {odin_env} from './env'
import {local_storage} from './local_storage'
import * as mem from './mem'

export type OdinExports = {
    memory: WebAssembly.Memory
    _start: () => void
    _end: () => void
    default_context_ptr: () => number

    store_own_post: (content_length: number) => void
}

let string_to_pass: string | null = null

const load_last_string = (buf_ptr: number, buf_len: number): number => {
    if (string_to_pass === null) throw new Error('string_to_pass is null')

    const str = string_to_pass
    string_to_pass = null

    return mem.store_raw_string(wasm_memory.buffer, buf_ptr, buf_len, str)
}

export const storeOwnPost = (content: string): void => {
    string_to_pass = content
    odin_exports.store_own_post(content.length)
}

const env = {
    load_last_string: load_last_string,
}

export let wasm_memory: WebAssembly.Memory
export let odin_exports: OdinExports

export type WasmResult = {
    wasm_memory: WebAssembly.Memory
    odin_exports: OdinExports
}

export const runWasm = async (wasm_path: string): Promise<WasmResult> => {
    const imports: WebAssembly.Imports = {
        env: env,
        odin_env: odin_env,
        local_storage: local_storage,
    }

    const response = await fetch(wasm_path)
    const file = await response.arrayBuffer()
    const wasm = await WebAssembly.instantiate(file, imports)
    odin_exports = wasm.instance.exports as any as OdinExports

    wasm_memory = odin_exports.memory

    console.log('Exports', odin_exports)
    console.log('Memory', odin_exports.memory)

    odin_exports._start()
    odin_exports._end()

    return {
        wasm_memory: wasm_memory,
        odin_exports: odin_exports,
    }
}
