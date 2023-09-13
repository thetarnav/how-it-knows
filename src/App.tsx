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

interface HiveState {
    ws: WebSocket
    peers: PeerState[]
    rtc_config: RTCConfiguration
}

interface PeerState {
    id: number
    conn: RTCPeerConnection
    dead: boolean
    channel: RTCDataChannel | null
    channel_open: boolean
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

function parseMessage(string: string): Message | undefined {
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

function sendResponse(ws: WebSocket, response: Message): void {
    ws.send(JSON.stringify(response))
}

function makePeerState(hive: HiveState, id: number): PeerState {
    const conn = new RTCPeerConnection(hive.rtc_config)

    const peer: PeerState = {
        conn,
        channel: null,
        id,
        channel_open: false,
        dead: false,
    }
    hive.peers.push(peer)

    conn.onicecandidate = event => {
        if (!event.candidate) return

        sendResponse(hive.ws, {
            type: 'candidate',
            data: event.candidate.toJSON(),
            id,
        })
    }

    conn.onconnectionstatechange = () => {
        if (conn.connectionState === 'disconnected') {
            removePeer(hive.peers, id)
            cleanupPeer(peer)
        }
    }

    return peer
}

function removePeer(peers: PeerState[], id: number): void {
    for (let i = 0; i < peers.length; i++) {
        if (peers[i]!.id === id) {
            peers.splice(i, 1)
            return
        }
    }
}

function cleanupPeer(peer: PeerState): void {
    if (peer.dead) return

    console.log('cleanup peer', peer.id)

    peer.conn.close()
    peer.channel?.close()
    peer.channel = null
    peer.channel_open = false
    peer.dead = true
}

function getPeerState(conns: readonly PeerState[], id: number): PeerState | undefined {
    for (const conn of conns) {
        if (conn.id === id) return conn
    }
}

function handleMessage(hive: HiveState, data: string): void {
    const message = parseMessage(data)
    if (!message) return

    const peer_id = message.id

    switch (message.type) {
        case 'init': {
            const peer = makePeerState(hive, peer_id)

            /*
                New channel
            */
            const channel = peer.conn.createDataChannel('data')
            channel.onopen = () => {
                console.log('channel open with', peer_id)
            }
            channel.addEventListener('close', () => {
                removePeer(hive.peers, peer_id)
                cleanupPeer(peer)
            })
            channel.onmessage = event => {
                console.log('channel message', event.data)
            }
            channel.onerror = event => {
                console.log('channel error', event)
            }

            /*
                Offer
            */
            void peer.conn
                .createOffer()
                .then(offer => peer.conn.setLocalDescription(offer))
                .then(() => {
                    if (!peer.conn.localDescription) return

                    sendResponse(hive.ws, {
                        type: 'offer',
                        data: peer.conn.localDescription.sdp,
                        id: peer_id,
                    })
                })

            break
        }
        case 'offer': {
            const peer = makePeerState(hive, peer_id)

            void peer.conn.setRemoteDescription({
                type: 'offer',
                sdp: message.data,
            })

            peer.conn.ondatachannel = event => {
                console.log('got data channel with', peer_id)

                peer.channel = event.channel
                peer.channel.addEventListener('close', () => {
                    removePeer(hive.peers, peer_id)
                    cleanupPeer(peer)
                })
            }

            /*
                Answer
            */
            void peer.conn
                .createAnswer()
                .then(answer => peer.conn.setLocalDescription(answer))
                .then(() => {
                    if (!peer.conn.localDescription) return

                    sendResponse(hive.ws, {
                        type: 'answer',
                        data: peer.conn.localDescription.sdp,
                        id: peer_id,
                    })
                })

            break
        }
        case 'answer': {
            const peer = getPeerState(hive.peers, peer_id)
            if (!peer) return

            void peer.conn.setRemoteDescription({
                type: 'answer',
                sdp: message.data,
            })

            break
        }
        case 'candidate': {
            const peer = getPeerState(hive.peers, peer_id)
            if (!peer) return

            void peer.conn.addIceCandidate(message.data)

            break
        }
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
                {stunUrls => {
                    const ws = new WebSocket('ws://localhost:8080/rtc')

                    const hive: HiveState = {
                        ws,
                        peers: [],
                        rtc_config: {iceServers: [{urls: stunUrls()}]},
                    }

                    void solid.onCleanup(() => {
                        ws.close()
                        hive.peers.forEach(cleanupPeer)
                    })

                    ws.onopen = () => {
                        console.log('ws open')
                    }

                    ws.onmessage = event => {
                        handleMessage(hive, event.data)
                    }

                    ws.onerror = event => {
                        console.log({event})
                    }

                    ws.onclose = () => {
                        console.log('ws close')
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
