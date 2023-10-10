/**
 * Register size in bytes.
 */
export const REG_SIZE = 4 // 32-bit
/**
 * Max memory alignment in bytes.
 */
export const ALIGNMENT = 8 // 64-bit

export const is_little_endian = /*#__PURE__*/ (() => {
    const buffer = new ArrayBuffer(2)
    new DataView(buffer).setInt16(0, 256, true /* little-endian */)
    // Int16Array uses the platform's endianness.
    return new Int16Array(buffer)[0] === 256
})()

export class MemOffset {
    constructor(public offset = 0) {}

    /**
     * Move the offset by the given amount.
     *
     * @param amount The amount to move by
     * @param alignment The alignment to use. Defaults to the minimum of the amount and the register size. Will be rounded up to the nearest multiple of the alignment.
     * @returns The previous offset
     */
    off(amount: number, alignment = Math.min(amount, ALIGNMENT)): number {
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

export function load_u8(mem: DataView, addr: number): number {
    return mem.getUint8(addr)
}
export function load_i8(mem: DataView, addr: number): number {
    return mem.getInt8(addr)
}

export function load_u16(mem: DataView, addr: number): number {
    return mem.getUint16(addr, true)
}
export function load_i16(mem: DataView, addr: number): number {
    return mem.getInt16(addr, true)
}
export const load_u16le = load_u16
export const load_i16le = load_i16
export function load_u16be(mem: DataView, addr: number): number {
    return mem.getUint16(addr, false)
}
export function load_i16be(mem: DataView, addr: number): number {
    return mem.getInt16(addr, false)
}

export function load_u32(mem: DataView, addr: number): number {
    return mem.getUint32(addr, true)
}
export function load_i32(mem: DataView, addr: number): number {
    return mem.getInt32(addr, true)
}
export const load_int = load_i32
export const load_i32le = load_i32
export const load_uint = load_u32
export const load_u32le = load_u32
export function load_i32be(mem: DataView, addr: number): number {
    return mem.getInt32(addr, false)
}
export function load_u32be(mem: DataView, addr: number): number {
    return mem.getUint32(addr, false)
}

export function load_u64(mem: DataView, addr: number): bigint {
    return mem.getBigUint64(addr, true)
}
export function load_i64(mem: DataView, addr: number): bigint {
    return mem.getBigInt64(addr, true)
}
export const load_i64le = load_i64
export const load_u64le = load_u64
export function load_i64be(mem: DataView, addr: number): bigint {
    return mem.getBigInt64(addr, false)
}
export function load_u64be(mem: DataView, addr: number): bigint {
    return mem.getBigUint64(addr, false)
}

export function load_u128(mem: DataView, addr: number): bigint {
    const lo = mem.getBigUint64(addr, true)
    const hi = mem.getBigUint64(addr + 8, true)
    return lo + hi * 18446744073709551616n
}
export function load_i128(mem: DataView, addr: number): bigint {
    const lo = mem.getBigInt64(addr, true)
    const hi = mem.getBigInt64(addr + 8, true)
    return lo + hi * 18446744073709551616n
}
export const load_i128le = load_i128
export const load_u128le = load_u128
export function load_i128be(mem: DataView, addr: number): bigint {
    const lo = mem.getBigInt64(addr + 8, false)
    const hi = mem.getBigInt64(addr, false)
    return lo + hi * 18446744073709551616n
}
export function load_u128be(mem: DataView, addr: number): bigint {
    const lo = mem.getBigUint64(addr + 8, false)
    const hi = mem.getBigUint64(addr, false)
    return lo + hi * 18446744073709551616n
}

export function load_f32(mem: DataView, addr: number): number {
    return mem.getFloat32(addr, true)
}
export function load_f64(mem: DataView, addr: number): number {
    return mem.getFloat64(addr, true)
}
export const load_f32le = load_f32
export const load_f64le = load_f64
export function load_f32be(mem: DataView, addr: number): number {
    return mem.getFloat32(addr, false)
}
export function load_f64be(mem: DataView, addr: number): number {
    return mem.getFloat64(addr, false)
}

export const load_ptr = load_uint

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
    mem.setUint32(addr, value, true)
    mem.setUint32(addr + 4, Math.floor(value / 4294967296), true)
}
export function storeI64(mem: DataView, addr: number, value: number): void {
    // TODO(bill): storeI64 correctly
    mem.setUint32(addr, value, true)
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
