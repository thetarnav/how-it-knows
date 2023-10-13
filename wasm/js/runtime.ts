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
    pass_my_string: (ptr: number, len: number): void => {
        // const len = wsi.loadU32(ptr)
        // const str_ptr = ptr + REG_LEN
        const bytes = mem.load_bytes(wasm_memory.buffer, ptr, len)
        const str = new TextDecoder().decode(bytes)

        console.log('pass_my_string:', str)
    },
    pass_my_post: (ptr: number): void => {
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
    pass_types: (types_ptr: number, from_js_ptr: number): void => {
        console.log('pass_types ptr:', types_ptr)

        let offset = new mem.ByteOffset(types_ptr)
        const data = new DataView(wasm_memory.buffer)

        const types = {
            int: mem.load_offset_int(data, offset),
            i8: mem.load_offset_i8(data, offset),
            i16: mem.load_offset_i16(data, offset),
            i32: mem.load_offset_i32(data, offset),
            i64: mem.load_offset_i64(data, offset),
            i128: mem.load_offset_i128(data, offset),

            uint: mem.load_offset_uint(data, offset),
            u8: mem.load_offset_u8(data, offset),
            u16: mem.load_offset_u16(data, offset),
            u32: mem.load_offset_u32(data, offset),
            u64: mem.load_offset_u64(data, offset),
            u128: mem.load_offset_u128(data, offset),
            uintptr: mem.load_offset_ptr(data, offset),

            i16le: mem.load_offset_i16le(data, offset),
            i32le: mem.load_offset_i32le(data, offset),
            i64le: mem.load_offset_i64le(data, offset),
            i128le: mem.load_offset_i128le(data, offset),
            u16le: mem.load_offset_u16le(data, offset),
            u32le: mem.load_offset_u32le(data, offset),
            u64le: mem.load_offset_u64le(data, offset),
            u128le: mem.load_offset_u128le(data, offset),

            i16be: mem.load_offset_i16be(data, offset),
            i32be: mem.load_offset_i32be(data, offset),
            i64be: mem.load_offset_i64be(data, offset),
            i128be: mem.load_offset_i128be(data, offset),
            u16be: mem.load_offset_u16be(data, offset),
            u32be: mem.load_offset_u32be(data, offset),
            u64be: mem.load_offset_u64be(data, offset),
            u128be: mem.load_offset_u128be(data, offset),

            f16: mem.load_offset_f16(data, offset),
            f32: mem.load_offset_f32(data, offset),
            f64: mem.load_offset_f64(data, offset),

            f16le: mem.load_offset_f16le(data, offset),
            f32le: mem.load_offset_f32le(data, offset),
            f64le: mem.load_offset_f64le(data, offset),

            f16be: mem.load_offset_f16be(data, offset),
            f32be: mem.load_offset_f32be(data, offset),
            f64be: mem.load_offset_f64be(data, offset),

            bool: mem.load_offset_bool(data, offset),
            b8: mem.load_offset_b8(data, offset),
            b16: mem.load_offset_b16(data, offset),
            b32: mem.load_offset_b32(data, offset),
            b64: mem.load_offset_b64(data, offset),

            string: mem.load_offset_string(data, offset),
            cstring: mem.load_offset_cstring(data, offset),
            rune: mem.load_offset_rune(data, offset),
            rawptr: mem.load_offset_ptr(data, offset),
            byte: mem.load_offset_byte(data, offset),
        }

        console.log('types', types)

        offset = new mem.ByteOffset(from_js_ptr)

        console.log('from_js_ptr:', from_js_ptr)

        mem.store_offset_int(data, offset, types.i32)
        mem.store_offset_i8(data, offset, types.i8)
        mem.store_offset_i16(data, offset, types.i16)
        mem.store_offset_i32(data, offset, types.i32)
        mem.store_offset_i64(data, offset, types.i64)
        mem.store_offset_i128(data, offset, types.i128)

        mem.store_offset_uint(data, offset, types.uint)
        mem.store_offset_u8(data, offset, types.u8)
        mem.store_offset_u16(data, offset, types.u16)
        mem.store_offset_u32(data, offset, types.u32)
        mem.store_offset_u64(data, offset, types.u64)
        mem.store_offset_u128(data, offset, types.u128)
        mem.store_offset_ptr(data, offset, types.rawptr)

        mem.store_offset_i16le(data, offset, types.i16le)
        mem.store_offset_i32le(data, offset, types.i32le)
        mem.store_offset_i64le(data, offset, types.i64le)
        mem.store_offset_i128le(data, offset, types.i128le)
        mem.store_offset_u16le(data, offset, types.u16le)
        mem.store_offset_u32le(data, offset, types.u32le)
        mem.store_offset_u64le(data, offset, types.u64le)
        mem.store_offset_u128le(data, offset, types.u128le)

        mem.store_offset_i16be(data, offset, types.i16be)
        mem.store_offset_i32be(data, offset, types.i32be)
        mem.store_offset_i64be(data, offset, types.i64be)
        mem.store_offset_i128be(data, offset, types.i128be)
        mem.store_offset_u16be(data, offset, types.u16be)
        mem.store_offset_u32be(data, offset, types.u32be)
        mem.store_offset_u64be(data, offset, types.u64be)
        mem.store_offset_u128be(data, offset, types.u128be)

        mem.store_offset_f16(data, offset, types.f16)
        mem.store_offset_f32(data, offset, types.f32)
        mem.store_offset_f64(data, offset, types.f64)

        mem.store_offset_f16le(data, offset, types.f16le)
        mem.store_offset_f32le(data, offset, types.f32le)
        mem.store_offset_f64le(data, offset, types.f64le)

        mem.store_offset_f16be(data, offset, types.f16be)
        mem.store_offset_f32be(data, offset, types.f32be)
        mem.store_offset_f64be(data, offset, types.f64be)

        mem.store_offset_bool(data, offset, types.bool)
        mem.store_offset_b8(data, offset, types.b8)
        mem.store_offset_b16(data, offset, types.b16)
        mem.store_offset_b32(data, offset, types.b32)
        mem.store_offset_b64(data, offset, types.b64)

        mem.store_offset_string(data, offset, types.string)
        mem.store_offset_cstring(data, offset, types.cstring)
        mem.store_offset_rune(data, offset, types.rune)
        mem.store_offset_ptr(data, offset, types.rawptr)
        mem.store_offset_byte(data, offset, types.byte)

        // debugger
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
