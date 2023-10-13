/*

Copied and modified from Odin's wasm vendor library:
https://github.com/odin-lang/Odin/blob/master/vendor/wasm/js/runtime.js

*/

import {odin_env} from './env'
import {local_storage} from './local_storage'
import * as mem from './mem'

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
        const bytes = mem.load_bytes(wasm_memory.buffer, ptr, len)
        const str = new TextDecoder().decode(bytes)

        console.log('pass_my_string:', str)
    },
    pass_my_post: function (ptr: number): void {
        const data = new DataView(wasm_memory.buffer)

        const offset = new mem.ByteOffset(ptr)

        /* id: int */
        const id = mem.load_uint(data, offset.off(mem.REG_SIZE))
        console.log('pass_my_post id:', id)

        /* title: string */
        const title_ptr = mem.load_uint(data, offset.off(mem.REG_SIZE))
        const title_len = mem.load_uint(data, offset.off(mem.REG_SIZE))
        const title = mem.load_string_buffer(data.buffer, title_ptr, title_len)
        console.log('pass_my_post title:', title)

        /* content: string */
        const content_ptr = mem.load_uint(data, offset.off(mem.REG_SIZE))
        const content_len = mem.load_uint(data, offset.off(mem.REG_SIZE))
        const content = mem.load_string_buffer(data.buffer, content_ptr, content_len)
        console.log('pass_my_post content:', content)
    },
    pass_types: function (ptr: number): void {
        console.log('pass_types ptr:', ptr)

        const offset = new mem.ByteOffset(ptr)
        const data = new DataView(wasm_memory.buffer)

        const int = mem.load_offset_i32(data, offset)
        const i8 = mem.load_offset_i8(data, offset)
        const i16 = mem.load_offset_i16(data, offset)
        const i32 = mem.load_offset_i32(data, offset)
        const i64 = mem.load_offset_i64(data, offset)
        const i128 = mem.load_offset_i128(data, offset)

        const uint = mem.load_offset_uint(data, offset)
        const u8 = mem.load_offset_u8(data, offset)
        const u16 = mem.load_offset_u16(data, offset)
        const u32 = mem.load_offset_u32(data, offset)
        const u64 = mem.load_offset_u64(data, offset)
        const u128 = mem.load_offset_u128(data, offset)
        const uintptr = mem.load_offset_ptr(data, offset)

        const i16le = mem.load_offset_i16le(data, offset)
        const i32le = mem.load_offset_i32le(data, offset)
        const i64le = mem.load_offset_i64le(data, offset)
        const i128le = mem.load_offset_i128le(data, offset)
        const u16le = mem.load_offset_u16le(data, offset)
        const u32le = mem.load_offset_u32le(data, offset)
        const u64le = mem.load_offset_u64le(data, offset)
        const u128le = mem.load_offset_u128le(data, offset)

        const i16be = mem.load_offset_i16be(data, offset)
        const i32be = mem.load_offset_i32be(data, offset)
        const i64be = mem.load_offset_i64be(data, offset)
        const i128be = mem.load_offset_i128be(data, offset)
        const u16be = mem.load_offset_u16be(data, offset)
        const u32be = mem.load_offset_u32be(data, offset)
        const u64be = mem.load_offset_u64be(data, offset)
        const u128be = mem.load_offset_u128be(data, offset)

        const f16 = mem.load_offset_f16(data, offset)
        const f32 = mem.load_offset_f32(data, offset)
        const f64 = mem.load_offset_f64(data, offset)

        const f16le = mem.load_offset_f16le(data, offset)
        const f32le = mem.load_offset_f32le(data, offset)
        const f64le = mem.load_offset_f64le(data, offset)

        const f16be = mem.load_offset_f16be(data, offset)
        const f32be = mem.load_offset_f32be(data, offset)
        const f64be = mem.load_offset_f64be(data, offset)

        const bool = mem.load_offset_bool(data, offset)
        const b8 = mem.load_offset_b8(data, offset)
        const b16 = mem.load_offset_b16(data, offset)
        const b32 = mem.load_offset_b32(data, offset)
        const b64 = mem.load_offset_b64(data, offset)

        const string = mem.load_offset_string(data, offset)
        const cstring = mem.load_offset_cstring(data, offset)
        const rune = mem.load_offset_rune(data, offset)
        const rawptr = mem.load_offset_ptr(data, offset)
        const byte = mem.load_offset_byte(data, offset)

        console.log(`
            int: ${int}
            i8: ${i8}
            i16: ${i16}
            i32: ${i32}
            i64: ${i64}
            i128: ${i128}
            uint: ${uint}
            u8: ${u8}
            u16: ${u16}
            u32: ${u32}
            u64: ${u64}
            u128: ${u128}
            uintptr: ${uintptr}
            i16le: ${i16le}
            i32le: ${i32le}
            i64le: ${i64le}
            i128le: ${i128le}
            u16le: ${u16le}
            u32le: ${u32le}
            u64le: ${u64le}
            u128le: ${u128le}
            i16be: ${i16be}
            i32be: ${i32be}
            i64be: ${i64be}
            i128be: ${i128be}
            u16be: ${u16be}
            u32be: ${u32be}
            u64be: ${u64be}
            u128be: ${u128be}
            f16: ${f16}
            f32: ${f32}
            f64: ${f64}
            f16le: ${f16le}
            f32le: ${f32le}
            f64le: ${f64le}
            f16be: ${f16be}
            f32be: ${f32be}
            f64be: ${f64be}
            bool: ${bool}
            b8: ${b8}
            b16: ${b16}
            b32: ${b32}
            b64: ${b64}
            string: ${string}
            rune: ${rune}
            rawptr: ${rawptr}
            byte: ${byte}
            cstring: ${cstring}
        `)

        debugger
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
        const types_ptr = odin_exports.call_me(odin_ctx)

        console.log('types_ptr', types_ptr)
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
