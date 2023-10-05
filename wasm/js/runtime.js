'use strict'
;(function () {
    function getElement(name) {
        if (name) {
            return document.getElementById(name)
        }
        return undefined
    }

    class WasmMemoryInterface {
        constructor() {
            this.memory = null
            this.exports = null
            this.listenerMap = {}
        }

        setMemory(memory) {
            this.memory = memory
        }

        setExports(exports) {
            this.exports = exports
        }

        get mem() {
            return new DataView(this.memory.buffer)
        }

        loadF32Array(addr, len) {
            let array = new Float32Array(this.memory.buffer, addr, len)
            return array
        }
        loadF64Array(addr, len) {
            let array = new Float64Array(this.memory.buffer, addr, len)
            return array
        }
        loadU32Array(addr, len) {
            let array = new Uint32Array(this.memory.buffer, addr, len)
            return array
        }
        loadI32Array(addr, len) {
            let array = new Int32Array(this.memory.buffer, addr, len)
            return array
        }

        loadU8(addr) {
            return this.mem.getUint8(addr, true)
        }
        loadI8(addr) {
            return this.mem.getInt8(addr, true)
        }
        loadU16(addr) {
            return this.mem.getUint16(addr, true)
        }
        loadI16(addr) {
            return this.mem.getInt16(addr, true)
        }
        loadU32(addr) {
            return this.mem.getUint32(addr, true)
        }
        loadI32(addr) {
            return this.mem.getInt32(addr, true)
        }
        loadU64(addr) {
            const lo = this.mem.getUint32(addr + 0, true)
            const hi = this.mem.getUint32(addr + 4, true)
            return lo + hi * 4294967296
        }
        loadI64(addr) {
            // TODO(bill): loadI64 correctly
            const lo = this.mem.getUint32(addr + 0, true)
            const hi = this.mem.getUint32(addr + 4, true)
            return lo + hi * 4294967296
        }
        loadF32(addr) {
            return this.mem.getFloat32(addr, true)
        }
        loadF64(addr) {
            return this.mem.getFloat64(addr, true)
        }
        loadInt(addr) {
            return this.mem.getInt32(addr, true)
        }
        loadUint(addr) {
            return this.mem.getUint32(addr, true)
        }

        loadPtr(addr) {
            return this.loadUint(addr)
        }

        loadBytes(ptr, len) {
            return new Uint8Array(this.memory.buffer, ptr, len)
        }

        loadString(ptr, len) {
            const bytes = this.loadBytes(ptr, len)
            return new TextDecoder('utf-8').decode(bytes)
        }

        storeU8(addr, value) {
            this.mem.setUint8(addr, value, true)
        }
        storeI8(addr, value) {
            this.mem.setInt8(addr, value, true)
        }
        storeU16(addr, value) {
            this.mem.setUint16(addr, value, true)
        }
        storeI16(addr, value) {
            this.mem.setInt16(addr, value, true)
        }
        storeU32(addr, value) {
            this.mem.setUint32(addr, value, true)
        }
        storeI32(addr, value) {
            this.mem.setInt32(addr, value, true)
        }
        storeU64(addr, value) {
            this.mem.setUint32(addr + 0, value, true)
            this.mem.setUint32(addr + 4, Math.floor(value / 4294967296), true)
        }
        storeI64(addr, value) {
            // TODO(bill): storeI64 correctly
            this.mem.setUint32(addr + 0, value, true)
            this.mem.setUint32(addr + 4, Math.floor(value / 4294967296), true)
        }
        storeF32(addr, value) {
            this.mem.setFloat32(addr, value, true)
        }
        storeF64(addr, value) {
            this.mem.setFloat64(addr, value, true)
        }
        storeInt(addr, value) {
            this.mem.setInt32(addr, value, true)
        }
        storeUint(addr, value) {
            this.mem.setUint32(addr, value, true)
        }

        storeString(addr, value) {
            const bytes = this.loadBytes(addr, value.length)
            new TextEncoder('utf-8').encodeInto(value, bytes)
        }
    }

    function odinSetupDefaultImports(wasmMemoryInterface, consoleElement) {
        const MAX_INFO_CONSOLE_LINES = 512
        let infoConsoleLines = new Array()
        let currentLine = {}
        currentLine[false] = ''
        currentLine[true] = ''
        let prevIsError = false

        const writeToConsole = (line, isError) => {
            if (!line) {
                return
            }

            const println = (text, forceIsError) => {
                let style = [
                    'color: #eee',
                    'background-color: #d20',
                    'padding: 2px 4px',
                    'border-radius: 2px',
                ].join(';')
                let doIsError = isError
                if (forceIsError !== undefined) {
                    doIsError = forceIsError
                }

                if (doIsError) {
                    console.log('%c' + text, style)
                } else {
                    console.log(text)
                }
            }

            // Print to console
            if (line == '\n') {
                println(currentLine[isError])
                currentLine[isError] = ''
            } else if (!line.includes('\n')) {
                currentLine[isError] = currentLine[isError].concat(line)
            } else {
                let lines = line.split('\n')
                let printLast = lines.length > 1 && line.endsWith('\n')
                println(currentLine[isError].concat(lines[0]))
                currentLine[isError] = ''
                for (let i = 1; i < lines.length - 1; i++) {
                    println(lines[i])
                }
                let last = lines[lines.length - 1]
                if (printLast) {
                    println(last)
                } else {
                    currentLine[isError] = last
                }
            }

            if (prevIsError != isError) {
                if (prevIsError) {
                    println(currentLine[prevIsError], prevIsError)
                    currentLine[prevIsError] = ''
                }
            }
            prevIsError = isError

            // HTML based console
            if (!consoleElement) {
                return
            }
            const wrap = x => {
                if (isError) {
                    return '<span style="color:#f21">' + x + '</span>'
                }
                return x
            }

            if (line == '\n') {
                infoConsoleLines.push(line)
            } else if (!line.includes('\n')) {
                let prevLine = ''
                if (infoConsoleLines.length > 0) {
                    prevLine = infoConsoleLines.pop()
                }
                infoConsoleLines.push(prevLine.concat(wrap(line)))
            } else {
                let lines = line.split('\n')
                let lastHasNewline = lines.length > 1 && line.endsWith('\n')

                let prevLine = ''
                if (infoConsoleLines.length > 0) {
                    prevLine = infoConsoleLines.pop()
                }
                infoConsoleLines.push(prevLine.concat(wrap(lines[0]).concat('\n')))

                for (let i = 1; i < lines.length - 1; i++) {
                    infoConsoleLines.push(wrap(lines[i]).concat('\n'))
                }
                let last = lines[lines.length - 1]
                if (lastHasNewline) {
                    infoConsoleLines.push(last.concat('\n'))
                } else {
                    infoConsoleLines.push(last)
                }
            }

            if (infoConsoleLines.length > MAX_INFO_CONSOLE_LINES) {
                infoConsoleLines.shift(MAX_INFO_CONSOLE_LINES)
            }

            let data = ''
            for (let i = 0; i < infoConsoleLines.length; i++) {
                data = data.concat(infoConsoleLines[i])
            }

            let info = consoleElement
            info.innerHTML = data
            info.scrollTop = info.scrollHeight
        }

        let event_temp_data = {}

        return {
            env: {},
            odin_env: {
                write: (fd, ptr, len) => {
                    const str = wasmMemoryInterface.loadString(ptr, len)
                    if (fd == 1) {
                        writeToConsole(str, false)
                        return
                    } else if (fd == 2) {
                        writeToConsole(str, true)
                        return
                    } else {
                        throw new Error("Invalid fd to 'write'" + stripNewline(str))
                    }
                },
                trap: () => {
                    throw new Error()
                },
                alert: (ptr, len) => {
                    alert(wasmMemoryInterface.loadString(ptr, len))
                },
                abort: () => {
                    Module.abort()
                },
                evaluate: (str_ptr, str_len) => {
                    eval.call(null, wasmMemoryInterface.loadString(str_ptr, str_len))
                },

                time_now: () => {
                    // convert ms to ns
                    return Date.now() * 1e6
                },
                tick_now: () => {
                    // convert ms to ns
                    return performance.now() * 1e6
                },
                time_sleep: duration_ms => {
                    if (duration_ms > 0) {
                        // TODO(bill): Does this even make any sense?
                    }
                },

                sqrt: x => Math.sqrt(x),
                sin: x => Math.sin(x),
                cos: x => Math.cos(x),
                pow: (x, power) => Math.pow(x, power),
                fmuladd: (x, y, z) => x * y + z,
                ln: x => Math.log(x),
                exp: x => Math.exp(x),
                ldexp: x => Math.ldexp(x),
            },
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
                        wasmMemoryInterface.exports.odin_dom_do_event_callback(
                            data,
                            callback,
                            odin_ctx,
                        )
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
                        wasmMemoryInterface.exports.odin_dom_do_event_callback(
                            data,
                            callback,
                            odin_ctx,
                        )
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
                            this.mem
                                .loadBytes(buf_ptr, buf_len)
                                .set(new TextEncoder('utf-8').encode(str))
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

    async function runWasm(wasmPath, consoleElement, extraForeignImports) {
        let wasmMemoryInterface = new WasmMemoryInterface()

        let imports = odinSetupDefaultImports(wasmMemoryInterface, consoleElement)
        let exports = {}

        if (extraForeignImports !== undefined) {
            imports = {
                ...imports,
                ...extraForeignImports,
            }
        }

        const response = await fetch(wasmPath)
        const file = await response.arrayBuffer()
        const wasm = await WebAssembly.instantiate(file, imports)
        exports = wasm.instance.exports
        wasmMemoryInterface.setExports(exports)
        wasmMemoryInterface.setMemory(exports.memory)

        console.log('Exports', exports)

        console.log('Calling start...')
        exports._start()

        // if (exports.step) {

        //     let prevTimeStamp = undefined
        //     const step = currTimeStamp => {
        //         if (prevTimeStamp == undefined) {
        //             prevTimeStamp = currTimeStamp
        //         }

        //         const dt = (currTimeStamp - prevTimeStamp) * 0.001
        //         prevTimeStamp = currTimeStamp
        //         exports.step(dt, odin_ctx)
        //         window.requestAnimationFrame(step)
        //     }

        //     window.requestAnimationFrame(step)
        // }

        console.log('Calling end...')
        exports._end()

        const odin_ctx = exports.default_context_ptr()

        try {
            const returned = exports.call_me(odin_ctx, 'Hello from JavaScript!')

            console.log('Returned', returned)
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

    window.odin = {
        runWasm: runWasm,
    }
})()
