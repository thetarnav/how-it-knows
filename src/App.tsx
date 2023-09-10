import * as solid from 'solid-js'
import './App.css'
import { atom } from './atom'

//   const local_connection = new RTCPeerConnection()

//   const channel = local_connection.createDataChannel("sendChannel")

//   function handleEvent(event: Event) {
//     console.log({ event })
//   }

//   channel.onopen = handleEvent
//   channel.onclose = handleEvent

//   const remote_connection = new RTCPeerConnection()
//   remote_connection.ondatachannel = event => {
//     console.log("data channel", { event })
//   }

//   function handleError(reason: unknown) {
//     console.log({ reason })
//   }

//   local_connection.onicecandidate = e =>
//     !e.candidate || remote_connection.addIceCandidate(e.candidate).catch(handleError)

//   remote_connection.onicecandidate = e =>
//     !e.candidate || local_connection.addIceCandidate(e.candidate).catch(handleError)

//   local_connection
//     .createOffer()
//     .then(offer => local_connection.setLocalDescription(offer))
//     .then(
//       () =>
//         local_connection.localDescription &&
//         remote_connection.setRemoteDescription(local_connection.localDescription)
//     )
//     .then(() => remote_connection.createAnswer())
//     .then(answer => remote_connection.setLocalDescription(answer))
//     .then(
//       () =>
//         remote_connection.localDescription &&
//         local_connection.setRemoteDescription(remote_connection.localDescription)
//     )
//     .catch(handleError)

function App() {
    const ws = new WebSocket('ws://localhost:8080/echo')
    const rtc_conn = new RTCPeerConnection()

    const ws_state$ = atom<'connecting' | 'open' | 'closed'>('connecting')

    ws.onopen = () => {
        ws.send('hello')
    }

    ws.onmessage = event => {
        console.log({ event })
    }

    ws.onerror = event => {
        console.log({ event })
    }

    ws.onclose = event => {
        console.log({ event })
        ws_state$.set('closed')
    }

    const peer_type$ = atom<'a' | 'b'>()

    solid.createEffect(() => {
        const type = peer_type$()
        if (!type) return

        if (type === 'a') {
            const connection = new RTCPeerConnection()

            const channel = connection.createDataChannel('send_channel')

            function handleEvent(event: Event) {
                console.log({ event })
            }

            function handleError(reason: unknown) {
                console.log({ reason })
            }

            channel.onopen = handleEvent
            channel.onclose = handleEvent

            connection.onicecandidate = e => {
                !e.candidate || connection.addIceCandidate(e.candidate).catch(handleError)
                console.log({ e })
            }

            solid.onCleanup(() => {
                connection.close()
            })
        } else if (type === 'b') {
            const connection = new RTCPeerConnection()

            connection.ondatachannel = event => {
                console.log('data channel', { event })
            }

            function handleError(reason: unknown) {
                console.log({ reason })
            }

            connection.onicecandidate = e => {
                !e.candidate || connection.addIceCandidate(e.candidate).catch(handleError)
                console.log({ e })
            }

            connection
                .createOffer()
                .then(offer => connection.setLocalDescription(offer))
                .then(
                    () =>
                        connection.localDescription &&
                        connection.setRemoteDescription(connection.localDescription),
                )
                .then(() => connection.createAnswer())
                .catch(handleError)

            solid.onCleanup(() => {
                connection.close()
            })
        }
    })

    return (
        <>
            <div>{ws_state$()}</div>
            <button
                onClick={() => peer_type$.set('a')}
                style={{
                    background: peer_type$() === 'a' ? 'red' : '',
                }}
            >
                A
            </button>
            <button
                onClick={() => peer_type$.set('b')}
                style={{
                    background: peer_type$() === 'b' ? 'red' : '',
                }}
            >
                B
            </button>
        </>
    )
}

export default App
