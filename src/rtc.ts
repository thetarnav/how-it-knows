import {platform} from './lib.ts'

export function getMeteredIceServers(): RTCIceServer[] {
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

export interface HiveState {
    id: string
    peers: PeerState[]
    onWsMessage: (message: Message) => void
    onPeerMessage: (peer: PeerState, message: string) => void
    onPeerConnect: (peer: PeerState) => void
    onPeerDisconnect: (peer: PeerState) => void
}

export interface PeerState {
    id: string
    conn: RTCPeerConnection
    state: 'connecting' | 'connected' | 'disconnected'
    in_channel: RTCDataChannel | null
    out_channel: RTCDataChannel
    interval: number
}

/*
    Error messages on mobile
*/
if (matchMedia('(hover: none)').matches) {
    onerror = (_, source, lineno, colno, error) =>
        alert(
            `Error: ${
                error && error.message
            }\nSource: ${source}\nLine: ${lineno}\nColumn: ${colno}`,
        )
}

export function makePeerState(hive: HiveState, id: string): PeerState {
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

        hive.onWsMessage({
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

        peer.in_channel.addEventListener('message', event => {
            if (peer.state === 'connecting') {
                peer.state = 'connected'
                hive.onPeerConnect(peer)
            }

            hive.onPeerMessage(peer, event.data)
        })

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
        handlePeerChannelOpen(peer)
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
            handlePeerChannelOpen(peer)
        }, 500) as any
    }

    return peer
}

export function cleanupPeer(peer: PeerState): void {
    peer.state = 'disconnected'
    peer.conn.close()
    peer.in_channel?.close()
    peer.in_channel = null
    peer.out_channel.close()
    clearInterval(peer.interval)
    peer.interval = 0
}

export function handlePeerChannelOpen(peer: PeerState): void {
    if (peer.state !== 'connecting') return

    if (peer.out_channel.readyState === 'open') {
        /*
            Ready message is only for notifying that the data channel is open
        */
        peer.out_channel.send('"READY"')
    }

    if (peer.in_channel && peer.in_channel.readyState === 'open') {
        clearInterval(peer.interval)
        peer.interval = 0
    }
}

export function handlePeerChannelClose(hive: HiveState, peer: PeerState): void {
    // TODO only call callback if peer was connected
    if (peer.state === 'disconnected') return
    cleanupPeer(peer)
    hive.onPeerDisconnect(peer)
}

export function getPeerState(conns: readonly PeerState[], id: string): PeerState | undefined {
    for (const conn of conns) {
        if (conn.id === id) return conn
    }
}

export interface BaseMessage {
    type: string
    data: unknown
    id?: string
}

/**
 * Initiate a peer connection.
 * This will create an offer and send it to the server.
 */
export interface InitNegotiationMessage extends BaseMessage {
    type: 'init'
    data: string[] // ids of peers to connect to
}

/**
 * You got an offer from a peer.
 * Set the remote description, create an answer, and send it back to the peer.
 */
export interface OfferNegotiationMessage extends BaseMessage {
    type: 'offer'
    data: string
    id: string
}

/**
 * You got an offer answer from a peer.
 * Set the remote description.
 */
export interface AnswerNegotiationMessage extends BaseMessage {
    type: 'answer'
    data: string
    id: string
}

/**
 * You got an ice candidate from a peer.
 * Add the ice candidate.
 */
export interface CandidateNegotiationMessage extends BaseMessage {
    type: 'candidate'
    data: RTCIceCandidateInit
    id: string
}

type Message =
    | InitNegotiationMessage
    | OfferNegotiationMessage
    | AnswerNegotiationMessage
    | CandidateNegotiationMessage

export function parseMessage(string: string): Message | undefined {
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

export function handleMessage(hive: HiveState, data: string): void {
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

                        hive.onWsMessage({
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

                    hive.onWsMessage({
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
                hive.onWsMessage({
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
