import * as solid from 'solid-js'

export type Atom<T> = solid.Accessor<T> & {
    get value(): T
    peak(): T
    set(value: T): T
    update: solid.Setter<T>
    trigger(): void
}

export function atom<T>(initialValue: T, options?: solid.SignalOptions<T>): Atom<T>
export function atom<T = undefined>(
    initialValue?: undefined,
    options?: solid.SignalOptions<T | undefined>,
): Atom<T | undefined>
export function atom<T>(initialValue: T, options?: solid.SignalOptions<T>): Atom<T> {
    let mutating = false

    const equals = (options?.equals ?? solid.equalFn) || (() => false)
    const [atom, setter] = solid.createSignal(initialValue, {
        ...options,
        equals: (a, b) => (mutating ? (mutating = false) : equals(a, b)),
    }) as [Atom<T>, solid.Setter<T>]

    atom.update = setter
    atom.trigger = () => {
        mutating = true
        setter(p => p)
    }
    atom.set = value => setter(() => value)
    atom.peak = () => solid.untrack(atom)

    Object.defineProperty(atom, 'value', { get: atom })

    return atom
}
