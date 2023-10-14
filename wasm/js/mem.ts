/**
 * Register size in bytes.
 */
export const REG_SIZE = 4 // 32-bit
/**
 * Max memory alignment in bytes.
 */
export const ALIGNMENT = 8 // 64-bit

export const little_endian = /*#__PURE__*/ ((): boolean => {
    const buffer = new ArrayBuffer(2)
    new DataView(buffer).setInt16(0, 256, true)
    // Int16Array uses the platform's endianness
    return new Int16Array(buffer)[0] === 256
})()

export class ByteOffset {
    constructor(public offset = 0) {}

    /**
     * Move the offset by the given amount.
     *
     * @param amount The amount of bytes to move by
     * @param alignment Defaults to the minimum of the amount and the register size. Will be rounded up to the nearest multiple of the alignment.
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

export const load_b8 = (mem: DataView, addr: number): boolean => {
    return mem.getUint8(addr) !== 0
}
export const load_b16 = load_b8
export const load_b32 = load_b8
export const load_b64 = load_b8
export const load_bool = load_b8

export const load_offset_b8 = (mem: DataView, offset: ByteOffset): boolean => {
    return load_b8(mem, offset.off(1))
}
export const load_offset_bool = load_offset_b8
export const load_offset_b16 = (mem: DataView, offset: ByteOffset): boolean => {
    return load_b16(mem, offset.off(2))
}
export const load_offset_b32 = (mem: DataView, offset: ByteOffset): boolean => {
    return load_b32(mem, offset.off(4))
}
export const load_offset_b64 = (mem: DataView, offset: ByteOffset): boolean => {
    return load_b64(mem, offset.off(8))
}

export const store_bool = (mem: DataView, ptr: number, value: boolean): void => {
    mem.setUint8(ptr, value as any)
}
export const store_offset_bool = (mem: DataView, offset: ByteOffset, value: boolean): void => {
    mem.setUint8(offset.off(1), value as any)
}
export const store_b8 = store_bool
export const store_offset_b8 = store_offset_bool
export const store_b16 = store_bool
export const store_offset_b16 = (mem: DataView, offset: ByteOffset, value: boolean): void => {
    mem.setUint8(offset.off(2), value as any)
}
export const store_b32 = store_bool
export const store_offset_b32 = (mem: DataView, offset: ByteOffset, value: boolean): void => {
    mem.setUint8(offset.off(4), value as any)
}
export const store_b64 = store_bool
export const store_offset_b64 = (mem: DataView, offset: ByteOffset, value: boolean): void => {
    mem.setUint8(offset.off(8), value as any)
}

export const load_u8 = (mem: DataView, addr: number): number => {
    return mem.getUint8(addr)
}
export const load_byte = load_u8
export const load_i8 = (mem: DataView, addr: number): number => {
    return mem.getInt8(addr)
}

export const load_offset_u8 = (mem: DataView, offset: ByteOffset): number => {
    return load_u8(mem, offset.off(1))
}
export const load_offset_byte = load_offset_u8
export const load_offset_i8 = (mem: DataView, offset: ByteOffset): number => {
    return load_i8(mem, offset.off(1))
}

export const store_u8 = (mem: DataView, ptr: number, value: number): void => {
    mem.setUint8(ptr, value)
}
export const store_offset_u8 = (mem: DataView, offset: ByteOffset, value: number): void => {
    mem.setUint8(offset.off(1), value)
}
export const store_byte = store_u8
export const store_offset_byte = store_offset_u8
export const store_i8 = (mem: DataView, ptr: number, value: number): void => {
    mem.setInt8(ptr, value)
}
export const store_offset_i8 = (mem: DataView, offset: ByteOffset, value: number): void => {
    mem.setInt8(offset.off(1), value)
}

export const load_u16 = (mem: DataView, addr: number, le = little_endian): number => {
    return mem.getUint16(addr, le)
}
export const load_i16 = (mem: DataView, addr: number, le = little_endian): number => {
    return mem.getInt16(addr, le)
}
export const load_u16le = (mem: DataView, addr: number): number => {
    return mem.getUint16(addr, true)
}
export const load_i16le = (mem: DataView, addr: number): number => {
    return mem.getInt16(addr, true)
}
export const load_u16be = (mem: DataView, addr: number): number => {
    return mem.getUint16(addr, false)
}
export const load_i16be = (mem: DataView, addr: number): number => {
    return mem.getInt16(addr, false)
}

export const load_offset_u16 = (mem: DataView, offset: ByteOffset): number => {
    return load_u16(mem, offset.off(2))
}
export const load_offset_i16 = (mem: DataView, offset: ByteOffset): number => {
    return load_i16(mem, offset.off(2))
}
export const load_offset_u16le = (mem: DataView, offset: ByteOffset): number => {
    return load_u16le(mem, offset.off(2))
}
export const load_offset_i16le = (mem: DataView, offset: ByteOffset): number => {
    return load_i16le(mem, offset.off(2))
}
export const load_offset_u16be = (mem: DataView, offset: ByteOffset): number => {
    return load_u16be(mem, offset.off(2))
}
export const load_offset_i16be = (mem: DataView, offset: ByteOffset): number => {
    return load_i16be(mem, offset.off(2))
}

export const store_u16 = (mem: DataView, ptr: number, value: number, le = little_endian): void => {
    mem.setUint16(ptr, value, le)
}
export const store_offset_u16 = (
    mem: DataView,
    offset: ByteOffset,
    value: number,
    le = little_endian,
): void => {
    mem.setUint16(offset.off(2), value, le)
}
export const store_i16 = (mem: DataView, ptr: number, value: number, le = little_endian): void => {
    mem.setInt16(ptr, value, le)
}
export const store_offset_i16 = (
    mem: DataView,
    offset: ByteOffset,
    value: number,
    le = little_endian,
): void => {
    mem.setInt16(offset.off(2), value, le)
}
export const store_u16le = (mem: DataView, ptr: number, value: number): void => {
    mem.setUint16(ptr, value, true)
}
export const store_offset_u16le = (mem: DataView, offset: ByteOffset, value: number): void => {
    mem.setUint16(offset.off(2), value, true)
}
export const store_u16be = (mem: DataView, ptr: number, value: number): void => {
    mem.setUint16(ptr, value, false)
}
export const store_offset_u16be = (mem: DataView, offset: ByteOffset, value: number): void => {
    mem.setUint16(offset.off(2), value, false)
}
export const store_i16le = (mem: DataView, ptr: number, value: number): void => {
    mem.setInt16(ptr, value, true)
}
export const store_offset_i16le = (mem: DataView, offset: ByteOffset, value: number): void => {
    mem.setInt16(offset.off(2), value, true)
}
export const store_i16be = (mem: DataView, ptr: number, value: number): void => {
    mem.setInt16(ptr, value, false)
}
export const store_offset_i16be = (mem: DataView, offset: ByteOffset, value: number): void => {
    mem.setInt16(offset.off(2), value, false)
}

export const load_u32 = (mem: DataView, addr: number, le = little_endian): number => {
    return mem.getUint32(addr, le)
}
export const load_i32 = (mem: DataView, addr: number, le = little_endian): number => {
    return mem.getInt32(addr, le)
}
export const load_u32le = (mem: DataView, addr: number): number => {
    return mem.getUint32(addr, true)
}
export const load_i32le = (mem: DataView, addr: number): number => {
    return mem.getInt32(addr, true)
}
export const load_u32be = (mem: DataView, addr: number): number => {
    return mem.getUint32(addr, false)
}
export const load_i32be = (mem: DataView, addr: number): number => {
    return mem.getInt32(addr, false)
}

export const load_offset_u32 = (mem: DataView, offset: ByteOffset): number => {
    return load_u32(mem, offset.off(4))
}
export const load_offset_i32 = (mem: DataView, offset: ByteOffset): number => {
    return load_i32(mem, offset.off(4))
}
export const load_offset_u32le = (mem: DataView, offset: ByteOffset): number => {
    return load_u32le(mem, offset.off(4))
}
export const load_offset_i32le = (mem: DataView, offset: ByteOffset): number => {
    return load_i32le(mem, offset.off(4))
}
export const load_offset_u32be = (mem: DataView, offset: ByteOffset): number => {
    return load_u32be(mem, offset.off(4))
}
export const load_offset_i32be = (mem: DataView, offset: ByteOffset): number => {
    return load_i32be(mem, offset.off(4))
}

export const store_u32 = (mem: DataView, ptr: number, value: number, le = little_endian): void => {
    mem.setUint32(ptr, value, le)
}
export const store_offset_u32 = (
    mem: DataView,
    offset: ByteOffset,
    value: number,
    le = little_endian,
): void => {
    mem.setUint32(offset.off(4), value, le)
}
export const store_i32 = (mem: DataView, ptr: number, value: number, le = little_endian): void => {
    mem.setInt32(ptr, value, le)
}
export const store_offset_i32 = (
    mem: DataView,
    offset: ByteOffset,
    value: number,
    le = little_endian,
): void => {
    mem.setInt32(offset.off(4), value, le)
}
export const store_u32le = (mem: DataView, ptr: number, value: number): void => {
    mem.setUint32(ptr, value, true)
}
export const store_offset_u32le = (mem: DataView, offset: ByteOffset, value: number): void => {
    mem.setUint32(offset.off(4), value, true)
}
export const store_u32be = (mem: DataView, ptr: number, value: number): void => {
    mem.setUint32(ptr, value, false)
}
export const store_offset_u32be = (mem: DataView, offset: ByteOffset, value: number): void => {
    mem.setUint32(offset.off(4), value, false)
}
export const store_i32le = (mem: DataView, ptr: number, value: number): void => {
    mem.setInt32(ptr, value, true)
}
export const store_offset_i32le = (mem: DataView, offset: ByteOffset, value: number): void => {
    mem.setInt32(offset.off(4), value, true)
}
export const store_i32be = (mem: DataView, ptr: number, value: number): void => {
    mem.setInt32(ptr, value, false)
}
export const store_offset_i32be = (mem: DataView, offset: ByteOffset, value: number): void => {
    mem.setInt32(offset.off(4), value, false)
}

export const load_uint = (mem: DataView, addr: number): number => {
    return mem.getUint32(addr, little_endian)
}
export const load_int = (mem: DataView, addr: number): number => {
    return mem.getInt32(addr, little_endian)
}
export const load_ptr = load_uint

export const load_offset_uint = (mem: DataView, offset: ByteOffset): number => {
    return load_uint(mem, offset.off(4))
}
export const load_offset_ptr = load_offset_uint
export const load_offset_int = (mem: DataView, offset: ByteOffset): number => {
    return load_int(mem, offset.off(4))
}

export const store_uint = (mem: DataView, ptr: number, value: number): void => {
    mem.setUint32(ptr, value, little_endian)
}
export const store_offset_uint = (mem: DataView, offset: ByteOffset, value: number): void => {
    mem.setUint32(offset.off(4), value, little_endian)
}
export const store_ptr = store_uint
export const store_offset_ptr = store_offset_uint
export const store_int = (mem: DataView, ptr: number, value: number): void => {
    mem.setInt32(ptr, value, little_endian)
}
export const store_offset_int = (mem: DataView, offset: ByteOffset, value: number): void => {
    mem.setInt32(offset.off(4), value, little_endian)
}

export const load_u64 = (mem: DataView, addr: number, le = little_endian): bigint => {
    return mem.getBigUint64(addr, le)
}
export const load_i64 = (mem: DataView, addr: number, le = little_endian): bigint => {
    return mem.getBigInt64(addr, le)
}
export const load_u64le = (mem: DataView, addr: number): bigint => {
    return mem.getBigUint64(addr, true)
}
export const load_i64le = (mem: DataView, addr: number): bigint => {
    return mem.getBigInt64(addr, true)
}
export const load_u64be = (mem: DataView, addr: number): bigint => {
    return mem.getBigUint64(addr, false)
}
export const load_i64be = (mem: DataView, addr: number): bigint => {
    return mem.getBigInt64(addr, false)
}

export const load_offset_u64 = (mem: DataView, offset: ByteOffset): bigint => {
    return load_u64(mem, offset.off(8))
}
export const load_offset_i64 = (mem: DataView, offset: ByteOffset): bigint => {
    return load_i64(mem, offset.off(8))
}
export const load_offset_u64le = (mem: DataView, offset: ByteOffset): bigint => {
    return load_u64le(mem, offset.off(8))
}
export const load_offset_i64le = (mem: DataView, offset: ByteOffset): bigint => {
    return load_i64le(mem, offset.off(8))
}
export const load_offset_u64be = (mem: DataView, offset: ByteOffset): bigint => {
    return load_u64be(mem, offset.off(8))
}
export const load_offset_i64be = (mem: DataView, offset: ByteOffset): bigint => {
    return load_i64be(mem, offset.off(8))
}

export const store_u64 = (mem: DataView, ptr: number, value: bigint): void => {
    mem.setBigUint64(ptr, value, little_endian)
}
export const store_offset_u64 = (mem: DataView, offset: ByteOffset, value: bigint): void => {
    mem.setBigUint64(offset.off(8), value, little_endian)
}
export const store_i64 = (mem: DataView, ptr: number, value: bigint, le = little_endian): void => {
    mem.setBigInt64(ptr, value, le)
}
export const store_offset_i64 = (
    mem: DataView,
    offset: ByteOffset,
    value: bigint,
    le = little_endian,
): void => {
    mem.setBigInt64(offset.off(8), value, le)
}
export const store_u64le = (mem: DataView, ptr: number, value: bigint): void => {
    mem.setBigUint64(ptr, value, true)
}
export const store_offset_u64le = (mem: DataView, offset: ByteOffset, value: bigint): void => {
    mem.setBigUint64(offset.off(8), value, true)
}
export const store_u64be = (mem: DataView, ptr: number, value: bigint): void => {
    mem.setBigUint64(ptr, value, false)
}
export const store_offset_u64be = (mem: DataView, offset: ByteOffset, value: bigint): void => {
    mem.setBigUint64(offset.off(8), value, false)
}
export const store_i64le = (mem: DataView, ptr: number, value: bigint): void => {
    mem.setBigInt64(ptr, value, true)
}
export const store_offset_i64le = (mem: DataView, offset: ByteOffset, value: bigint): void => {
    mem.setBigInt64(offset.off(8), value, true)
}
export const store_i64be = (mem: DataView, ptr: number, value: bigint): void => {
    mem.setBigInt64(ptr, value, false)
}
export const store_offset_i64be = (mem: DataView, offset: ByteOffset, value: bigint): void => {
    mem.setBigInt64(offset.off(8), value, false)
}

export const store_u64_number = (
    mem: DataView,
    ptr: number,
    value: number,
    le = little_endian,
): void => {
    mem.setUint32(ptr + 4 * (!le as any), value, le)
    mem.setUint32(ptr + 4 * (le as any), Math.floor(value / 4294967296), le)
}
export const store_offset_u64_number = (
    mem: DataView,
    offset: ByteOffset,
    value: number,
    le = little_endian,
): void => {
    store_u64_number(mem, offset.off(8), value, le)
}
export const store_u64le_number = (mem: DataView, ptr: number, value: number): void => {
    store_u64_number(mem, ptr, value, true)
}
export const store_offset_u64le_number = (
    mem: DataView,
    offset: ByteOffset,
    value: number,
): void => {
    store_u64_number(mem, offset.off(8), value, true)
}
export const store_u64be_number = (mem: DataView, ptr: number, value: number): void => {
    store_u64_number(mem, ptr, value, false)
}
export const store_offset_u64be_number = (
    mem: DataView,
    offset: ByteOffset,
    value: number,
): void => {
    store_u64_number(mem, offset.off(8), value, false)
}
export const store_i64_number = (
    mem: DataView,
    ptr: number,
    value: number,
    le = little_endian,
): void => {
    mem.setInt32(ptr + 4 * (!le as any), value, le)
    mem.setInt32(ptr + 4 * (le as any), Math.floor(value / 4294967296), le)
}
export const store_offset_i64_number = (
    mem: DataView,
    offset: ByteOffset,
    value: number,
    le = little_endian,
): void => {
    store_i64_number(mem, offset.off(8), value, le)
}
export const store_i64le_number = (mem: DataView, ptr: number, value: number): void => {
    store_i64_number(mem, ptr, value, true)
}
export const store_offset_i64le_number = (
    mem: DataView,
    offset: ByteOffset,
    value: number,
): void => {
    store_i64_number(mem, offset.off(8), value, true)
}
export const store_i64be_number = (mem: DataView, ptr: number, value: number): void => {
    store_i64_number(mem, ptr, value, false)
}
export const store_offset_i64be_number = (
    mem: DataView,
    offset: ByteOffset,
    value: number,
): void => {
    store_i64_number(mem, offset.off(8), value, false)
}

export const load_u128 = (mem: DataView, addr: number, le = little_endian): bigint => {
    const lo = mem.getBigUint64(addr + 8 * (!le as any), le)
    const hi = mem.getBigUint64(addr + 8 * (le as any), le)
    return lo + (hi << 64n)
}
export const load_i128 = (mem: DataView, addr: number, le = little_endian): bigint => {
    const lo = mem.getBigUint64(addr + 8 * (!le as any), le)
    const hi = mem.getBigInt64(addr + 8 * (le as any), le)
    return lo + (hi << 64n)
}
export const load_u128le = (mem: DataView, addr: number): bigint => {
    return load_u128(mem, addr, true)
}
export const load_i128le = (mem: DataView, addr: number): bigint => {
    return load_i128(mem, addr, true)
}
export const load_u128be = (mem: DataView, addr: number): bigint => {
    return load_u128(mem, addr, false)
}
export const load_i128be = (mem: DataView, addr: number): bigint => {
    return load_i128(mem, addr, false)
}

export const load_offset_u128 = (mem: DataView, offset: ByteOffset): bigint => {
    return load_u128(mem, offset.off(16))
}
export const load_offset_i128 = (mem: DataView, offset: ByteOffset): bigint => {
    return load_i128(mem, offset.off(16))
}
export const load_offset_u128le = (mem: DataView, offset: ByteOffset): bigint => {
    return load_u128le(mem, offset.off(16))
}
export const load_offset_i128le = (mem: DataView, offset: ByteOffset): bigint => {
    return load_i128le(mem, offset.off(16))
}
export const load_offset_u128be = (mem: DataView, offset: ByteOffset): bigint => {
    return load_u128be(mem, offset.off(16))
}
export const load_offset_i128be = (mem: DataView, offset: ByteOffset): bigint => {
    return load_i128be(mem, offset.off(16))
}

export const store_u128 = (mem: DataView, ptr: number, value: bigint, le = little_endian): void => {
    mem.setBigUint64(ptr + 8 * (!le as any), value & 0xffffffffffffffffn, le)
    mem.setBigUint64(ptr + 8 * (le as any), value >> 64n, le)
}
export const store_offset_u128 = (
    mem: DataView,
    offset: ByteOffset,
    value: bigint,
    le = little_endian,
): void => {
    store_u128(mem, offset.off(16), value, le)
}
export const store_i128 = (mem: DataView, ptr: number, value: bigint, le = little_endian): void => {
    mem.setBigUint64(ptr + 8 * (!le as any), value & 0xffffffffffffffffn, le)
    mem.setBigInt64(ptr + 8 * (le as any), value >> 64n, le)
}
export const store_offset_i128 = (
    mem: DataView,
    offset: ByteOffset,
    value: bigint,
    le = little_endian,
): void => {
    store_i128(mem, offset.off(16), value, le)
}
export const store_u128le = (mem: DataView, ptr: number, value: bigint): void => {
    store_u128(mem, ptr, value, true)
}
export const store_offset_u128le = (mem: DataView, offset: ByteOffset, value: bigint): void => {
    store_u128(mem, offset.off(16), value, true)
}
export const store_u128be = (mem: DataView, ptr: number, value: bigint): void => {
    store_u128(mem, ptr, value, false)
}
export const store_offset_u128be = (mem: DataView, offset: ByteOffset, value: bigint): void => {
    store_u128(mem, offset.off(16), value, false)
}
export const store_i128le = (mem: DataView, ptr: number, value: bigint): void => {
    store_i128(mem, ptr, value, true)
}
export const store_offset_i128le = (mem: DataView, offset: ByteOffset, value: bigint): void => {
    store_i128(mem, offset.off(16), value, true)
}
export const store_i128be = (mem: DataView, ptr: number, value: bigint): void => {
    store_i128(mem, ptr, value, false)
}
export const store_offset_i128be = (mem: DataView, offset: ByteOffset, value: bigint): void => {
    store_i128(mem, offset.off(16), value, false)
}

export const load_f16 = (mem: DataView, addr: number, le = little_endian): number => {
    const lo = mem.getUint8(addr + (le as any))
    const hi = mem.getUint8(addr + (!le as any))

    const sign = lo >> 7
    const exp = (lo & 0b01111100) >> 2
    const mant = ((lo & 0b00000011) << 8) | hi

    switch (exp) {
        case 0b11111:
            return mant ? NaN : sign ? -Infinity : Infinity
        case 0:
            return Math.pow(-1, sign) * Math.pow(2, -14) * (mant / 1024)
        default:
            return Math.pow(-1, sign) * Math.pow(2, exp - 15) * (1 + mant / 1024)
    }
}
export const load_f16le = (mem: DataView, addr: number): number => {
    return load_f16(mem, addr, true)
}
export const load_f16be = (mem: DataView, addr: number): number => {
    return load_f16(mem, addr, false)
}

export const load_f32 = (mem: DataView, addr: number, le = little_endian): number => {
    return mem.getFloat32(addr, le)
}
export const load_f32le = (mem: DataView, addr: number): number => {
    return mem.getFloat32(addr, true)
}
export const load_f32be = (mem: DataView, addr: number): number => {
    return mem.getFloat32(addr, false)
}

export const load_f64 = (mem: DataView, addr: number, le = little_endian): number => {
    return mem.getFloat64(addr, le)
}
export const load_f64le = (mem: DataView, addr: number): number => {
    return mem.getFloat64(addr, true)
}
export const load_f64be = (mem: DataView, addr: number): number => {
    return mem.getFloat64(addr, false)
}

export const load_offset_f16 = (mem: DataView, offset: ByteOffset): number => {
    return load_f16(mem, offset.off(2))
}
export const load_offset_f16le = (mem: DataView, offset: ByteOffset): number => {
    return load_f16le(mem, offset.off(2))
}
export const load_offset_f16be = (mem: DataView, offset: ByteOffset): number => {
    return load_f16be(mem, offset.off(2))
}
export const load_offset_f32 = (mem: DataView, offset: ByteOffset): number => {
    return load_f32(mem, offset.off(4))
}
export const load_offset_f32le = (mem: DataView, offset: ByteOffset): number => {
    return load_f32le(mem, offset.off(4))
}
export const load_offset_f32be = (mem: DataView, offset: ByteOffset): number => {
    return load_f32be(mem, offset.off(4))
}
export const load_offset_f64 = (mem: DataView, offset: ByteOffset): number => {
    return load_f64(mem, offset.off(8))
}
export const load_offset_f64le = (mem: DataView, offset: ByteOffset): number => {
    return load_f64le(mem, offset.off(8))
}
export const load_offset_f64be = (mem: DataView, offset: ByteOffset): number => {
    return load_f64be(mem, offset.off(8))
}

export const store_f16 = (mem: DataView, ptr: number, value: number, le = little_endian): void => {
    let biased_exponent = 0
    let mantissa = 0
    let sign = 0

    if (isNaN(value)) {
        biased_exponent = 31
        mantissa = 1
    } else if (value === Infinity) {
        biased_exponent = 31
    } else if (value === -Infinity) {
        biased_exponent = 31
        sign = 1
    } else if (value === 0) {
        biased_exponent = 0
        mantissa = 0
    } else {
        if (value < 0) {
            sign = 1
            value = -value
        }
        const exponent = Math.min(Math.floor(Math.log2(value)), 15)
        biased_exponent = exponent + 15
        mantissa = Math.round((value / Math.pow(2, exponent) - 1) * 1024)
    }

    const lo = (sign << 7) | (biased_exponent << 2) | (mantissa >> 8)
    const hi = mantissa & 0xff

    mem.setUint8(ptr + 1 * (le as any), lo)
    mem.setUint8(ptr + 1 * (!le as any), hi)
}
export const store_offset_f16 = (
    mem: DataView,
    offset: ByteOffset,
    value: number,
    le = little_endian,
): void => {
    store_f16(mem, offset.off(2), value, le)
}
export const store_f32 = (mem: DataView, ptr: number, value: unknown): void => {
    //
}
export const store_offset_f32 = (mem: DataView, offset: ByteOffset, value: unknown): void => {
    //
}
export const store_f64 = (mem: DataView, ptr: number, value: unknown): void => {
    //
}
export const store_offset_f64 = (mem: DataView, offset: ByteOffset, value: unknown): void => {
    //
}
export const store_f16le = (mem: DataView, ptr: number, value: unknown): void => {
    //
}
export const store_offset_f16le = (mem: DataView, offset: ByteOffset, value: unknown): void => {
    //
}
export const store_f32le = (mem: DataView, ptr: number, value: unknown): void => {
    //
}
export const store_offset_f32le = (mem: DataView, offset: ByteOffset, value: unknown): void => {
    //
}
export const store_f64le = (mem: DataView, ptr: number, value: unknown): void => {
    //
}
export const store_offset_f64le = (mem: DataView, offset: ByteOffset, value: unknown): void => {
    //
}
export const store_f16be = (mem: DataView, ptr: number, value: unknown): void => {
    //
}
export const store_offset_f16be = (mem: DataView, offset: ByteOffset, value: unknown): void => {
    //
}
export const store_f32be = (mem: DataView, ptr: number, value: unknown): void => {
    //
}
export const store_offset_f32be = (mem: DataView, offset: ByteOffset, value: unknown): void => {
    //
}
export const store_f64be = (mem: DataView, ptr: number, value: unknown): void => {
    //
}
export const store_offset_f64be = (mem: DataView, offset: ByteOffset, value: unknown): void => {
    //
}

export const load_bytes = (buffer: ArrayBufferLike, ptr: number, len: number): Uint8Array => {
    return new Uint8Array(buffer, ptr, len)
}

export const load_string_buffer = (buffer: ArrayBufferLike, ptr: number, len: number): string => {
    const bytes = new Uint8Array(buffer, ptr, len)
    return new TextDecoder().decode(bytes)
}
export const load_string = (mem: DataView, ptr: number): string => {
    const len = load_u32(mem, ptr + REG_SIZE)
    ptr = load_ptr(mem, ptr)
    return load_string_buffer(mem.buffer, ptr, len)
}
export const load_cstring = (mem: DataView, ptr: number): string => {
    ptr = load_ptr(mem, ptr)
    let str = '',
        c: number
    while ((c = mem.getUint8(ptr))) {
        str += String.fromCharCode(c)
        ptr++
    }
    return str
}
export const load_rune = (mem: DataView, ptr: number): string => {
    const code = load_u32(mem, ptr)
    return String.fromCharCode(code)
}

export const load_offset_string = (mem: DataView, offset: ByteOffset): string => {
    return load_string(mem, offset.off(8))
}
export const load_offset_cstring = (mem: DataView, offset: ByteOffset): string => {
    return load_cstring(mem, offset.off(4))
}
export const load_offset_rune = (mem: DataView, offset: ByteOffset): string => {
    return load_rune(mem, offset.off(4))
}

export const store_string = (mem: DataView, ptr: number, value: unknown): void => {
    //
}
export const store_offset_string = (mem: DataView, offset: ByteOffset, value: unknown): void => {
    //
}
export const store_cstring = (mem: DataView, ptr: number, value: unknown): void => {
    //
}
export const store_offset_cstring = (mem: DataView, offset: ByteOffset, value: unknown): void => {
    //
}
export const store_rune = (mem: DataView, ptr: number, value: unknown): void => {
    //
}
export const store_offset_rune = (mem: DataView, offset: ByteOffset, value: unknown): void => {
    //
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
