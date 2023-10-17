import {set} from './lib'
import * as rtc from './rtc'

export interface PostMessage {
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

export interface PeerMessagePosts {
    type: 'posts'
    data: PostMessage[]
}

export interface PeerMessageRequestPosts {
    type: 'request_posts' | 'stored_posts'
    data: string[]
}

type PeerMessage = PeerMessagePosts | PeerMessageRequestPosts

export function randomId(): string {
    const time = new Date().getTime().toString(36).padStart(8, '0').substring(0, 8)
    const rand = Math.random().toString(36).slice(2).padStart(8, '0').substring(0, 8)
    let id = ''
    for (let i = 0; i < 16; i++) {
        id += i % 2 === 0 ? time[7 - i / 2] : rand[(i - 1) / 2]
    }
    return id
}

export function makePostMessage(author: string, content: string): PostMessage {
    return {
        id: randomId(),
        author,
        content,
        timestamp: Date.now(),
    }
}

export function storePostMessage(msg: PostMessage): void {
    localStorage.setItem('post:' + msg.id, JSON.stringify(msg))
}
export function storePostMessages(msgs: PostMessage[]): void {
    for (const msg of msgs) {
        storePostMessage(msg)
    }
}

export function isPostMessage(v: any): v is PostMessage {
    return (
        v &&
        typeof v === 'object' &&
        typeof v.id === 'string' &&
        typeof v.author === 'string' &&
        typeof v.content === 'string' &&
        typeof v.timestamp === 'number'
    )
}

export function getAllPostMessages(): PostMessage[] {
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

export function parsePeerMessage(string: string): PeerMessage | undefined {
    const mess = JSON.parse(string) as any
    if (typeof mess !== 'object' || !mess || typeof mess.type !== 'string') return

    switch (mess.type as PeerMessage['type']) {
        case 'posts': {
            if (!Array.isArray(mess.data)) return
            mess.data = mess.data.filter(isPostMessage)
            return mess
        }
        case 'request_posts':
        case 'stored_posts': {
            if (Array.isArray(mess.data)) return mess
            break
        }
    }
    return
}

export function peerSendMessage(peer: rtc.PeerState, post: PeerMessage): void {
    if (peer.out_channel.readyState !== 'open') return
    const data = JSON.stringify(post)
    peer.out_channel.send(data)
}

export function handlePeerMessage(
    peer: rtc.PeerState,
    msg: PeerMessage,
    own_posts: PostMessage[],
    updatePosts: (posts: PostMessage[]) => void,
): void {
    switch (msg.type) {
        case 'posts': {
            const own_post_ids = new Set(own_posts.map(m => m.id))
            const new_posts = msg.data.filter(m => !own_post_ids.has(m.id))
            updatePosts(own_posts.concat(new_posts))
            break
        }
        case 'stored_posts': {
            const peer_post_ids = new Set(msg.data)
            const own_post_ids = new Set(own_posts.map(m => m.id))

            const missing_post_ids = set.difference(peer_post_ids, own_post_ids)
            if (missing_post_ids.size === 0) break

            peerSendMessage(peer, {
                type: 'request_posts',
                data: Array.from(missing_post_ids),
            })

            break
        }
        case 'request_posts': {
            const ids = new Set(msg.data)

            peerSendMessage(peer, {
                type: 'posts',
                data: own_posts.filter(post => ids.has(post.id)),
            })
        }
    }
}
