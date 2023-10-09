/*

Copied and modified from Odin's wasm vendor library:
https://github.com/odin-lang/Odin/blob/master/vendor/wasm/js/runtime.js

*/

import {odin_env} from './env'
import {local_storage} from './local_storage'
import {MemOffset, REG_LEN, loadBytes, loadString, loadUint} from './mem'

export interface OdinExports extends TestOdinExports {
    memory: WebAssembly.Memory
    _start: () => void
    _end: () => void
    default_context_ptr: () => number
}

export interface TestOdinExports {
    call_me: (ctx_ptr: number) => number
    allocate_slice: (ctx_ptr: number, size: number) => number
}

const env = {
    pass_my_string: function (ptr: number, len: number): void {
        // const len = wsi.loadU32(ptr)
        // const str_ptr = ptr + REG_LEN
        const bytes = loadBytes(wasm_memory, ptr, len)
        const str = new TextDecoder().decode(bytes)

        console.log('pass_my_string:', str)
    },
    pass_my_post: function (ptr: number): void {
        const mem = new DataView(wasm_memory.buffer)

        const offset = new MemOffset()
        offset.offset = ptr

        /* id: int */
        const id = loadUint(mem, offset.off(REG_LEN))
        console.log('pass_my_post id:', id)

        /* title: string */
        const title_ptr = loadUint(mem, offset.off(REG_LEN))
        const title_len = loadUint(mem, offset.off(REG_LEN))
        const title = loadString(wasm_memory, title_ptr, title_len)
        console.log('pass_my_post title:', title)

        /* content: string */
        const content_ptr = loadUint(mem, offset.off(REG_LEN))
        const content_len = loadUint(mem, offset.off(REG_LEN))
        const content = loadString(wasm_memory, content_ptr, content_len)
        console.log('pass_my_post content:', content)
    },
}

export let wasm_memory: WebAssembly.Memory
export let odin_exports: OdinExports

export const runWasm = async function (wasm_path: string): Promise<void> {
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

    const odin_ctx = odin_exports.default_context_ptr()

    try {
        odin_exports.call_me(odin_ctx)
    } catch (error) {
        console.error('call_me error', error)
    }

    try {
        const ptr = odin_exports.allocate_slice(odin_ctx, 64 * 1024)
        console.log('ptr', ptr)
    } catch (error) {
        console.error('allocate_slice error', error)
    }
}
