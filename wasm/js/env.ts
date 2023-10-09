import {loadString} from './mem'
import {wasm_memory} from './runtime'

function stripNewline(str: string): string {
    return str.replace(/\n$/, ' ')
}

let buffer = ''
let last_fd: null | number = null

const writeToConsole = function (fd: number, str: string): void {
    switch (true) {
        // invalid fd
        case fd !== 1 && fd !== 2:
            buffer = ''
            last_fd = null
            throw new Error(`Invalid fd (${fd}) to 'write' ${stripNewline(str)}`)
        // flush on newline
        case str === '\n':
            // eslint-disable-next-line no-console
            fd === 1 ? console.log(buffer) : console.error(buffer)
            buffer = ''
            last_fd = null
            break
        // flush on fd change
        case last_fd !== fd && last_fd !== null:
            buffer = ''
            last_fd = fd
            break
        // append to buffer
        default:
            buffer += str
            last_fd = fd
    }
}

export const odin_env = {
    write: (fd: number, ptr: number, len: number): void => {
        const str = loadString(wasm_memory, ptr, len)
        writeToConsole(fd, str)
    },
    trap: (): never => {
        throw new Error()
    },
    alert: (ptr: number, len: number): void => {
        alert(loadString(wasm_memory, ptr, len))
    },
    abort: (): never => {
        throw new Error('abort')
    },
    evaluate: (str_ptr: number, str_len: number) => {
        void eval.call(null, loadString(wasm_memory, str_ptr, str_len))
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
