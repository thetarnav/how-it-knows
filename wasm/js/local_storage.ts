import {wmi} from './runtime'

export function ls_get(k_ptr: number, k_len: number, buf_ptr: number, buf_len: number): number {
    const key = wmi.loadString(k_ptr, k_len)
    let val = localStorage.getItem(key)
    if (val === null) return 0

    buf_len = Math.min(buf_len, val.length)
    val = val.substring(0, buf_len)
    wmi.loadBytes(buf_ptr, buf_len).set(new TextEncoder().encode(val))

    return buf_len
}

export function ls_set(k_ptr: number, k_len: number, v_ptr: number, v_len: number): void {
    const key = wmi.loadString(k_ptr, k_len)
    const val = wmi.loadString(v_ptr, v_len)
    localStorage.setItem(key, val)
}

export function ls_remove(k_ptr: number, k_len: number): void {
    const key = wmi.loadString(k_ptr, k_len)
    localStorage.removeItem(key)
}

export function ls_clear(): void {
    localStorage.clear()
}
