/*

Copied and modified from Odin's wasm vendor library:
https://github.com/odin-lang/Odin/blob/master/vendor/wasm/js/runtime.js

*/

const REG_SIZE = 32
const REG_LEN = REG_SIZE / 8

class MemOffset {
    offset = 0

    /**
     * Move the offset by the given amount.
     *
     * @param amount The amount to move by
     * @param alignment The alignment to use. Defaults to the minimum of the amount and the register size. Will be rounded up to the nearest multiple of the alignment.
     * @returns The previous offset
     */
    off(amount: number, alignment = Math.min(amount, REG_LEN)): number {
        if (this.offset % alignment != 0) {
            this.offset += alignment - (this.offset % alignment)
        }
        const x = this.offset
        this.offset += amount
        return x
    }
}

export interface OdinExports {
    memory: WebAssembly.Memory
    _start: () => void
    _end: () => void
    default_context_ptr: () => number
    call_me: (ctx_ptr: number, str_ptr: number, str_len: number) => number
    allocate_slice: (ctx_ptr: number, size: number) => number
    odin_dom_do_event_callback: (data: number, callback: number, ctx_ptr: number) => void
}

class WasmMemoryInterface {
    memory: WebAssembly.Memory | null = null
    exports!: OdinExports
    listenerMap = {}

    get mem(): DataView {
        return new DataView(this.memory!.buffer)
    }

    loadF32Array(addr: number, len: number): Float32Array {
        const array = new Float32Array(this.memory!.buffer, addr, len)
        return array
    }
    loadF64Array(addr: number, len: number): Float64Array {
        const array = new Float64Array(this.memory!.buffer, addr, len)
        return array
    }
    loadU32Array(addr: number, len: number): Uint32Array {
        const array = new Uint32Array(this.memory!.buffer, addr, len)
        return array
    }
    loadI32Array(addr: number, len: number): Int32Array {
        const array = new Int32Array(this.memory!.buffer, addr, len)
        return array
    }

    loadU8(addr: number): number {
        return this.mem.getUint8(addr)
    }
    loadI8(addr: number): number {
        return this.mem.getInt8(addr)
    }
    loadU16(addr: number): number {
        return this.mem.getUint16(addr, true)
    }
    loadI16(addr: number): number {
        return this.mem.getInt16(addr, true)
    }
    loadU32(addr: number): number {
        return this.mem.getUint32(addr, true)
    }
    loadI32(addr: number): number {
        return this.mem.getInt32(addr, true)
    }
    loadU64(addr: number): number {
        const lo = this.mem.getUint32(addr + 0, true)
        const hi = this.mem.getUint32(addr + 4, true)
        return lo + hi * 4294967296
    }
    loadI64(addr: number): number {
        // TODO(bill): loadI64 correctly
        const lo = this.mem.getUint32(addr + 0, true)
        const hi = this.mem.getUint32(addr + 4, true)
        return lo + hi * 4294967296
    }
    loadF32(addr: number): number {
        return this.mem.getFloat32(addr, true)
    }
    loadF64(addr: number): number {
        return this.mem.getFloat64(addr, true)
    }
    loadInt(addr: number): number {
        return this.mem.getInt32(addr, true)
    }
    loadUint(addr: number): number {
        return this.mem.getUint32(addr, true)
    }

    loadPtr(addr: number): number {
        return this.loadUint(addr)
    }

    loadBytes(ptr: number, len: number): Uint8Array {
        return new Uint8Array(this.memory!.buffer, ptr, len)
    }

    loadString(ptr: number, len: number): string {
        const bytes = this.loadBytes(ptr, len)
        return new TextDecoder().decode(bytes)
    }

    storeU8(addr: number, value: number | boolean): void {
        this.mem.setUint8(addr, value as number)
    }
    storeI8(addr: number, value: number): void {
        this.mem.setInt8(addr, value)
    }
    storeU16(addr: number, value: number): void {
        this.mem.setUint16(addr, value, true)
    }
    storeI16(addr: number, value: number): void {
        this.mem.setInt16(addr, value, true)
    }
    storeU32(addr: number, value: number): void {
        this.mem.setUint32(addr, value, true)
    }
    storeI32(addr: number, value: number): void {
        this.mem.setInt32(addr, value, true)
    }
    storeU64(addr: number, value: number): void {
        this.mem.setUint32(addr + 0, value, true)
        this.mem.setUint32(addr + 4, Math.floor(value / 4294967296), true)
    }
    storeI64(addr: number, value: number): void {
        // TODO(bill): storeI64 correctly
        this.mem.setUint32(addr + 0, value, true)
        this.mem.setUint32(addr + 4, Math.floor(value / 4294967296), true)
    }
    storeF32(addr: number, value: number): void {
        this.mem.setFloat32(addr, value, true)
    }
    storeF64(addr: number, value: number): void {
        this.mem.setFloat64(addr, value, true)
    }
    storeInt(addr: number, value: number): void {
        this.mem.setInt32(addr, value, true)
    }
    storeUint(addr: number, value: number): void {
        this.mem.setUint32(addr, value, true)
    }

