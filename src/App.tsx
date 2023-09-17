import './App.css'
import {platform, solid} from './lib.ts'

function randomId(): string {
    const time = new Date().getTime().toString(36).padStart(8, '0').substring(0, 8)
    const rand = Math.random().toString(36).slice(2).padStart(8, '0').substring(0, 8)
    let id = ''
    for (let i = 0; i < 16; i++) {
        id += i % 2 === 0 ? time[7 - i / 2] : rand[(i - 1) / 2]
    }
    return id
}

function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp)
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
}

function getMeteredIceServers(): RTCIceServer[] {
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
const RTC_CONFIG: RTCConfiguration = {iceServers: METERED_ICE_SERVERS}

// const fetchStunUrls = async (): Promise<string[] | Error> => {
//     try {
//         const response = await fetch(
//             'https://raw.githubusercontent.com/pradt2/always-online-stun/master/valid_hosts.txt',
//         )
//         const text = await response.text()

//         return array.map_non_nullable(text.split('\n'), line => {
//             if (line.length === 0) return null
//             return `stun:${line}`
//         })
//     } catch (e) {
//         return misc.toError(e)
//     }
// }

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
    id: string
    peers: PeerState[]
    onMessage: (message: Message) => void
    onPeerConnect: (peer: PeerState) => void
    onPeerDisconnect: (peer: PeerState) => void
}

interface PeerState {
    id: string
    conn: RTCPeerConnection
    state: 'connecting' | 'connected' | 'disconnected'
    in_channel: RTCDataChannel | null
    out_channel: RTCDataChannel
    interval: number
}

onerror = (_, source, lineno, colno, error) =>
    alert(`Error: ${error && error.message}\nSource: ${source}\nLine: ${lineno}\nColumn: ${colno}`)

function makePeerState(hive: HiveState, id: string): PeerState {
    const peer: PeerState = {
        conn: null!,
        id,
        state: 'connecting',
        in_channel: null,
        out_channel: null!,
        interval: 0,
    }
    hive.peers.push(peer)

    /*
        Peer connection
    */
    const conn = new RTCPeerConnection(RTC_CONFIG)
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

    /*
        Data channel
    */
    const out_channel = peer.conn.createDataChannel('data')
    peer.out_channel = out_channel

    out_channel.onopen = () => {
        handlePeerChannelOpen(hive, peer)
    }
    out_channel.addEventListener('close', () => {
        handlePeerChannelClose(hive, peer)
    })

    /*
        iOS doesn't support onopen
        so we have to poll
        https://github.com/webrtc/samples/issues/1123#issuecomment-454325354
    */
    if (platform.is_ios) {
        peer.interval = setInterval(() => {
            handlePeerChannelOpen(hive, peer)
        }, 500)
    }

    return peer
}

function cleanupPeer(peer: PeerState): void {
    peer.state = 'disconnected'
    peer.conn.close()
    peer.in_channel?.close()
    peer.in_channel = null
    peer.out_channel.close()
    clearInterval(peer.interval)
    peer.interval = 0
}

function handlePeerChannelOpen(hive: HiveState, peer: PeerState): void {
    if (
        peer.state !== 'connecting' ||
        !peer.in_channel ||
        peer.in_channel.readyState !== 'open' ||
        peer.out_channel.readyState !== 'open'
    )
        return

    peer.state = 'connected'
    clearInterval(peer.interval)
    peer.interval = 0
    hive.onPeerConnect(peer)
}

function handlePeerChannelClose(hive: HiveState, peer: PeerState): void {
    if (peer.state === 'disconnected') return
    cleanupPeer(peer)
    hive.onPeerDisconnect(peer)
}

function getPeerState(conns: readonly PeerState[], id: string): PeerState | undefined {
    for (const conn of conns) {
        if (conn.id === id) return conn
    }
}

interface BaseMessage {
    type: string
    data: unknown
    id?: string
}

/**
 * Initiate a peer connection.
 * This will create an offer and send it to the server.
 */
interface InitNegotiationMessage extends BaseMessage {
    type: 'init'
    data: string[] // ids of peers to connect to
}

/**
 * You got an offer from a peer.
 * Set the remote description, create an answer, and send it back to the peer.
 */
interface OfferNegotiationMessage extends BaseMessage {
    type: 'offer'
    data: string
    id: string
}

/**
 * You got an offer answer from a peer.
 * Set the remote description.
 */
