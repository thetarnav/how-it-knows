/*

Copied and modified from Odin's wasm vendor library:
https://github.com/odin-lang/Odin/blob/master/vendor/wasm/js/runtime.js

*/

class WasmMemoryInterface {
    memory: WebAssembly.Memory | null = null
    exports: Record<string, unknown> = {}
    listenerMap = {}

    setMemory(memory: WebAssembly.Memory) {
        this.memory = memory
    }

    setExports(exports: Record<string, unknown>) {
        this.exports = exports
    }

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
        return new TextDecoder('utf-8').decode(bytes)
    }

    storeU8(addr: number, value: number): void {
        this.mem.setUint8(addr, value)
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

function odinSetupDefaultImports(wasmMemoryInterface: WasmMemoryInterface) {
    const event_temp_data = {}

    return {
        env: {},
        odin_env: makeOdinEnv(wasmMemoryInterface),
        odin_dom: {
            init_event_raw: ep => {
                const W = 4
                let offset = ep
                let off = (amount, alignment) => {
                    if (alignment === undefined) {
                        alignment = Math.min(amount, W)
                    }
                    if (offset % alignment != 0) {
                        offset += alignment - (offset % alignment)
                    }
                    let x = offset
                    offset += amount
                    return x
                }

                let wmi = wasmMemoryInterface

                let e = event_temp_data.event

                wmi.storeU32(off(4), event_temp_data.name_code)
                if (e.target == document) {
                    wmi.storeU32(off(4), 1)
                } else if (e.target == window) {
                    wmi.storeU32(off(4), 2)
                } else {
                    wmi.storeU32(off(4), 0)
                }
                if (e.currentTarget == document) {
                    wmi.storeU32(off(4), 1)
                } else if (e.currentTarget == window) {
                    wmi.storeU32(off(4), 2)
                } else {
                    wmi.storeU32(off(4), 0)
                }

                wmi.storeUint(off(W), event_temp_data.id_ptr)
                wmi.storeUint(off(W), event_temp_data.id_len)
                wmi.storeUint(off(W), 0) // padding

                wmi.storeF64(off(8), e.timeStamp * 1e-3)

                wmi.storeU8(off(1), e.eventPhase)
                let options = 0
                if (!!e.bubbles) {
                    options |= 1 << 0
                }
                if (!!e.cancelable) {
                    options |= 1 << 1
                }
                if (!!e.composed) {
                    options |= 1 << 2
                }
                wmi.storeU8(off(1), options)
                wmi.storeU8(off(1), !!e.isComposing)
                wmi.storeU8(off(1), !!e.isTrusted)

                let base = off(0, 8)
                if (e instanceof MouseEvent) {
                    wmi.storeI64(off(8), e.screenX)
                    wmi.storeI64(off(8), e.screenY)
                    wmi.storeI64(off(8), e.clientX)
                    wmi.storeI64(off(8), e.clientY)
                    wmi.storeI64(off(8), e.offsetX)
                    wmi.storeI64(off(8), e.offsetY)
                    wmi.storeI64(off(8), e.pageX)
                    wmi.storeI64(off(8), e.pageY)
                    wmi.storeI64(off(8), e.movementX)
                    wmi.storeI64(off(8), e.movementY)

                    wmi.storeU8(off(1), !!e.ctrlKey)
                    wmi.storeU8(off(1), !!e.shiftKey)
                    wmi.storeU8(off(1), !!e.altKey)
                    wmi.storeU8(off(1), !!e.metaKey)

                    wmi.storeI16(off(2), e.button)
                    wmi.storeU16(off(2), e.buttons)
                } else if (e instanceof KeyboardEvent) {
                    // Note: those strigs are constructed
                    // on the native side from buffers that
                    // are filled later, so skip them
                    const keyPtr = off(W * 2, W)
                    const codePtr = off(W * 2, W)

                    wmi.storeU8(off(1), e.location)

                    wmi.storeU8(off(1), !!e.ctrlKey)
                    wmi.storeU8(off(1), !!e.shiftKey)
                    wmi.storeU8(off(1), !!e.altKey)
                    wmi.storeU8(off(1), !!e.metaKey)

                    wmi.storeU8(off(1), !!e.repeat)

                    wmi.storeI32(off(W), e.key.length)
                    wmi.storeI32(off(W), e.code.length)
                    wmi.storeString(off(16, 1), e.key)
                    wmi.storeString(off(16, 1), e.code)
                } else if (e instanceof WheelEvent) {
                    wmi.storeF64(off(8), e.deltaX)
                    wmi.storeF64(off(8), e.deltaY)
                    wmi.storeF64(off(8), e.deltaZ)
                    wmi.storeU32(off(4), e.deltaMode)
                } else if (e instanceof Event) {
                    if ('scrollX' in e) {
                        wmi.storeF64(off(8), e.scrollX)
                        wmi.storeF64(off(8), e.scrollY)
                    }
                }
            },

            add_event_listener: (
                id_ptr,
                id_len,
                name_ptr,
                name_len,
                name_code,
                data,
                callback,
                use_capture,
            ) => {
                let id = wasmMemoryInterface.loadString(id_ptr, id_len)
                let name = wasmMemoryInterface.loadString(name_ptr, name_len)
                let element = getElement(id)
                if (element == undefined) {
                    return false
                }

                let listener = e => {
                    const odin_ctx = wasmMemoryInterface.exports.default_context_ptr()
                    event_temp_data.id_ptr = id_ptr
                    event_temp_data.id_len = id_len
                    event_temp_data.event = e
                    event_temp_data.name_code = name_code
                    wasmMemoryInterface.exports.odin_dom_do_event_callback(data, callback, odin_ctx)
                }
                wasmMemoryInterface.listenerMap[{data: data, callback: callback}] = listener
                element.addEventListener(name, listener, !!use_capture)
                return true
            },

            remove_event_listener: (id_ptr, id_len, name_ptr, name_len, data, callback) => {
                let id = wasmMemoryInterface.loadString(id_ptr, id_len)
                let name = wasmMemoryInterface.loadString(name_ptr, name_len)
                let element = getElement(id)
                if (element == undefined) {
                    return false
                }

                let listener = wasmMemoryInterface.listenerMap[{data: data, callback: callback}]
                if (listener == undefined) {
                    return false
                }
                element.removeEventListener(name, listener)
                return true
            },

            add_window_event_listener: (
                name_ptr,
                name_len,
                name_code,
                data,
                callback,
                use_capture,
            ) => {
                let name = wasmMemoryInterface.loadString(name_ptr, name_len)
                let element = window
                let listener = e => {
                    const odin_ctx = wasmMemoryInterface.exports.default_context_ptr()
                    event_temp_data.id_ptr = 0
                    event_temp_data.id_len = 0
                    event_temp_data.event = e
                    event_temp_data.name_code = name_code
                    wasmMemoryInterface.exports.odin_dom_do_event_callback(data, callback, odin_ctx)
                }
                wasmMemoryInterface.listenerMap[{data: data, callback: callback}] = listener
                element.addEventListener(name, listener, !!use_capture)
                return true
            },

            remove_window_event_listener: (name_ptr, name_len, data, callback) => {
                let name = wasmMemoryInterface.loadString(name_ptr, name_len)
                let element = window
                let key = {data: data, callback: callback}
                let listener = wasmMemoryInterface.listenerMap[key]
                if (!listener) {
                    return false
                }
                wasmMemoryInterface.listenerMap[key] = undefined

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
                let id = wasmMemoryInterface.loadString(id_ptr, id_len)
                let name = wasmMemoryInterface.loadString(name_ptr, name_len)
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
                let id = wasmMemoryInterface.loadString(id_ptr, id_len)
                let element = getElement(id)
                return element ? element.value : 0
            },
            get_element_value_string: (id_ptr, id_len, buf_ptr, buf_len) => {
                let id = wasmMemoryInterface.loadString(id_ptr, id_len)
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
                let id = wasmMemoryInterface.loadString(id_ptr, id_len)
                let element = getElement(id)
                if (element) {
                    return element.value.length
                }
                return 0
            },
            get_element_min_max: (ptr_array2_f64, id_ptr, id_len) => {
                let id = wasmMemoryInterface.loadString(id_ptr, id_len)
                let element = getElement(id)
                if (element) {
                    let values = wasmMemoryInterface.loadF64Array(ptr_array2_f64, 2)
                    values[0] = element.min
                    values[1] = element.max
                }
            },
            set_element_value_f64: (id_ptr, id_len, value) => {
                let id = wasmMemoryInterface.loadString(id_ptr, id_len)
                let element = getElement(id)
                if (element) {
                    element.value = value
                }
            },
            set_element_value_string: (id_ptr, id_len, value_ptr, value_id) => {
                let id = wasmMemoryInterface.loadString(id_ptr, id_len)
                let value = wasmMemoryInterface.loadString(value_ptr, value_len)
                let element = getElement(id)
                if (element) {
                    element.value = value
                }
            },

            get_bounding_client_rect: (rect_ptr, id_ptr, id_len) => {
                let id = wasmMemoryInterface.loadString(id_ptr, id_len)
                let element = getElement(id)
                if (element) {
                    let values = wasmMemoryInterface.loadF64Array(rect_ptr, 4)
                    let rect = element.getBoundingClientRect()
                    values[0] = rect.left
                    values[1] = rect.top
                    values[2] = rect.right - rect.left
                    values[3] = rect.bottom - rect.top
                }
            },
            window_get_rect: rect_ptr => {
                let values = wasmMemoryInterface.loadF64Array(rect_ptr, 4)
                values[0] = window.screenX
                values[1] = window.screenY
                values[2] = window.screen.width
                values[3] = window.screen.height
            },

            window_get_scroll: pos_ptr => {
                let values = wasmMemoryInterface.loadF64Array(pos_ptr, 2)
                values[0] = window.scrollX
                values[1] = window.scrollY
            },
            window_set_scroll: (x, y) => {
                window.scroll(x, y)
            },

            device_pixel_ratio: () => {
                return window.devicePixelRatio
            },
        },
    }
}

export async function runWasm(wasmPath: string) {
    const wasmMemoryInterface = new WasmMemoryInterface()

    const imports = odinSetupDefaultImports(wasmMemoryInterface)
    let exports = {}

    const response = await fetch(wasmPath)
    const file = await response.arrayBuffer()
    const wasm = await WebAssembly.instantiate(file, imports)
    exports = wasm.instance.exports
    wasmMemoryInterface.setExports(exports)
    wasmMemoryInterface.setMemory(exports.memory)

    console.log('Exports', exports)
    console.log('Memory', exports.memory)

    console.log('Calling start...')
    exports._start()

    console.log('Calling end...')
    exports._end()

    const odin_ctx = exports.default_context_ptr()

    try {
        const returned = exports.call_me(odin_ctx, 'Hello from JavaScript!')

        console.log('Returned', returned)

        try {
            const bytes = wasmMemoryInterface.loadBytes(returned + 4, 8)
            const str = new TextDecoder('utf-8').decode(bytes)

            console.log({
                bytes,
                str,
            })

            // const str = wasmMemoryInterface.loadString(returned + 4, 17)
            // console.log('str', str)
        } catch (error) {
            console.error('loadString error', error)
        }
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
