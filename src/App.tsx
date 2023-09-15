import {Arr, Misc} from '@nothing-but/utils'
import './App.css'
import * as solid from './atom.ts'

function getMeteredIceServers(): readonly RTCIceServer[] {
    const ice_servers: RTCIceServer[] = [{urls: 'stun:stun.relay.metered.ca:80'}]

    const username = import.meta.env.VITE_METERED_USERNAME
    const credential = import.meta.env.VITE_METERED_CREDENTIAL

    if (credential && username) {
        void ice_servers.push.apply(ice_servers, [
            {
                urls: 'turn:a.relay.metered.ca:80',
                username,
                credential,
            },
            {
                urls: 'turn:a.relay.metered.ca:80?transport=tcp',
                username,
                credential,
            },
            {
                urls: 'turn:a.relay.metered.ca:443',
                username,
                credential,
            },
            {
                urls: 'turn:a.relay.metered.ca:443?transport=tcp',
                username,
                credential,
            },
        ])
    }

    return ice_servers
}

const METERED_ICE_SERVERS = getMeteredIceServers()

const fetchStunUrls = async (): Promise<string[] | Error> => {
    try {
        const response = await fetch(
            'https://raw.githubusercontent.com/pradt2/always-online-stun/master/valid_hosts.txt',
        )
        const text = await response.text()

        return Arr.map_non_nullable(text.split('\n'), line => {
            if (line.length === 0) return null
            return `stun:${line}`
        })
    } catch (e) {
        return Misc.toError(e)
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
    id: solid.Atom<number | undefined>
    peers: PeerState[]
    rtc_config: RTCConfiguration
    onMessage: (message: Message) => void
    onPeerConnect: (peer: PeerState) => void
    onPeerDisconnect: (peer: PeerState) => void
}

interface PeerState {
    id: number
    conn: RTCPeerConnection
    state: 'connecting' | 'connected' | 'disconnected'
    in_channel: RTCDataChannel | null
    out_channel: RTCDataChannel
}

onerror = (_, source, lineno, colno, error) =>
    alert(`Error: ${error && error.message}\nSource: ${source}\nLine: ${lineno}\nColumn: ${colno}`)

function makePeerState(hive: HiveState, id: number): PeerState {
    const peer: PeerState = {
        conn: null!,
        id,
        state: 'connecting',
        in_channel: null,
        out_channel: null!,
    }
    hive.peers.push(peer)

    const conn = new RTCPeerConnection(hive.rtc_config)
    peer.conn = conn

    conn.onicecandidate = event => {
        if (!event.candidate) return

        hive.onMessage({
            type: 'candidate',
            data: event.candidate.toJSON(),
            id,
        })
    }

    conn.onconnectionstatechange = () => {
        if (conn.connectionState === 'disconnected') {
            hive.onPeerDisconnect(peer)
        }
    }

    conn.ondatachannel = event => {
        peer.in_channel = event.channel

        handlePeerChannelOpen(hive, peer)

        peer.in_channel.addEventListener('close', () => {
            handlePeerChannelClose(hive, peer)
        })
    }

    const out_channel = peer.conn.createDataChannel('data')
    peer.out_channel = out_channel

    out_channel.onopen = () => {
        handlePeerChannelOpen(hive, peer)
    }
    out_channel.addEventListener('close', () => {
        handlePeerChannelClose(hive, peer)
    })

    return peer
}

function handlePeerChannelOpen(hive: HiveState, peer: PeerState): void {
    if (
        peer.state === 'disconnected' ||
        !peer.in_channel ||
        peer.in_channel.readyState !== 'open' ||
        peer.out_channel.readyState !== 'open'
    )
        return

    peer.state = 'connected'
    hive.onPeerConnect(peer)
}

function handlePeerChannelClose(hive: HiveState, peer: PeerState): void {
    if (peer.state === 'disconnected') return
    cleanupPeer(peer)
    hive.onPeerDisconnect(peer)
}

function cleanupPeer(peer: PeerState): void {
    peer.state = 'disconnected'
    peer.conn.close()
    peer.in_channel?.close()
    peer.in_channel = null
    peer.out_channel.close()
}

function getPeerState(conns: readonly PeerState[], id: number): PeerState | undefined {
    for (const conn of conns) {
        if (conn.id === id) return conn
    }
}

interface BaseMessage {
    type: string
    data: unknown
    id?: number
}

/**
 * You got an id from the server.
 */
interface IdMessage extends BaseMessage {
    type: 'id'
    data: number // your id
}

/**
 * Initiate a peer connection.
 * This will create an offer and send it to the server.
 */
interface InitMessage extends BaseMessage {
    type: 'init'
    data: number[] // ids of peers to connect to
}

/**
 * You got an offer from a peer.
 * Set the remote description, create an answer, and send it back to the peer.
 */
interface OfferMessage extends BaseMessage {
    type: 'offer'
    data: string
    id: number
}

/**
 * You got an offer answer from a peer.
 * Set the remote description.
 */
interface AnswerMessage extends BaseMessage {
    type: 'answer'
    data: string
    id: number
}

/**
 * You got an ice candidate from a peer.
 * Add the ice candidate.
 */
interface CandidateMessage extends BaseMessage {
    type: 'candidate'
    data: RTCIceCandidateInit
    id: number
}

type Message = IdMessage | InitMessage | OfferMessage | AnswerMessage | CandidateMessage

function parseMessage(string: string): Message | undefined {
    const message = JSON.parse(string)
    if (typeof message !== 'object' || !message || typeof message.type !== 'string') return

    switch (message.type as Message['type']) {
        case 'id':
            if (typeof message.data !== 'number') return
            break
        case 'init':
            if (!Array.isArray(message.data)) return
            break
        case 'offer':
        case 'answer': {
            if (typeof message.data !== 'string' || typeof message.id !== 'number') return
            break
        }
        case 'candidate': {
            if (typeof message.data !== 'object' || !message.data || typeof message.id !== 'number')
                return
            break
        }
    }
    return message
}

function handleMessage(hive: HiveState, data: string): void {
    const message = parseMessage(data)
    if (!message) return

    switch (message.type) {
        case 'id': {
            hive.id.set(message.data)
            break
        }
        case 'init': {
            for (const peer_id of message.data) {
                const peer = makePeerState(hive, peer_id)

                /*
                    Offer
                */
                void peer.conn
                    .createOffer()
                    .then(offer => peer.conn.setLocalDescription(offer))
                    .then(() => {
                        if (!peer.conn.localDescription) return

                        hive.onMessage({
                            type: 'offer',
                            data: peer.conn.localDescription.sdp,
                            id: peer_id,
                        })
                    })
            }

            break
        }
        case 'offer': {
            const peer = makePeerState(hive, message.id)

            void peer.conn.setRemoteDescription({
                type: 'offer',
                sdp: message.data,
            })

            /*
                Answer
            */
            void peer.conn
                .createAnswer()
                .then(answer => peer.conn.setLocalDescription(answer))
                .then(() => {
                    if (!peer.conn.localDescription) return

                    hive.onMessage({
                        type: 'answer',
                        data: peer.conn.localDescription.sdp,
                        id: message.id,
                    })
                })

            break
        }
        case 'answer': {
            const peer = getPeerState(hive.peers, message.id)
            if (!peer) return

            void peer.conn.setRemoteDescription({
                type: 'answer',
                sdp: message.data,
            })

            break
        }
        case 'candidate': {
            const peer = getPeerState(hive.peers, message.id)
            if (!peer) return

            void peer.conn.addIceCandidate(message.data)

            break
        }
    }
}

function App(props: {stun_urls: string[]}) {
    const ws = new WebSocket('ws://' + location.hostname + ':8080/rtc')

    const message_list = solid.atom<string[]>([])
    const peer_trigger = solid.atom()

    const hive: HiveState = {
        id: solid.atom(),
        peers: [],
        rtc_config: {iceServers: METERED_ICE_SERVERS.concat([{urls: props.stun_urls}])},
        onMessage: message => {
            ws.send(JSON.stringify(message))
        },
        onPeerConnect: peer => {
            peer.in_channel!.onmessage = event => {
                message_list().push(peer.id + ' ' + String(event.data))
                message_list.trigger()
            }
            peer_trigger.trigger()
        },
        onPeerDisconnect: peer => {
            for (let i = 0; i < hive.peers.length; i++) {
                if (hive.peers[i]!.id === peer.id) {
                    hive.peers.splice(i, 1)
                    break
                }
            }
            peer_trigger.trigger()
        },
    }

    void solid.onCleanup(() => {
        ws.close()
        hive.peers.forEach(cleanupPeer)
    })

    ws.onmessage = event => {
        handleMessage(hive, event.data)
    }

    let input!: HTMLInputElement
    return (
        <>
            <div
                style={`
                    position: absolute;
                    top: 0;
                    left: 0;
                `}
            >
                <h4>Own ID: {hive.id()}</h4>
            </div>
            <form
                onSubmit={e => {
                    e.preventDefault()
                    const value = input.value
                    hive.peers.forEach(peer => {
                        if (peer.state !== 'connected') return
                        peer.out_channel.send(value)
                    })
                    message_list().push('me ' + value)
                    message_list.trigger()
                    input.value = ''
                }}
            >
                <input ref={input} />
            </form>
            <div
                style={`
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    grid-gap: 10px;
                `}
            >
                <div>
                    <h4>Messages</h4>
                    <ul>
                        <solid.For each={message_list()}>{item => <li>{item}</li>}</solid.For>
                    </ul>
                </div>
                <div>
                    <h4>Peers</h4>
                    <ul>
                        <solid.For each={(peer_trigger(), hive.peers)}>
                            {peer => <li>{peer.id}</li>}
                        </solid.For>
                    </ul>
                </div>
            </div>
        </>
    )
}

function Root() {
    const stun_urls$ = solid.resource(async () => {
        const result = await fetchStunUrls()
        if (result instanceof Error) throw result
        return result
    })

    return (
        <solid.Suspense>
            <solid.Show when={stun_urls$()}>
                {stunUrls => <App stun_urls={stunUrls()} />}
            </solid.Show>
        </solid.Suspense>
    )
}

export default Root
