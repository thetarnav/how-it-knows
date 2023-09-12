const a_conn = new RTCPeerConnection()

const channel = a_conn.createDataChannel('cool_channel')

function handleEvent(event: Event) {}

channel.onopen = handleEvent
channel.onclose = handleEvent

const b_conn = new RTCPeerConnection()

function handleError(reason: unknown) {}

a_conn
    .createOffer()
    .then(offer => a_conn.setLocalDescription(offer))
    .then(() => a_conn.localDescription && b_conn.setRemoteDescription(a_conn.localDescription))
    .then(() => b_conn.createAnswer())
    .then(answer => b_conn.setLocalDescription(answer))
    .then(() => b_conn.localDescription && a_conn.setRemoteDescription(b_conn.localDescription))
    .catch(handleError)

a_conn.onicecandidate = e => {
    if (!e.candidate) return
    b_conn.addIceCandidate(e.candidate).catch(handleError)
}

b_conn.onicecandidate = e => {
    if (!e.candidate) return
    a_conn.addIceCandidate(e.candidate).catch(handleError)
}

b_conn.ondatachannel = event => {}
