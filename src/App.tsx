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

/*
TODO multiple connections
*/
interface RTCState {
    ws_state: 'connecting' | 'open' | 'closed'
    connection: RTCPeerConnection
    channels: RTCDataChannel | null
    peer_id: number | null
}

interface BaseMessage {
    type: string
    data: unknown
    id: number
}

/**
 * Initiate a peer connection.
 * This will create an offer and send it to the server.
 */
interface InitMessage extends BaseMessage {
    type: 'init'
    data: undefined
}

/**
 * You got an offer from a peer.
 * Set the remote description, create an answer, and send it back to the peer.
 */
interface OfferMessage extends BaseMessage {
    type: 'offer'
    data: string
}

/**
 * You got an offer answer from a peer.
 * Set the remote description.
 */
interface AnswerMessage extends BaseMessage {
    type: 'answer'
    data: string
}

/**
 * You got an ice candidate from a peer.
 * Add the ice candidate.
 */
interface CandidateMessage extends BaseMessage {
    type: 'candidate'
    data: RTCIceCandidateInit
}

type Message = InitMessage | OfferMessage | AnswerMessage | CandidateMessage

/*
? What happens if it fails?
? What happens if the connection is closed?
? What happens if the connection is closed before the offer is sent?
*/

function messageFromString(string: string): Message | undefined {
    const data = JSON.parse(string)
    if (
        typeof data !== 'object' ||
        data === null ||
        typeof data.type !== 'string' ||
        typeof data.id !== 'number'
    )
        return

    switch (data.type) {
        case 'init':
            return {type: 'init', id: data.id, data: undefined}
        case 'offer':
        case 'answer': {
            if (typeof data.data !== 'string') return
            return {
                type: data.type,
                data: data.data,
                id: data.id,
            }
        }
        case 'candidate': {
            if (typeof data.data !== 'object' || data.data === null) return
            return {
                type: 'candidate',
                data: data.data,
                id: data.id,
            }
        }
    }
    return
}

type SendResponse = (response: Message) => void

function handleMessage(state: RTCState, message: Message, sendResponse: SendResponse): void {
    const {connection} = state

    console.log('message', message)

    switch (message.type) {
        case 'init': {
            /*
                Data channel
            */
            const channel = connection.createDataChannel('data')
            channel.onopen = () => {
                console.log('channel open')
            }
            channel.onclose = () => {
                console.log('channel close')
            }
            channel.onmessage = event => {
                console.log('channel message', event.data)
            }
            channel.onerror = event => {
                console.log('channel error', event)
            }

            state.channels = channel
            state.peer_id = message.id

            /*
                Offer
            */
            void connection
                .createOffer()
                .then(offer => connection.setLocalDescription(offer))
                .then(() => {
                    if (!connection.localDescription) return

                    const sdp = connection.localDescription.sdp
                    const response: Message = {
                        type: 'offer',
                        data: sdp,
                        id: message.id,
                    }
                    sendResponse(response)
                })

            break
        }
        case 'offer': {
            state.peer_id = message.id

            void connection.setRemoteDescription({
                type: 'offer',
                sdp: message.data,
            })

            void connection
                .createAnswer()
                .then(answer => connection.setLocalDescription(answer))
                .then(() => {
                    if (!connection.localDescription) return

                    const sdp = connection.localDescription.sdp
                    const response: Message = {
                        type: 'answer',
                        data: sdp,
                        id: message.id,
                    }
                    sendResponse(response)
                })

            break
        }
        case 'answer': {
            void connection.setRemoteDescription({
                type: 'answer',
                sdp: message.data,
            })

            break
        }
        case 'candidate': {
            void connection.addIceCandidate(message.data)

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
                        channels: null,
                        peer_id: null,
                    })

                    void solid.onCleanup(() => {
                        rtc_conn.close()
                        ws.close()
                    })

                    const sendResponse: SendResponse = response => {
                        ws.send(JSON.stringify(response))
                    }

                    ws.onopen = () => {
                        rtc_state$().ws_state = 'open'
                        rtc_state$.trigger()
                    }

                    ws.onmessage = event => {
                        const message = messageFromString(event.data)
                        if (!message) return
                        handleMessage(rtc_state$(), message, sendResponse)
                    }

                    ws.onerror = event => {
                        console.log({event})
                    }

                    ws.onclose = () => {
                        rtc_state$().ws_state = 'closed'
                        rtc_state$.trigger()
                    }

                    rtc_conn.onicecandidate = event => {
                        if (!event.candidate) return

                        console.log('ice candidate', event.candidate.address)

                        const peer_id = rtc_state$().peer_id

                        if (peer_id === null) {
                            console.error('no peer id')
                            return
                        }

                        const candidate: RTCIceCandidateInit = event.candidate.toJSON()

                        const response: Message = {
                            type: 'candidate',
                            data: candidate,
                            id: peer_id,
                        }
                        sendResponse(response)
                    }

                    rtc_conn.ondatachannel = event => {
                        console.log('got data channel!')
                    }

                    const peer_type$ = solid.atom<'a' | 'b'>()

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
