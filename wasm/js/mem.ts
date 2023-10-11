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

export const load_u8 = (mem: DataView, addr: number): number => {
    return mem.getUint8(addr)
}
export const load_i8 = (mem: DataView, addr: number): number => {
    return mem.getInt8(addr)
}

export const load_u16 = (mem: DataView, addr: number): number => {
    return mem.getUint16(addr, true)
}
export const load_i16 = (mem: DataView, addr: number): number => {
    return mem.getInt16(addr, true)
}
export const load_u16le = load_u16
export const load_i16le = load_i16
export const load_u16be = (mem: DataView, addr: number): number => {
    return mem.getUint16(addr, false)
}
export const load_i16be = (mem: DataView, addr: number): number => {
    return mem.getInt16(addr, false)
}

export const load_u32 = (mem: DataView, addr: number): number => {
    return mem.getUint32(addr, true)
}
export const load_i32 = (mem: DataView, addr: number): number => {
    return mem.getInt32(addr, true)
}
export const load_int = load_i32
export const load_i32le = load_i32
export const load_uint = load_u32
export const load_u32le = load_u32
export const load_i32be = (mem: DataView, addr: number): number => {
    return mem.getInt32(addr, false)
}
export const load_u32be = (mem: DataView, addr: number): number => {
    return mem.getUint32(addr, false)
}

export const load_u64 = (mem: DataView, addr: number): bigint => {
    return mem.getBigUint64(addr, true)
}
export const load_i64 = (mem: DataView, addr: number): bigint => {
    return mem.getBigInt64(addr, true)
}
export const load_i64le = load_i64
export const load_u64le = load_u64
export const load_i64be = (mem: DataView, addr: number): bigint => {
    return mem.getBigInt64(addr, false)
}
export const load_u64be = (mem: DataView, addr: number): bigint => {
    return mem.getBigUint64(addr, false)
}

export const load_u128 = (mem: DataView, addr: number): bigint => {
    const lo = mem.getBigUint64(addr, true)
    const hi = mem.getBigUint64(addr + 8, true)
    return lo + hi * 18446744073709551616n
}
export const load_i128 = (mem: DataView, addr: number): bigint => {
    const lo = mem.getBigInt64(addr, true)
    const hi = mem.getBigInt64(addr + 8, true)
    return lo + hi * 18446744073709551616n
}
export const load_i128le = load_i128
export const load_u128le = load_u128
export const load_i128be = (mem: DataView, addr: number): bigint => {
    const lo = mem.getBigInt64(addr + 8, false)
    const hi = mem.getBigInt64(addr, false)
    return lo + hi * 18446744073709551616n
}
export const load_u128be = (mem: DataView, addr: number): bigint => {
    const lo = mem.getBigUint64(addr + 8, false)
    const hi = mem.getBigUint64(addr, false)
    return lo + hi * 18446744073709551616n
}

export const load_f16 = (buffer: ArrayBufferLike, addr: number, le = true): number => {
    const bytes = load_bytes(buffer, addr, 2) as any as [number, number]

    if (le) {
        ;[bytes[0], bytes[1]] = [bytes[1], bytes[0]]
    }

    const sign = bytes[0] >> 7
    const exp = (bytes[0] & 0b01111100) >> 2
    const mant = ((bytes[0] & 0b00000011) << 8) | bytes[1]

    switch (exp) {
        case 0b11111:
            return mant ? NaN : sign ? -Infinity : Infinity
        case 0:
            return Math.pow(-1, sign) * Math.pow(2, -14) * (mant / 1024)
        default:
            return Math.pow(-1, sign) * Math.pow(2, exp - 15) * (1 + mant / 1024)
    }
}
export const load_f16le = (buffer: ArrayBufferLike, addr: number): number => {
    return load_f16(buffer, addr, true)
}
export const load_f16be = (buffer: ArrayBufferLike, addr: number): number => {
    return load_f16(buffer, addr, false)
}

export const load_f32 = (mem: DataView, addr: number, le = true): number => {
    return mem.getFloat32(addr, le)
}
export const load_f32le = (mem: DataView, addr: number): number => {
    return mem.getFloat32(addr, true)
}
export const load_f32be = (mem: DataView, addr: number): number => {
    return mem.getFloat32(addr, false)
}

export const load_f64 = (mem: DataView, addr: number, le = true): number => {
    return mem.getFloat64(addr, le)
}
export const load_f64le = (mem: DataView, addr: number): number => {
    return mem.getFloat64(addr, true)
}
export const load_f64be = (mem: DataView, addr: number): number => {
    return mem.getFloat64(addr, false)
}

export const load_ptr = load_uint

export const load_bytes = (buffer: ArrayBufferLike, ptr: number, len: number): Uint8Array => {
    return new Uint8Array(buffer, ptr, len)
}
export const load_string = (buffer: ArrayBufferLike, ptr: number, len: number): string => {
    const bytes = load_bytes(buffer, ptr, len)
    return new TextDecoder().decode(bytes)
}
export const load_f32_array = (
    memory: WebAssembly.Memory,
    addr: number,
    len: number,
): Float32Array => {
    return new Float32Array(memory.buffer, addr, len)
}
export const load_f64_array = (
    memory: WebAssembly.Memory,
    addr: number,
    len: number,
): Float64Array => {
    return new Float64Array(memory.buffer, addr, len)
}
export const load_u32_array = (
    memory: WebAssembly.Memory,
    addr: number,
    len: number,
): Uint32Array => {
    return new Uint32Array(memory.buffer, addr, len)
}
export const load_i32_array = (
    memory: WebAssembly.Memory,
    addr: number,
    len: number,
): Int32Array => {
    return new Int32Array(memory.buffer, addr, len)
}

export const storeU8 = (mem: DataView, addr: number, value: number | boolean): void => {
    mem.setUint8(addr, value as number)
}
export const storeI8 = (mem: DataView, addr: number, value: number): void => {
    mem.setInt8(addr, value)
}
export const storeU16 = (mem: DataView, addr: number, value: number): void => {
    mem.setUint16(addr, value, true)
}
export const storeI16 = (mem: DataView, addr: number, value: number): void => {
    mem.setInt16(addr, value, true)
}
export const storeU32 = (mem: DataView, addr: number, value: number): void => {
    mem.setUint32(addr, value, true)
}
export const storeI32 = (mem: DataView, addr: number, value: number): void => {
    mem.setInt32(addr, value, true)
}
export const storeU64 = (mem: DataView, addr: number, value: number): void => {
    mem.setUint32(addr, value, true)
    mem.setUint32(addr + 4, Math.floor(value / 4294967296), true)
}
export const storeI64 = (mem: DataView, addr: number, value: number): void => {
    // TODO(bill): storeI64 correctly
    mem.setUint32(addr, value, true)
    mem.setUint32(addr + 4, Math.floor(value / 4294967296), true)
}
export const storeF32 = (mem: DataView, addr: number, value: number): void => {
    mem.setFloat32(addr, value, true)
}
export const storeF64 = (mem: DataView, addr: number, value: number): void => {
    mem.setFloat64(addr, value, true)
}
export const storeInt = (mem: DataView, addr: number, value: number): void => {
    mem.setInt32(addr, value, true)
}
export const storeUint = (mem: DataView, addr: number, value: number): void => {
    mem.setUint32(addr, value, true)
}

export const storeString = (buffer: ArrayBufferLike, addr: number, value: string): void => {
    const bytes = load_bytes(buffer, addr, value.length)
    void new TextEncoder().encodeInto(value, bytes)
}