interface AnswerNegotiationMessage extends BaseMessage {
    type: 'answer'
    data: string
    id: string
}

/**
 * You got an ice candidate from a peer.
 * Add the ice candidate.
 */
interface CandidateNegotiationMessage extends BaseMessage {
    type: 'candidate'
    data: RTCIceCandidateInit
    id: string
}

type Message =
    | InitNegotiationMessage
    | OfferNegotiationMessage
    | AnswerNegotiationMessage
    | CandidateNegotiationMessage

function parseMessage(string: string): Message | undefined {
    const mess = JSON.parse(string) as any
    if (typeof mess !== 'object' || !mess || typeof mess.type !== 'string') return

    switch (mess.type as Message['type']) {
        case 'init':
            if (!Array.isArray(mess.data)) return
            break
        case 'offer':
        case 'answer': {
            if (typeof mess.data !== 'string' || typeof mess.id !== 'string') return
            break
        }
        case 'candidate': {
            if (typeof mess.data !== 'object' || !mess.data || typeof mess.id !== 'string') return
            break
        }
    }
    return mess
}

function handleMessage(hive: HiveState, data: string): void {
    const msg = parseMessage(data)
    if (!msg) return

    switch (msg.type) {
        case 'init': {
            for (const peer_id of msg.data) {
                /*
                    Duplicated ids will happen if multiple tabs are open
                */
                if (peer_id === hive.id) continue

                const peer = getPeerState(hive.peers, peer_id) || makePeerState(hive, peer_id)

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
            const peer = getPeerState(hive.peers, msg.id) || makePeerState(hive, msg.id)

            void peer.conn.setRemoteDescription({
                type: 'offer',
                sdp: msg.data,
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
                        id: msg.id,
                    })
                })

            break
        }
        case 'answer': {
            const peer = getPeerState(hive.peers, msg.id)
            if (!peer) return

            const prev_remote = peer.conn.remoteDescription

            void peer.conn.setRemoteDescription({
                type: 'answer',
                sdp: msg.data,
            })

            /*
                iOS needs offers and answers from both sides
                https://github.com/webrtc/samples/issues/1123#issuecomment-454325354
            */
            if (platform.is_ios && !prev_remote) {
                hive.onMessage({
                    type: 'init',
                    data: [hive.id],
                    id: msg.id,
                })
            }

            break
        }
        case 'candidate': {
            const peer = getPeerState(hive.peers, msg.id)
            if (!peer) return

            void peer.conn.addIceCandidate(msg.data)

            break
        }
    }
}

interface PostMessage {
    /**
     * Post id.
     */
    id: string
    /**
     * Post author id.
     */
    author: string
    content: string
    /**
     * When the post was created.
     */
    timestamp: number
}

interface PeerMessagePost {
    type: 'post'
    data: PostMessage
}

interface PeerMessageRequestPosts {
    type: 'request_posts' | 'stored_posts'
    data: string[]
}

type PeerMessage = PeerMessagePost | PeerMessageRequestPosts

function makePostMessage(author: string, content: string): PostMessage {
    return {
        id: randomId(),
        author,
        content,
        timestamp: Date.now(),
    }
}

function storePostMessage(msg: PostMessage): void {
    localStorage.setItem('post:' + msg.id, JSON.stringify(msg))
}

function isPostMessage(v: any): v is PostMessage {
    return (
        v &&
        typeof v === 'object' &&
        typeof v.id === 'string' &&
        typeof v.author === 'string' &&
        typeof v.content === 'string' &&
        typeof v.timestamp === 'number'
    )
}

function getAllPostMessages(): PostMessage[] {
    const messages: PostMessage[] = []
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key || !key.startsWith('post:')) continue

        const value = localStorage.getItem(key)
        if (!value) continue

        const message = JSON.parse(value)
        if (!isPostMessage(message)) continue

        messages.push(message)
    }
    return messages
}

function parsePeerMessage(string: string): PeerMessage | undefined {
    const mess = JSON.parse(string) as any
    if (typeof mess !== 'object' || !mess || typeof mess.type !== 'string') return

    switch (mess.type as PeerMessage['type']) {
        case 'post': {
            if (isPostMessage(mess.data)) return mess
            break
        }
        case 'request_posts':
        case 'stored_posts': {
            if (Array.isArray(mess.data)) return mess
            break
        }
    }
    return
}

function peerSendMessage(peer: PeerState, post: PeerMessage): void {
    if (peer.out_channel.readyState !== 'open') return
    const data = JSON.stringify(post)
    peer.out_channel.send(data)
}

