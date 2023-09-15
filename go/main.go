package main

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// r.Host => localhost:8080
		return true
	},
}

var (
	port     = 8080
	port_srt = ":" + strconv.FormatInt(int64(port), 10)
	host_url = "localhost"
	echo_url = "/echo"
	rtc_url  = "/rtc"
)

func echoConnection(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)

	if err != nil {
		fmt.Println("err", err)
		return
	}

	defer conn.Close()
	defer fmt.Println("Connection with", conn.RemoteAddr().String(), "closed")

	for {
		msgType, msg, err := conn.ReadMessage()
		if err != nil {
			return
		}

		fmt.Printf("%s sent: %s\n", conn.RemoteAddr().String(), string(msg))

		if err = conn.WriteMessage(msgType, msg); err != nil {
			return
		}
	}
}

type RTCDescription struct {
	Type string `json:"type"`
	Sdp  string `json:"sdp"`
}

type RTCIceCandidate struct {
	Candidate     string `json:"candidate"`
	SdpMid        string `json:"sdpMid"`
	SdpMLineIndex int    `json:"sdpMLineIndex"`
}

type Message struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
	Id   string      `json:"id"`
}

type PeerConnection struct {
	Id string
	Ws *websocket.Conn
}

var peerConnections []*PeerConnection

/*
connect all clients to each other
to the same room

room (rtc description) is created by the first client
and then sent to all other clients
*/
func rtcConnection(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println("err", err)
		return
	}

	defer conn.Close()

	/*
		New peer connection!
	*/
	var id string
	{
		t, buf, err := conn.ReadMessage()
		if err != nil {
			fmt.Println("err", err)
			return
		}
		if t != websocket.TextMessage {
			fmt.Println("err", "t != websocket.TextMessage")
			return
		}
		id = string(buf)
	}

	fmt.Println("New peer connection", id)
	fmt.Println("peers length", len(peerConnections)+1)

	peer := &PeerConnection{Id: id, Ws: conn}

	/*
		Send all peers to the new peer
	*/
	{
		ids := make([]string, len(peerConnections))
		for i, p := range peerConnections {
			ids[i] = p.Id
		}
		peer.Ws.WriteJSON(Message{
			Type: "init",
			Data: ids,
		})
	}

	peerConnections = append(peerConnections, peer)
	defer func() {
		peerConnections = filter(peerConnections, peer)
	}()

	/*
	   Send messages between peers
	*/
	for {
		var msg Message
		err := conn.ReadJSON(&msg)
		if err != nil {
			fmt.Println("err", err)
			return
		}

		fmt.Println(msg.Type, "from", id, "to", msg.Id)

		for _, p := range peerConnections {
			if p.Id != msg.Id {
				continue
			}

			p.Ws.WriteJSON(Message{
				Type: msg.Type,
				Data: msg.Data,
				Id:   id,
			})
		}
	}
}

func main() {
	fmt.Println("Server running on", host_url+port_srt)
	fmt.Println("Echo url", host_url+port_srt+echo_url)
	fmt.Println("RTC url", host_url+port_srt+rtc_url)

	http.HandleFunc(echo_url, echoConnection)

	http.HandleFunc(rtc_url, rtcConnection)

	// http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
	// 	http.ServeFile(w, r, "websockets.html")
	// })

	http.ListenAndServe(port_srt, nil)
}

func splice[T comparable](slice []T, i int) []T {
	return append(slice[:i], slice[i+1:]...)
}

func filter[T comparable](slice []T, id T) []T {
	for i, v := range slice {
		if v == id {
			return splice(slice, i)
		}
	}
	return slice
}