    storeString(addr: number, value: string): void {
        const bytes = this.loadBytes(addr, value.length)
        void new TextEncoder().encodeInto(value, bytes)
    }
}

function getElement(name: string) {
    if (name) {
        return document.getElementById(name)
    }
    return undefined
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

function makeOdinEnv(wasm_mem: WasmMemoryInterface) {
    const console_state: ConsoleState = {
        buffer: '',
        last_fd: null,
    }

    return {
        write: (fd: number, ptr: number, len: number): void => {
            const str = wasm_mem.loadString(ptr, len)
            writeToConsole(console_state, fd, str)
        },
        trap: (): never => {
            throw new Error()
        },
        alert: (ptr: number, len: number): void => {
            alert(wasm_mem.loadString(ptr, len))
        },
        abort: (): never => {
            throw new Error('abort')
        },
        evaluate: (str_ptr: number, str_len: number) => {
            void eval.call(null, wasm_mem.loadString(str_ptr, str_len))
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

function makeOdinDom(wsi: WasmMemoryInterface) {
    const event_temp_data: {
        id_ptr: number
        id_len: number
        event: Event
        name_code: number
    } = {
        id_ptr: 0,
        id_len: 0,
        event: null!,
        name_code: 0,
    }

    return {
        init_event_raw: (event_ptr: number /*Event*/) => {
            const offset = new MemOffset()
            offset.offset = event_ptr

            const e = event_temp_data.event

            /* kind: Event_Kind */
            wsi.storeU32(offset.off(4), event_temp_data.name_code)

            /* target_kind: Event_Target_Kind */
            if (e.target == document) {
                wsi.storeU32(offset.off(4), 1)
            } else if (e.target == window) {
                wsi.storeU32(offset.off(4), 2)
            } else {
                wsi.storeU32(offset.off(4), 0)
            }

            /* current_target_kind: Event_Target_Kind */
            if (e.currentTarget == document) {
                wsi.storeU32(offset.off(4), 1)
            } else if (e.currentTarget == window) {
                wsi.storeU32(offset.off(4), 2)
            } else {
                wsi.storeU32(offset.off(4), 0)
            }

            /* id: string */
            wsi.storeUint(offset.off(REG_LEN), event_temp_data.id_ptr)
            wsi.storeUint(offset.off(REG_LEN), event_temp_data.id_len)
            wsi.storeUint(offset.off(REG_LEN), 0) // padding

            /* timestamp: f64 */
            wsi.storeF64(offset.off(8), e.timeStamp * 1e-3)

            /* phase: Event_Phase */
            wsi.storeU8(offset.off(1), e.eventPhase)

            /* options: Event_Options */
            let options = 0
            if (!!e.bubbles) {
                options |= 1 << 0 // 1
            }
            if (!!e.cancelable) {
                options |= 1 << 1 // 2
            }
            if (!!e.composed) {
                options |= 1 << 2 // 4
            }
            wsi.storeU8(offset.off(1), options)

            wsi.storeU8(offset.off(1), !!e.isComposing)
            wsi.storeU8(offset.off(1), !!e.isTrusted)

            let base = offset.off(0, 8)
            if (e instanceof MouseEvent) {
                wsi.storeI64(offset.off(8), e.screenX)
                wsi.storeI64(offset.off(8), e.screenY)
                wsi.storeI64(offset.off(8), e.clientX)
                wsi.storeI64(offset.off(8), e.clientY)
                wsi.storeI64(offset.off(8), e.offsetX)
                wsi.storeI64(offset.off(8), e.offsetY)
                wsi.storeI64(offset.off(8), e.pageX)
                wsi.storeI64(offset.off(8), e.pageY)
                wsi.storeI64(offset.off(8), e.movementX)
                wsi.storeI64(offset.off(8), e.movementY)

                wsi.storeU8(offset.off(1), !!e.ctrlKey)
                wsi.storeU8(offset.off(1), !!e.shiftKey)
                wsi.storeU8(offset.off(1), !!e.altKey)
                wsi.storeU8(offset.off(1), !!e.metaKey)

                wsi.storeI16(offset.off(2), e.button)
                wsi.storeU16(offset.off(2), e.buttons)
            } else if (e instanceof KeyboardEvent) {
                // Note: those strigs are constructed
                // on the native side from buffers that
                // are filled later, so skip them
                const keyPtr = offset.off(REG_LEN * 2, REG_LEN)
                const codePtr = offset.off(REG_LEN * 2, REG_LEN)

                wsi.storeU8(offset.off(1), e.location)

                wsi.storeU8(offset.off(1), !!e.ctrlKey)
                wsi.storeU8(offset.off(1), !!e.shiftKey)
                wsi.storeU8(offset.off(1), !!e.altKey)
                wsi.storeU8(offset.off(1), !!e.metaKey)

                wsi.storeU8(offset.off(1), !!e.repeat)

                wsi.storeI32(offset.off(REG_LEN), e.key.length)
                wsi.storeI32(offset.off(REG_LEN), e.code.length)
                wsi.storeString(offset.off(16, 1), e.key)
                wsi.storeString(offset.off(16, 1), e.code)
            } else if (e instanceof WheelEvent) {
                wsi.storeF64(offset.off(8), e.deltaX)
                wsi.storeF64(offset.off(8), e.deltaY)
                wsi.storeF64(offset.off(8), e.deltaZ)
                wsi.storeU32(offset.off(4), e.deltaMode)
            } else if (e instanceof Event) {
                if ('scrollX' in e) {
                    wsi.storeF64(offset.off(8), e.scrollX)
                    wsi.storeF64(offset.off(8), e.scrollY)
                }
            }
        },

        add_event_listener: (
            id_ptr: number,
            id_len: number,
            name_ptr: number,
            name_len: number,
            name_code: number,
            data,
            callback,
            use_capture: boolean,
        ) => {
            const id = wsi.loadString(id_ptr, id_len)
            const name = wsi.loadString(name_ptr, name_len)
            const element = getElement(id)
            if (element == undefined) return false

            const listener = (e: Event) => {
                const odin_ctx = wsi.exports.default_context_ptr()
                event_temp_data.id_ptr = id_ptr
                event_temp_data.id_len = id_len
                event_temp_data.event = e
                event_temp_data.name_code = name_code
                wsi.exports.odin_dom_do_event_callback(data, callback, odin_ctx)
            }
            wsi.listenerMap[{data: data, callback: callback}] = listener
            element.addEventListener(name, listener, !!use_capture)
            return true
        },

        remove_event_listener: (id_ptr, id_len, name_ptr, name_len, data, callback) => {
            let id = wsi.loadString(id_ptr, id_len)
            let name = wsi.loadString(name_ptr, name_len)
            let element = getElement(id)
            if (element == undefined) {
                return false
            }

            let listener = wsi.listenerMap[{data: data, callback: callback}]
            if (listener == undefined) {
                return false
            }
            element.removeEventListener(name, listener)
            return true
        },

        add_window_event_listener: (name_ptr, name_len, name_code, data, callback, use_capture) => {
            let name = wsi.loadString(name_ptr, name_len)
            let element = window
            let listener = e => {
                const odin_ctx = wsi.exports.default_context_ptr()
                event_temp_data.id_ptr = 0
                event_temp_data.id_len = 0
                event_temp_data.event = e
                event_temp_data.name_code = name_code
                wsi.exports.odin_dom_do_event_callback(data, callback, odin_ctx)
            }
            wsi.listenerMap[{data: data, callback: callback}] = listener
            element.addEventListener(name, listener, !!use_capture)
            return true
        },

        remove_window_event_listener: (name_ptr, name_len, data, callback) => {
            let name = wsi.loadString(name_ptr, name_len)
            let element = window
            let key = {data: data, callback: callback}
            let listener = wsi.listenerMap[key]
            if (!listener) {
                return false
            }
            wsi.listenerMap[key] = undefined

            element.removeEventListener(name, listener)
            return true
        },

        event_stop_propagation: () => {
            if (event_temp_data && event_temp_data.event) {
                event_temp_data.event.eventStopPropagation()
            }
        },
        event_stop_immediate_propagation: () => {
            if (event_temp_data && event_temp_data.event) {
                event_temp_data.event.eventStopImmediatePropagation()
            }
        },
        event_prevent_default: () => {
            if (event_temp_data && event_temp_data.event) {
                event_temp_data.event.preventDefault()
            }
        },

        dispatch_custom_event: (id_ptr, id_len, name_ptr, name_len, options_bits) => {
            let id = wsi.loadString(id_ptr, id_len)
            let name = wsi.loadString(name_ptr, name_len)
            let options = {
                bubbles: (options_bits & (1 << 0)) !== 0,
                cancelabe: (options_bits & (1 << 1)) !== 0,
                composed: (options_bits & (1 << 2)) !== 0,
            }

            let element = getElement(id)
            if (element) {
                element.dispatchEvent(new Event(name, options))
                return true
            }
            return false
        },

        get_element_value_f64: (id_ptr, id_len) => {
            let id = wsi.loadString(id_ptr, id_len)
            let element = getElement(id)
            return element ? element.value : 0
        },
        get_element_value_string: (id_ptr, id_len, buf_ptr, buf_len) => {
            let id = wsi.loadString(id_ptr, id_len)
            let element = getElement(id)
            if (element) {
                let str = element.value
                if (buf_len > 0 && buf_ptr) {
                    let n = Math.min(buf_len, str.length)
                    str = str.substring(0, n)
                    this.mem.loadBytes(buf_ptr, buf_len).set(new TextEncoder().encode(str))
                    return n
                }
            }
            return 0
        },
        get_element_value_string_length: (id_ptr, id_len) => {
            let id = wsi.loadString(id_ptr, id_len)
            let element = getElement(id)
            if (element) {
                return element.value.length
            }
            return 0
        },
        get_element_min_max: (ptr_array2_f64, id_ptr, id_len) => {
            let id = wsi.loadString(id_ptr, id_len)
            let element = getElement(id)
            if (element) {
                let values = wsi.loadF64Array(ptr_array2_f64, 2)
                values[0] = element.min
                values[1] = element.max
            }
        },
        set_element_value_f64: (id_ptr, id_len, value) => {
            let id = wsi.loadString(id_ptr, id_len)
            let element = getElement(id)
            if (element) {
                element.value = value
            }
        },
        set_element_value_string: (id_ptr, id_len, value_ptr, value_id) => {
            let id = wsi.loadString(id_ptr, id_len)
            let value = wsi.loadString(value_ptr, value_len)
            let element = getElement(id)
            if (element) {
                element.value = value
            }
        },

        get_bounding_client_rect: (rect_ptr, id_ptr, id_len) => {
            let id = wsi.loadString(id_ptr, id_len)
            let element = getElement(id)
            if (element) {
                let values = wsi.loadF64Array(rect_ptr, 4)
                let rect = element.getBoundingClientRect()
                values[0] = rect.left
                values[1] = rect.top
                values[2] = rect.right - rect.left
                values[3] = rect.bottom - rect.top
            }
        },
        window_get_rect: rect_ptr => {
            let values = wsi.loadF64Array(rect_ptr, 4)
            values[0] = window.screenX
            values[1] = window.screenY
            values[2] = window.screen.width
            values[3] = window.screen.height
        },

        window_get_scroll: pos_ptr => {
            let values = wsi.loadF64Array(pos_ptr, 2)
            values[0] = window.scrollX
            values[1] = window.scrollY
        },
        window_set_scroll: (x, y) => {
            window.scroll(x, y)
        },

        device_pixel_ratio: () => {
            return window.devicePixelRatio
        },
    }
}

export async function runWasm(wasmPath: string) {
    const wsi = new WasmMemoryInterface()

    const imports = {
        env: {
            pass_my_string: (ptr: number, len: number) => {
                // const len = wsi.loadU32(ptr)
                // const str_ptr = ptr + REG_LEN
                const bytes = wsi.loadBytes(ptr, len)
                const str = new TextDecoder().decode(bytes)

                console.log('pass_my_string:', str)
            },
            pass_my_post: (ptr: number) => {
                const offset = new MemOffset()
                offset.offset = ptr

                /* id: int */
                const id = wsi.loadUint(offset.off(REG_LEN))
                console.log('pass_my_post id:', id)

                /* title: string */
                const title_ptr = wsi.loadUint(offset.off(REG_LEN))
                const title_len = wsi.loadUint(offset.off(REG_LEN))
                const title = wsi.loadString(title_ptr, title_len)
                console.log('pass_my_post title:', title)

                /* content: string */
                const content_ptr = wsi.loadUint(offset.off(REG_LEN))
                const content_len = wsi.loadUint(offset.off(REG_LEN))
                const content = wsi.loadString(content_ptr, content_len)
                console.log('pass_my_post content:', content)
            },
        },
        odin_env: makeOdinEnv(wsi),
        odin_dom: makeOdinDom(wsi),
    }

    const response = await fetch(wasmPath)
    const file = await response.arrayBuffer()
    const wasm = await WebAssembly.instantiate(file, imports)
    const exports = wasm.instance.exports as any as OdinExports

    wsi.exports = exports
    wsi.memory = exports.memory

    console.log('Exports', exports)
    console.log('Memory', exports.memory)

    exports._start()
    exports._end()

    const odin_ctx = exports.default_context_ptr()

    try {
        const returned = exports.call_me(odin_ctx, 'Hello from JavaScript!')

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
