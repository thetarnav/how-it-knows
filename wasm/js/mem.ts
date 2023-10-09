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

export class WasmMemoryInterface {
    memory!: WebAssembly.Memory

    get mem(): DataView {
        return new DataView(this.memory.buffer)
    }

    loadF32Array(addr: number, len: number): Float32Array {
        const array = new Float32Array(this.memory.buffer, addr, len)
        return array
    }
    loadF64Array(addr: number, len: number): Float64Array {
        const array = new Float64Array(this.memory.buffer, addr, len)
        return array
    }
    loadU32Array(addr: number, len: number): Uint32Array {
        const array = new Uint32Array(this.memory.buffer, addr, len)
        return array
    }
    loadI32Array(addr: number, len: number): Int32Array {
        const array = new Int32Array(this.memory.buffer, addr, len)
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
        return new Uint8Array(this.memory.buffer, ptr, len)
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
