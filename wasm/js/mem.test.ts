import * as vi from 'vitest'
import * as mem from './mem.js'

void vi.describe('f16', () => {
    // prettier-ignore
    const float_bit_pairs:
        [float: number, be_bits: number    , le_bits: number    ][] = [
        [  1.2        , 0b00111100_11001101, 0b11001101_00111100],
        [ -1.2        , 0b10111100_11001101, 0b11001101_10111100],
        [  0.0        , 0b00000000_00000000, 0b00000000_00000000],
        [  1.0        , 0b00111100_00000000, 0b00000000_00111100],
        [ -1.0        , 0b10111100_00000000, 0b00000000_10111100],
        [-27.15625    , 0b11001110_11001010, 0b11001010_11001110],
        [ Infinity    , 0b01111100_00000000, 0b00000000_01111100],
        [-Infinity    , 0b11111100_00000000, 0b00000000_11111100],
    ]

    void vi.describe('loads f16', () => {
        const data = new DataView(new ArrayBuffer(2))
        for (const [f, be_bits, le_bits] of float_bit_pairs) {
            vi.it(`le: loads ${f}`, () => {
                data.setUint16(0, le_bits)
                const f16 = mem.load_f16(data, 0, true)
                vi.expect(f16).toBeCloseTo(f, 3)
            })
            vi.it(`be: loads ${f}`, () => {
                data.setUint16(0, be_bits)
                const f16 = mem.load_f16(data, 0, false)
                vi.expect(f16).toBeCloseTo(f, 3)
            })
        }
    })

    void vi.describe('stores f16', () => {
        const data = new DataView(new ArrayBuffer(2))
        for (const [f, be_bits, le_bits] of float_bit_pairs) {
            vi.it(`le: stores ${f}`, () => {
                mem.store_f16(data, 0, f, true)
                const f16 = data.getUint16(0)
                vi.expect(f16).toBe(le_bits)
            })
            vi.it(`be: stores ${f}`, () => {
                mem.store_f16(data, 0, f, false)
                const f16 = data.getUint16(0)
                vi.expect(f16).toBe(be_bits)
            })
        }
    })
})
