import {loadBytes, loadString} from './mem'
import {wasm_memory} from './runtime'

export const local_storage = {
    ls_get: function (k_ptr: number, k_len: number, buf_ptr: number, buf_len: number): number {
        const key = loadString(wasm_memory, k_ptr, k_len)
        let val = localStorage.getItem(key)
        if (val === null) return 0

        buf_len = Math.min(buf_len, val.length)
        val = val.substring(0, buf_len)
        loadBytes(wasm_memory, buf_ptr, buf_len).set(new TextEncoder().encode(val))

        return buf_len
    },

    ls_set: function (k_ptr: number, k_len: number, v_ptr: number, v_len: number): void {
        const key = loadString(wasm_memory, k_ptr, k_len)
        const val = loadString(wasm_memory, v_ptr, v_len)
        localStorage.setItem(key, val)
    },

    ls_remove: function (k_ptr: number, k_len: number): void {
        const key = loadString(wasm_memory, k_ptr, k_len)
        localStorage.removeItem(key)
    },

    ls_clear: function (): void {
        localStorage.clear()
    },
}
