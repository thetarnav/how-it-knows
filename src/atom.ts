import * as solid from 'solid-js'

export * from 'solid-js'

export type Atom<T> = solid.Accessor<T> & {
    get value(): T
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
        void setter(p => p)
    }
    atom.set = value => setter(() => value)

    return Object.defineProperty(atom, 'value', {get: atom})
}

export function mutate<T>(atom: Atom<T>, mutator: (value: T) => void): void {
    mutator(solid.untrack(atom))
    atom.trigger()
}

export const resource: {
    <T, R = unknown>(
        fetcher: solid.ResourceFetcher<true, T, R>,
        options: solid.InitializedResourceOptions<solid.NoInfer<T>, true>,
    ): solid.InitializedResource<T> & solid.ResourceActions<T, R>

    <T, R = unknown>(
        fetcher: solid.ResourceFetcher<true, T, R>,
        options?: solid.ResourceOptions<solid.NoInfer<T>, true>,
    ): solid.Resource<T> & solid.ResourceActions<T | undefined, R>

    <T, S, R = unknown>(
        source: solid.ResourceSource<S>,
        fetcher: solid.ResourceFetcher<S, T, R>,
        options: solid.InitializedResourceOptions<solid.NoInfer<T>, S>,
    ): solid.InitializedResource<T> & solid.ResourceActions<T, R>

    <T, S, R = unknown>(
        source: solid.ResourceSource<S>,
        fetcher: solid.ResourceFetcher<S, T, R>,
        options?: solid.ResourceOptions<solid.NoInfer<T>, S>,
    ): solid.Resource<T> & solid.ResourceActions<T | undefined, R>
} = (...args: [any]) => {
    const [data, actions] = solid.createResource(...args)
    return Object.assign(data, actions) as any
}