function App() {
    const ws = new WebSocket('ws://' + location.hostname + ':8080/rtc')
    void solid.onCleanup(() => ws.close())

    const own_id = localStorage.getItem('id') || randomId()
    localStorage.setItem('id', own_id)

    const init_messages = getAllPostMessages()
    const messages$ = solid.atom(init_messages)
    const peers$ = solid.atom<PeerState[]>([])

    const hive: HiveState = {
        id: own_id,
        peers: [],
        onMessage: message => {
            ws.send(JSON.stringify(message))
        },
        onPeerConnect: peer => {
            solid.mutate(peers$, list => list.push(peer))

            peer.in_channel!.onmessage = (event: MessageEvent<string>) => {
                const msg = parsePeerMessage(event.data)
                if (!msg) return

                switch (msg.type) {
                    case 'post': {
                        const own_messages = messages$()
                        for (const message of own_messages) {
                            if (message.id === msg.data.id) return
                        }
                        own_messages.push(msg.data)
                        messages$.trigger()
                        storePostMessage(msg.data)
                        break
                    }
                    case 'stored_posts': {
                        const stored_ids = new Set(msg.data)
                        const own_messages = messages$()

                        for (const message of own_messages) {
                            if (stored_ids.has(message.id)) {
                                stored_ids.delete(message.id)
                                continue
                            }
                            peerSendMessage(peer, {
                                type: 'post',
                                data: message,
                            })
                        }

                        if (stored_ids.size > 0) {
                            peerSendMessage(peer, {
                                type: 'request_posts',
                                data: Array.from(stored_ids),
                            })
                        }

                        break
                    }
                    case 'request_posts': {
                        const stored_ids = new Set(msg.data)
                        const own_messages = messages$()

                        for (const message of own_messages) {
                            if (!stored_ids.has(message.id)) continue
                            peerSendMessage(peer, {
                                type: 'post',
                                data: message,
                            })
                        }
                    }
                }
            }

            peerSendMessage(peer, {
                type: 'stored_posts',
                data: messages$().map(m => m.id),
            })
        },
        onPeerDisconnect: peer => {
            for (let i = 0; i < hive.peers.length; i++) {
                if (hive.peers[i]!.id === peer.id) {
                    hive.peers.splice(i, 1)
                    break
                }
            }
            solid.mutate(peers$, list => list.splice(list.indexOf(peer), 1))
        },
    }
    // @ts-ignore
    window.hive = hive

    void solid.onCleanup(() => {
        hive.peers.forEach(cleanupPeer)
    })

    ws.addEventListener('open', () => {
        ws.send(own_id)

        ws.onmessage = event => {
            handleMessage(hive, event.data)
        }
    })

    function submitMessage(content: string) {
        const post = makePostMessage(own_id, content)
        for (const peer of hive.peers) {
            peerSendMessage(peer, {
                type: 'post',
                data: post,
            })
        }
        solid.mutate(messages$, list => list.push(post))
        storePostMessage(post)
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
                <h4>Own ID: {own_id}</h4>
            </div>
            <button
                style={`
                    position: absolute;
                    top: 5px;
                    right: 5px;
                `}
                onClick={() => {
                    localStorage.clear()
                    messages$.set([])
                }}
            >
                Clear messages
            </button>
            <form
                onSubmit={e => {
                    e.preventDefault()
                    submitMessage(input.value)
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
                        <solid.For each={messages$()}>
                            {item => (
                                <li
                                    style={`
                                        margin-bottom: 10px;
                                        display: flex;
                                        flex-direction: column;
                                        justify-content: flex-start;
                                        align-items: flex-start;
                                        padding: 5px;
                                        border: 1px solid #ccc;
                                    `}
                                >
                                    <span
                                        style={`
                                            font-size: 0.7em;
                                            color: #888;
                                        `}
                                    >
                                        {item.author} | {formatTimestamp(item.timestamp)}
                                    </span>
                                    {item.content}
                                </li>
                            )}
                        </solid.For>
                    </ul>
                </div>
                <div>
                    <h4>Peers</h4>
                    <ul>
                        <solid.For each={peers$()}>
                            {peer => (
                                <li
                                    style={`
                                        font-size: 0.7em;
                                        color: #888;
                                    `}
                                >
                                    {peer.id}
                                </li>
                            )}
                        </solid.For>
                    </ul>
                </div>
            </div>
        </>
    )
}

export default App
