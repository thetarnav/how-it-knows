/*

Copied and modified from Odin's wasm vendor library:
https://github.com/odin-lang/Odin/blob/master/vendor/wasm/js/runtime.js

*/

import * as odin_dom from './dom'
import * as local_storage from './local_storage'
import {MemOffset, REG_LEN, WasmMemoryInterface} from './mem'

export interface OdinExports extends TestOdinExports, odin_dom.DomOdinExports {
    memory: WebAssembly.Memory
    _start: () => void
    _end: () => void
    default_context_ptr: () => number
}

export interface TestOdinExports {
    call_me: (ctx_ptr: number) => number
    allocate_slice: (ctx_ptr: number, size: number) => number
}

function stripNewline(str: string): string {
    return str.replace(/\n$/, ' ')
}

interface ConsoleState {
    buffer: string
    last_fd: null | number
}

function writeToConsole(state: ConsoleState, fd: number, str: string): void {
    switch (true) {
        // invalid fd
        case fd !== 1 && fd !== 2:
            state.buffer = ''
            state.last_fd = null
            throw new Error(`Invalid fd (${fd}) to 'write' ${stripNewline(str)}`)
        // flush on newline
        case str === '\n':
            // eslint-disable-next-line no-console
            fd === 1 ? console.log(state.buffer) : console.error(state.buffer)
            state.buffer = ''
            state.last_fd = null
            break
        // flush on fd change
        case state.last_fd !== fd && state.last_fd !== null:
            state.buffer = ''
            state.last_fd = fd
            break
        // append to buffer
        default:
            state.buffer += str
            state.last_fd = fd
    }
}

function makeOdinEnv(wmi: WasmMemoryInterface) {
    const console_state: ConsoleState = {
        buffer: '',
        last_fd: null,
    }

    return {
        write: (fd: number, ptr: number, len: number): void => {
            const str = wmi.loadString(ptr, len)
            writeToConsole(console_state, fd, str)
        },
        trap: (): never => {
            throw new Error()
        },
        alert: (ptr: number, len: number): void => {
            alert(wmi.loadString(ptr, len))
        },
        abort: (): never => {
            throw new Error('abort')
        },
        evaluate: (str_ptr: number, str_len: number) => {
            void eval.call(null, wmi.loadString(str_ptr, str_len))
        },

        time_now: () => {
            // convert ms to ns
            return Date.now() * 1e6
        },
        tick_now: () => {
            // convert ms to ns
            return performance.now() * 1e6
        },
        time_sleep: (duration_ms: number) => {
            if (duration_ms > 0) {
                // TODO(bill): Does this even make any sense?
            }
        },

        sqrt: Math.sqrt,
        sin: Math.sin,
        cos: Math.cos,
        pow: Math.pow,
        fmuladd: (x: number, y: number, z: number): number => x * y + z,
        ln: Math.log,
        exp: Math.exp,
        ldexp: (x: number, exp: number): number => x * Math.pow(2, exp),
    }
}

function pass_my_string(ptr: number, len: number): void {
    // const len = wsi.loadU32(ptr)
    // const str_ptr = ptr + REG_LEN
    const bytes = wmi.loadBytes(ptr, len)
    const str = new TextDecoder().decode(bytes)

    console.log('pass_my_string:', str)
}
function pass_my_post(ptr: number): void {
    const offset = new MemOffset()
    offset.offset = ptr

    /* id: int */
    const id = wmi.loadUint(offset.off(REG_LEN))
    console.log('pass_my_post id:', id)

    /* title: string */
    const title_ptr = wmi.loadUint(offset.off(REG_LEN))
    const title_len = wmi.loadUint(offset.off(REG_LEN))
    const title = wmi.loadString(title_ptr, title_len)
    console.log('pass_my_post title:', title)

    /* content: string */
    const content_ptr = wmi.loadUint(offset.off(REG_LEN))
    const content_len = wmi.loadUint(offset.off(REG_LEN))
    const content = wmi.loadString(content_ptr, content_len)
    console.log('pass_my_post content:', content)
}

export let wmi: WasmMemoryInterface

export async function runWasm(wasmPath: string) {
    wmi = new WasmMemoryInterface()

    const imports = {
        env: {
            pass_my_string,
            pass_my_post,
        },
        odin_env: makeOdinEnv(wmi),
        odin_dom: odin_dom,
        local_storage: local_storage,
    }

    const response = await fetch(wasmPath)
    const file = await response.arrayBuffer()
    const wasm = await WebAssembly.instantiate(file, imports)
    const exports = wasm.instance.exports as any as OdinExports

    wmi.exports = exports
    wmi.memory = exports.memory

    console.log('Exports', exports)
    console.log('Memory', exports.memory)

    exports._start()
    exports._end()

    const odin_ctx = exports.default_context_ptr()

    try {
        const returned = exports.call_me(odin_ctx)

        // console.log('Returned', returned)

        // try {
        //     const len = wsi.loadU32(returned)
        //     const str_ptr = returned + REG_LEN
        //     const bytes = wsi.loadBytes(str_ptr, len).map(x => x + 97)
        //     const str = new TextDecoder().decode(bytes)

        //     console.log(len, [...bytes], str)

        //     let u8arr = new Uint8Array(wsi.mem.buffer, str_ptr, len)
        //     let i8arr = new Int8Array(wsi.mem.buffer, str_ptr, len)
        //     let u16arr = new Uint16Array(wsi.mem.buffer, str_ptr, len)
        //     let i16arr = new Int16Array(wsi.mem.buffer, str_ptr, len)
        //     let i32arr = new Int32Array(wsi.mem.buffer, str_ptr, len)

        //     console.log({
        //         u8arr: new TextDecoder().decode(u8arr),
        //         i8arr: new TextDecoder().decode(i8arr),
        //         u16arr: new TextDecoder().decode(u16arr),
        //         i16arr: new TextDecoder().decode(i16arr),
        //         i32arr: new TextDecoder().decode(i32arr),
        //     })

        //     console.log([...new TextEncoder().encode('nice to meet you!')])

        //     // const str = wasmMemoryInterface.loadString(returned + 4, 17)
        //     // console.log('str', str)
        // } catch (error) {
        //     console.error('loadString error', error)
        // }
    } catch (error) {
        console.error('call_me error', error)
    }

    try {
        const ptr = exports.allocate_slice(odin_ctx, 64 * 1024)
        console.log('ptr', ptr)
    } catch (error) {
        console.error('allocate_slice error', error)
    }

    return
}
