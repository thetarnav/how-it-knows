function App() {
    const ws = new WebSocket('ws://' + location.hostname + ':8080/rtc')
    void solid.onCleanup(() => ws.close())

    const own_id = localStorage.getItem('id') || randomId()
    localStorage.setItem('id', own_id)

    const init_messages = getAllPostMessages()
    const posts$ = solid.atom(init_messages)
    const peers$ = solid.atom<PeerState[]>([])

    function updatePosts(posts: PostMessage[]): void {
        posts$.set(posts)
        storePostMessages(posts)
    }

    const hive: HiveState = {
        id: own_id,
        peers: [],
        onWsMessage: message => {
            ws.send(JSON.stringify(message))
        },
        onPeerMessage: (peer, data) => {
            const msg = parsePeerMessage(data)
            if (!msg) return

            handlePeerMessage(peer, msg, posts$(), updatePosts)
        },
        onPeerConnect: peer => {
            solid.mutate(peers$, list => list.push(peer))

            /*
                Send all stored posts to the peer at connection start
                this way the peer will know which posts it can request
            */
            peerSendMessage(peer, {
                type: 'stored_posts',
                data: posts$().map(m => m.id),
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
                type: 'posts',
                data: [post],
            })
        }
        solid.mutate(posts$, list => list.push(post))
        storePostMessage(post)
    }

    let input!: HTMLInputElement
    return (
        <>
            <div>
                <h4>Own ID: {own_id}</h4>
            </div>
            <button
                onClick={() => {
                    localStorage.clear()
                    posts$.set([])
                }}
            >
                Clear messages
            </button>
            <br />
            <br />
            <form
                onSubmit={e => {
                    e.preventDefault()
                    submitMessage(input.value)
                    input.value = ''
                }}
            >
                <input ref={input} />
            </form>
            <div class="grid gap-4 grid-cols-2">
                <div>
                    <h4>Messages</h4>
                    <ul>
                        <solid.For each={posts$()}>
                            {item => (
                                <li class="flex flex-col justify-start items-start p-2 mb-4 rounded-md bg-gray-800">
                                    <span class="text-sm text-gray-400">
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
                            {peer => <li class="text-sm text-gray-400">{peer.id}</li>}
                        </solid.For>
                    </ul>
                </div>
            </div>
        </>
    )
}

export default App
