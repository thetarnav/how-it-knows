import './App.css'
import * as solid from './atom'

const a_conn = new RTCPeerConnection()

const channel = a_conn.createDataChannel('cool_channel')

function handleEvent(event: Event) {
    console.log({event})
}

channel.onopen = handleEvent
channel.onclose = handleEvent

const b_conn = new RTCPeerConnection()

function handleError(reason: unknown) {
    console.log({reason})
}

a_conn
    .createOffer()
    .then(offer => {
        console.log('a made offer, setting local description')
        return a_conn.setLocalDescription(offer)
    })
    .then(() => {
        console.log('b set remote description')
        return a_conn.localDescription && b_conn.setRemoteDescription(a_conn.localDescription)
    })
    .then(() => b_conn.createAnswer())
    .then(answer => {
        console.log('b made answer, setting local description')
        return b_conn.setLocalDescription(answer)
    })
    .then(() => {
        console.log('a set remote description')
        return b_conn.localDescription && a_conn.setRemoteDescription(b_conn.localDescription)
    })
    .catch(handleError)

b_conn.ondatachannel = event => {
    console.log('b got data channel', {event})
}
a_conn.onicecandidate = e => {
    if (!e.candidate) return
    console.log('a_conn got ice candidate')
    b_conn
        .addIceCandidate(e.candidate)
        .then(() => console.log('b_conn added ice candidate'))
        .catch(handleError)
}

b_conn.onicecandidate = e => {
    if (!e.candidate) return
    console.log('b_conn got ice candidate')
    a_conn.addIceCandidate(e.candidate).catch(handleError)
}

const toError = (e: unknown): Error =>
    e instanceof Error ? e : new Error('unknown error ' + String(e))

const arrayMapNonNullable = <T, U>(array: T[], fn: (item: T) => U): (U & {})[] => {
    const result: (U & {})[] = Array(array.length)
    let i = 0
    for (const item of array) {
        const mapped = fn(item)
        if (mapped != null) {
            result[i] = mapped
            i += 1
        }
    }
    result.length = i
    return result
}

const fetchStunUrls = async (): Promise<string[] | Error> => {
    try {
        const response = await fetch(
            'https://raw.githubusercontent.com/pradt2/always-online-stun/master/valid_hosts.txt',
        )
        const text = await response.text()

        return arrayMapNonNullable(text.split('\n'), line => {
            if (line.length === 0) return null
            return `stun:${line}`
        })
    } catch (e) {
        return toError(e)
    }
}

/*

get stun servers

connect to ws

wait for someone to connect
    server will keep a list of connections
    will send a message to all connections when a new connection is made

there needs to be one connection between two peers
so one peer will create an offer, and send it to ws

*/

interface RTCState {
    ws_state: 'connecting' | 'open' | 'closed'
    connection: RTCPeerConnection
    channels: RTCDataChannel[]
}

function handleMessage(state: RTCState, event: MessageEvent): void {
    const data = JSON.parse(event.data)
    if (data.type === 'offer') {
        state.connection.setRemoteDescription(data)
        state.connection
            .createAnswer()
            .then(answer => state.connection.setLocalDescription(answer))
            .then(() => {
                if (state.connection.localDescription) {
                    const message = JSON.stringify(state.connection.localDescription)
                    state.channels.forEach(channel => channel.send(message))
                }
            })
    } else if (data.type === 'answer') {
        state.connection.setRemoteDescription(data)
    } else if (data.type === 'candidate') {
        state.connection.addIceCandidate(data)
    }
}

function App() {
    const stun_urls$ = solid.resource(async () => {
        const result = await fetchStunUrls()
        if (result instanceof Error) throw result
        return result
    })

    return (
        <solid.Suspense>
            <solid.Show when={stun_urls$()}>
                {stun_urls$ => {
                    const rtc_conn = new RTCPeerConnection({
                        iceServers: [{urls: stun_urls$()}],
                    })

                    const ws = new WebSocket('ws://localhost:8080/rtc')
                    const rtc_state$ = solid.atom<RTCState>({
                        ws_state: 'connecting',
                        connection: rtc_conn,
                        channels: [],
                    })

                    ws.onopen = () => {
                        rtc_state$().ws_state = 'open'
                        rtc_state$.trigger()
                    }

                    ws.onmessage = event => {
                        handleMessage(rtc_state$(), event)
                    }

                    ws.onerror = event => {
                        console.log({event})
                    }

                    ws.onclose = () => {
                        rtc_state$().ws_state = 'closed'
                        rtc_state$.trigger()
                    }

                    const peer_type$ = solid.atom<'a' | 'b'>()

                    solid.createEffect(() => {
                        const type = peer_type$()
                        if (!type) return

                        if (type === 'a') {
                            const connection = new RTCPeerConnection()

                            const channel = connection.createDataChannel('send_channel')

                            function handleEvent(event: Event) {
                                console.log({event})
                            }

                            function handleError(reason: unknown) {
                                console.log({reason})
                            }

                            channel.onopen = handleEvent
                            channel.onclose = handleEvent

                            connection.onicecandidate = e => {
                                !e.candidate ||
                                    connection.addIceCandidate(e.candidate).catch(handleError)
                                console.log({e})
                            }

                            solid.onCleanup(() => {
                                connection.close()
                            })
                        } else if (type === 'b') {
                            const connection = new RTCPeerConnection()

                            connection.ondatachannel = event => {
                                console.log('data channel', {event})
                            }

                            function handleError(reason: unknown) {
                                console.log({reason})
                            }

                            connection.onicecandidate = e => {
                                !e.candidate ||
                                    connection.addIceCandidate(e.candidate).catch(handleError)
                                console.log({e})
                            }

                            connection
                                .createOffer()
                                .then(offer => connection.setLocalDescription(offer))
                                .then(
                                    () =>
                                        connection.localDescription &&
                                        connection.setRemoteDescription(
                                            connection.localDescription,
                                        ),
                                )
                                .then(() => connection.createAnswer())
                                .catch(handleError)

                            solid.onCleanup(() => {
                                connection.close()
                            })
                        }
                    })

                    return ''

                    // return (
                    //     <>
                    //         <div>{ws_state$()}</div>
                    //         <button
                    //             onClick={() => peer_type$.set('a')}
                    //             style={{
                    //                 background: peer_type$() === 'a' ? 'red' : '',
                    //             }}
                    //         >
                    //             A
                    //         </button>
                    //         <button
                    //             onClick={() => peer_type$.set('b')}
                    //             style={{
                    //                 background: peer_type$() === 'b' ? 'red' : '',
                    //             }}
                    //         >
                    //             B
                    //         </button>
                    //     </>
                    // )
                }}
            </solid.Show>
        </solid.Suspense>
    )
}

export default App
