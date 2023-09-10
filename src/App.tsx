import * as solid from 'solid-js'
import './App.css'

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

function App() {
    const [count, setCount] = solid.createSignal(0)

    //   const local_connection = new RTCPeerConnection()

    //   const channel = local_connection.createDataChannel("sendChannel")

    //   function handleEvent(event: Event) {
    //     console.log({ event })
    //   }

    //   channel.onopen = handleEvent
    //   channel.onclose = handleEvent

    //   const remote_connection = new RTCPeerConnection()
    //   remote_connection.ondatachannel = event => {
    //     console.log("data channel", { event })
    //   }

    //   function handleError(reason: unknown) {
    //     console.log({ reason })
    //   }

    //   local_connection.onicecandidate = e =>
    //     !e.candidate || remote_connection.addIceCandidate(e.candidate).catch(handleError)

    //   remote_connection.onicecandidate = e =>
    //     !e.candidate || local_connection.addIceCandidate(e.candidate).catch(handleError)

    //   local_connection
    //     .createOffer()
    //     .then(offer => local_connection.setLocalDescription(offer))
    //     .then(
    //       () =>
    //         local_connection.localDescription &&
    //         remote_connection.setRemoteDescription(local_connection.localDescription)
    //     )
    //     .then(() => remote_connection.createAnswer())
    //     .then(answer => remote_connection.setLocalDescription(answer))
    //     .then(
    //       () =>
    //         remote_connection.localDescription &&
    //         local_connection.setRemoteDescription(remote_connection.localDescription)
    //     )
    //     .catch(handleError)

    const peer_type = atom<'a' | 'b'>()

    solid.createEffect(() => {
        const type = peer_type()
        if (!type) return

        if (type === 'a') {
            const connection = new RTCPeerConnection()

            const channel = connection.createDataChannel('send_channel')

            function handleEvent(event: Event) {
                console.log({ event })
            }

            function handleError(reason: unknown) {
                console.log({ reason })
            }

            channel.onopen = handleEvent
            channel.onclose = handleEvent

            connection.onicecandidate = e => {
                !e.candidate || connection.addIceCandidate(e.candidate).catch(handleError)
                console.log({ e })
            }

            solid.onCleanup(() => {
                connection.close()
            })
        } else if (type === 'b') {
            const connection = new RTCPeerConnection()

            connection.ondatachannel = event => {
                console.log('data channel', { event })
            }

            function handleError(reason: unknown) {
                console.log({ reason })
            }

            connection.onicecandidate = e => {
                !e.candidate || connection.addIceCandidate(e.candidate).catch(handleError)
                console.log({ e })
            }

            connection
                .createOffer()
                .then(offer => connection.setLocalDescription(offer))
                .then(
                    () =>
                        connection.localDescription &&
                        connection.setRemoteDescription(connection.localDescription),
                )
                .then(() => connection.createAnswer())
                .catch(handleError)

            solid.onCleanup(() => {
                connection.close()
            })
        }
    })

    return (
        <>
            <button
                onClick={() => peer_type.set('a')}
                style={{
                    background: peer_type() === 'a' ? 'red' : '',
                }}
            >
                A
            </button>
            <button
                onClick={() => peer_type.set('b')}
                style={{
                    background: peer_type() === 'b' ? 'red' : '',
                }}
            >
                B
            </button>
        </>
    )
}

export default App
