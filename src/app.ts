import * as wasm from '../wasm/js/runtime.js'
import * as message from './message.js'
import * as rtc from './rtc.js'
import * as update from './update.js'

interface RootState {
    count: number
    el: HTMLElement
    counter_el: HTMLElement
}

function makeRoot(): RootState {
    const root_el = document.getElementById('root')!

    const counter_el = document.createElement('div')
    void root_el.appendChild(counter_el)

    const button_el = document.createElement('button')
    void root_el.appendChild(button_el)

    button_el.textContent = 'Increment'

    button_el.addEventListener('click', () => {
        state.count++
        update.scheduleRender(() => renderRoot(state))
    })

    const app = makeApp()
    void root_el.appendChild(app.el)
    // ? should "component" always return an element?

    const state: RootState = {
        count: 0,
        el: root_el,
        counter_el,
    }
    renderRoot(state)

    return state
}

function renderRoot(state: RootState): void {
    state.counter_el.textContent = String(state.count)
}

void makeRoot()

interface App {
    el: HTMLElement
    hive: rtc.HiveState
    peers: rtc.PeerState[]
    peers_el: HTMLElement
    rendered_peers: rtc.PeerState[]
    rendered_peer_els: HTMLElement[]
    posts: wasm.Post[]
    posts_el: HTMLElement
    rendered_posts: wasm.Post[]
    rendered_post_els: HTMLElement[]
}

function makeApp(): App {
    const ws = new WebSocket('ws://' + location.hostname + ':8080/rtc')
    // ? how to do cleanups?

    const own_id = localStorage.getItem('id') || message.randomId()
    // localStorage.setItem('id', own_id)

    const hive: rtc.HiveState = {
        id: own_id,
        peers: [],
        onWsMessage: message => {
            ws.send(JSON.stringify(message))
        },
        onPeerMessage: (peer, data) => {
            const msg = message.parsePeerMessage(data)
            if (!msg) return

            // message.handlePeerMessage(peer, msg, state.posts, posts => {
            //     state.posts = posts
            //     update.scheduleRender(() => renderAppPosts(state))
            //     message.storePostMessages(posts)
            // })
        },
        onPeerConnect: peer => {
            state.peers.push(peer)
            update.scheduleRender(() => renderAppPeers(state))

            /*
                Send all stored posts to the peer at connection start
                this way the peer will know which posts it can request
            */
            // message.peerSendMessage(peer, {
            //     type: 'stored_posts',
            //     data: state.posts.map(m => m.id),
            // })
        },
        onPeerDisconnect: peer => {
            // ? why remove here, but push not here?
            for (let i = 0; i < hive.peers.length; i++) {
                if (hive.peers[i]!.id === peer.id) {
                    hive.peers.splice(i, 1)
                    break
                }
            }

            state.peers.splice(state.peers.indexOf(peer), 1)
            update.scheduleRender(() => renderAppPeers(state))
        },
    }

    ws.addEventListener('open', () => {
        ws.send(own_id)

        ws.onmessage = event => {
            rtc.handleMessage(hive, event.data)
        }
    })

    const el = document.createElement('div')

    const id_el = document.createElement('div')
    void el.appendChild(id_el)
    const id_header = document.createElement('h4')
    void id_el.appendChild(id_header)
    id_header.textContent = 'Your ID: ' + own_id

    const clear_button = document.createElement('button')
    void el.appendChild(clear_button)
    clear_button.textContent = 'Clear'
    clear_button.addEventListener('click', () => {
        localStorage.clear()
        state.posts.length = 0
        update.scheduleRender(() => renderAppPosts(state))
    })

    void el.appendChild(document.createElement('br'))
    void el.appendChild(document.createElement('br'))

    /*
        Form
    */
    const form = document.createElement('form')
    void el.appendChild(form)
    form.addEventListener('submit', e => {
        e.preventDefault()
        const content = input.value.trim()
        input.value = ''

        wasm.storeOwnPost(content)

        // const post = message.makePostMessage(own_id, content)
        // for (const peer of hive.peers) {
        //     message.peerSendMessage(peer, {
        //         type: 'posts',
        //         data: [post],
        //     })
        // }
    })

    wasm.subscribeToPosts(post => {
        void state.posts.push.apply(state.posts, post)
        update.scheduleRender(() => renderAppPosts(state))
    })

    const input = document.createElement('input')
    void form.appendChild(input)

    const col_el = document.createElement('div')
    void el.appendChild(col_el)
    col_el.className = 'grid gap-4 grid-cols-2'

    /*
        Peers
    */
    const peers_el = document.createElement('div')
    void col_el.appendChild(peers_el)

    const peers_header = document.createElement('h4')
    void peers_el.appendChild(peers_header)
    peers_header.textContent = 'Peers'

    const peers_list = document.createElement('ul')
    void peers_el.appendChild(peers_list)

    /*
        Posts
    */
    const posts_el = document.createElement('div')
    void col_el.appendChild(posts_el)

    const posts_header = document.createElement('h4')
    void posts_el.appendChild(posts_header)
    posts_header.textContent = 'Posts'

    const posts_list = document.createElement('ul')
    void posts_el.appendChild(posts_list)

    const state: App = {
        el,
        hive,
        peers: [],
        peers_el: peers_list,
        rendered_peers: [],
        rendered_peer_els: [],
        posts: [],
        posts_el: posts_list,
        rendered_posts: [],
        rendered_post_els: [],
    }

    renderAppPeers(state)
    renderAppPosts(state)

    return state
}

// ? should render be split from update?

function renderAppPeers(state: App): void {
    const {peers, rendered_peers, rendered_peer_els} = state

    for (const peer of peers) {
        if (rendered_peers.includes(peer)) continue

        const peer_el = document.createElement('li')
        peer_el.className =
            'flex flex-col justify-start items-start p-2 mb-4 rounded-md bg-gray-800'
        rendered_peer_els.push(peer_el)
        rendered_peers.push(peer)
        const span = document.createElement('span')
        span.className = 'text-sm text-gray-400'
        span.textContent = peer.id
        void peer_el.appendChild(span)
        void state.peers_el.appendChild(peer_el)
    }

    for (const peer of rendered_peers) {
        if (peers.includes(peer)) continue

        const i = rendered_peers.indexOf(peer)
        rendered_peers.splice(i, 1)
        const peer_el = rendered_peer_els.splice(i, 1)[0]!
        void peer_el.remove()
    }
}

function renderAppPosts(state: App): void {
    const {posts, rendered_posts, rendered_post_els} = state

    for (const post of posts) {
        if (rendered_posts.includes(post)) continue

        const post_el = document.createElement('li')
        post_el.className =
            'flex flex-col justify-start items-start p-2 mb-4 rounded-md bg-gray-800'
        rendered_post_els.push(post_el)
        rendered_posts.push(post)
        const span = document.createElement('span')
        span.className = 'text-sm text-gray-400'
        span.textContent = String(post.timestamp)
        void post_el.appendChild(span)
        const p = document.createElement('p')
        p.className = 'text-sm text-gray-400'
        p.textContent = post.content
        void post_el.appendChild(p)
        void state.posts_el.appendChild(post_el)
    }

    for (const post of rendered_posts) {
        if (posts.includes(post)) continue

        const i = rendered_posts.indexOf(post)
        rendered_posts.splice(i, 1)
        const post_el = rendered_post_els.splice(i, 1)[0]!
        void post_el.remove()
    }
}

export function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp)
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
}
