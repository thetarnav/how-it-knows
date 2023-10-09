export const REG_SIZE = 32
export const REG_LEN = REG_SIZE / 8

export class MemOffset {
    constructor(public offset = 0) {}

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

export function loadF32Array(memory: WebAssembly.Memory, addr: number, len: number): Float32Array {
    return new Float32Array(memory.buffer, addr, len)
}
export function loadF64Array(memory: WebAssembly.Memory, addr: number, len: number): Float64Array {
    return new Float64Array(memory.buffer, addr, len)
}
export function loadU32Array(memory: WebAssembly.Memory, addr: number, len: number): Uint32Array {
    return new Uint32Array(memory.buffer, addr, len)
}
export function loadI32Array(memory: WebAssembly.Memory, addr: number, len: number): Int32Array {
    return new Int32Array(memory.buffer, addr, len)
}

export function loadU8(mem: DataView, addr: number): number {
    return mem.getUint8(addr)
}
export function loadI8(mem: DataView, addr: number): number {
    return mem.getInt8(addr)
}
export function loadU16(mem: DataView, addr: number): number {
    return mem.getUint16(addr, true)
}
export function loadI16(mem: DataView, addr: number): number {
    return mem.getInt16(addr, true)
}
export function loadU32(mem: DataView, addr: number): number {
    return mem.getUint32(addr, true)
}
export function loadI32(mem: DataView, addr: number): number {
    return mem.getInt32(addr, true)
}
export function loadU64(mem: DataView, addr: number): number {
    const lo = mem.getUint32(addr + 0, true)
    const hi = mem.getUint32(addr + 4, true)
    return lo + hi * 4294967296
}
export function loadI64(mem: DataView, addr: number): number {
    // TODO(bill): loadI64 correctly
    const lo = mem.getUint32(addr + 0, true)
    const hi = mem.getUint32(addr + 4, true)
    return lo + hi * 4294967296
}
export function loadF32(mem: DataView, addr: number): number {
    return mem.getFloat32(addr, true)
}
export function loadF64(mem: DataView, addr: number): number {
    return mem.getFloat64(addr, true)
}
export function loadInt(mem: DataView, addr: number): number {
    return mem.getInt32(addr, true)
}
export function loadUint(mem: DataView, addr: number): number {
    return mem.getUint32(addr, true)
}

export function loadPtr(mem: DataView, addr: number): number {
    return loadUint(mem, addr)
}

export function loadBytes(memory: WebAssembly.Memory, ptr: number, len: number): Uint8Array {
    return new Uint8Array(memory.buffer, ptr, len)
}

export function loadString(memory: WebAssembly.Memory, ptr: number, len: number): string {
    const bytes = loadBytes(memory, ptr, len)
    return new TextDecoder().decode(bytes)
}

export function storeU8(mem: DataView, addr: number, value: number | boolean): void {
    mem.setUint8(addr, value as number)
}
export function storeI8(mem: DataView, addr: number, value: number): void {
    mem.setInt8(addr, value)
}
export function storeU16(mem: DataView, addr: number, value: number): void {
    mem.setUint16(addr, value, true)
}
export function storeI16(mem: DataView, addr: number, value: number): void {
    mem.setInt16(addr, value, true)
}
export function storeU32(mem: DataView, addr: number, value: number): void {
    mem.setUint32(addr, value, true)
}
export function storeI32(mem: DataView, addr: number, value: number): void {
    mem.setInt32(addr, value, true)
}
export function storeU64(mem: DataView, addr: number, value: number): void {
    mem.setUint32(addr + 0, value, true)
    mem.setUint32(addr + 4, Math.floor(value / 4294967296), true)
}
export function storeI64(mem: DataView, addr: number, value: number): void {
    // TODO(bill): storeI64 correctly
    mem.setUint32(addr + 0, value, true)
    mem.setUint32(addr + 4, Math.floor(value / 4294967296), true)
}
export function storeF32(mem: DataView, addr: number, value: number): void {
    mem.setFloat32(addr, value, true)
}
export function storeF64(mem: DataView, addr: number, value: number): void {
    mem.setFloat64(addr, value, true)
}
export function storeInt(mem: DataView, addr: number, value: number): void {
    mem.setInt32(addr, value, true)
}
export function storeUint(mem: DataView, addr: number, value: number): void {
    mem.setUint32(addr, value, true)
}

export function storeString(memory: WebAssembly.Memory, addr: number, value: string): void {
    const bytes = loadBytes(memory, addr, value.length)
    void new TextEncoder().encodeInto(value, bytes)
}
