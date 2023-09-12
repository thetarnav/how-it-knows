import './App.css'
import * as solid from './atom.ts'

const toError = (e: unknown): Error =>
    e instanceof Error ? e : new Error('unknown error ' + String(e))

const arrayMapNonNullable = <T, U>(array: T[], fn: (item: T) => U): NonNullable<U>[] => {
    const result: NonNullable<U>[] = Array(array.length)
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

interface BaseMessage {
    type: string
}

/**
 * Initiate a peer connection.
 * This will create an offer and send it to the server.
 */
interface InitMessage extends BaseMessage {
    type: 'init'
}

/**
 * You got an offer from a peer.
 * Set the remote description, create an answer, and send it back to the peer.
 */
interface OfferMessage extends BaseMessage {
    type: 'offer'
    sdp: string
}

/**
 * You got an offer answer from a peer.
 * Set the remote description.
 */
interface AnswerMessage extends BaseMessage {
    type: 'answer'
    sdp: string
}

/**
 * You got an ice candidate from a peer.
 * Add the ice candidate.
 */
interface CandidateMessage extends BaseMessage {
    type: 'candidate'
    candidate: RTCIceCandidateInit
}

type Message = InitMessage | OfferMessage | AnswerMessage | CandidateMessage

function toMessage(data: string): Message | undefined {
    const message = JSON.parse(data)
    if (typeof message !== 'object' || message === null) return
    switch (message.type) {
        case 'init':
            return {type: 'init'}
        case 'offer':
        case 'answer':
            return {
                type: message.type,
                sdp: message.sdp,
            }
        case 'candidate':
            return {
                type: 'candidate',
                candidate: message.candidate,
            }
    }
    return
}

function handleMessage(state: RTCState, message: Message): void {
    switch (message.type) {
        case 'init': {
            void state.connection
                .createOffer()
                .then(offer => state.connection.setLocalDescription(offer))
                .then(() => {
                    if (state.connection.localDescription) {
                        const response = JSON.stringify(state.connection.localDescription)
                        state.channels.forEach(channel => channel.send(response))
                    }
                })

            break
        }
        case 'offer': {
            void state.connection.setRemoteDescription(message)

            void state.connection
                .createAnswer()
                .then(answer => state.connection.setLocalDescription(answer))
                .then(() => {
                    if (state.connection.localDescription) {
                        const response = JSON.stringify(state.connection.localDescription)
                        state.channels.forEach(channel => channel.send(response))
                    }
                })

            break
        }
        case 'answer': {
            void state.connection.setRemoteDescription(message)

            break
        }
        case 'candidate': {
            void state.connection.addIceCandidate(message.candidate)

            break
        }
    }
}

function App() {
    const stun_urls$ = solid.resource(async () => {
        const result = await fetchStunUrls()
        // eslint-disable-next-line functional/no-throw-statements
        if (result instanceof Error) throw result
        return result
    })

    return (
        <solid.Suspense>
            <solid.Show when={stun_urls$()}>
                {stunUrls => {
                    const rtc_conn = new RTCPeerConnection({
                        iceServers: [{urls: stunUrls()}],
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
                        const message = toMessage(event.data)
                        if (!message) return
                        handleMessage(rtc_state$(), message)
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

                            function handleEvent(event: Event): void {
                                console.log({event})
                            }

                            function handleError(reason: unknown): void {
                                console.log({reason})
                            }

                            channel.onopen = handleEvent
                            channel.onclose = handleEvent

                            connection.onicecandidate = e => {
                                !e.candidate ||
                                    connection.addIceCandidate(e.candidate).catch(handleError)
                                console.log({e})
                            }

                            void solid.onCleanup(() => {
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

                            void connection
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

                            void solid.onCleanup(() => {
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
