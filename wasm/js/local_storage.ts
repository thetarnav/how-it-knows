import * as mem from './mem'
import {wasm_memory} from './runtime'

export const local_storage = {
    ls_get: function (k_ptr: number, k_len: number, buf_ptr: number, buf_len: number): number {
        const key = mem.load_raw_string(wasm_memory.buffer, k_ptr, k_len)
        let val = localStorage.getItem(key)
        if (val === null) return 0

        buf_len = Math.min(buf_len, val.length)
        val = val.substring(0, buf_len)
        mem.store_raw_string(wasm_memory.buffer, buf_ptr, val)

        return buf_len
    },

    ls_set: function (k_ptr: number, k_len: number, v_ptr: number, v_len: number): void {
        const key = mem.load_raw_string(wasm_memory.buffer, k_ptr, k_len)
        const val = mem.load_raw_string(wasm_memory.buffer, v_ptr, v_len)
        localStorage.setItem(key, val)
    },

    ls_remove: function (k_ptr: number, k_len: number): void {
        const key = mem.load_raw_string(wasm_memory.buffer, k_ptr, k_len)
        localStorage.removeItem(key)
    },

    ls_clear: function (): void {
        localStorage.clear()
    },
}
