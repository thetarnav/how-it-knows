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
	Id   int64       `json:"id"`
}

type PeerConnection struct {
	Id int64
	Ws *websocket.Conn
}

var lastId int64 = 0

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
	fmt.Println("New peer connection", len(peerConnections)+1)

	id := lastId + 1
	lastId = id

	peer := &PeerConnection{Id: id, Ws: conn}

	/*
		Send all peers to the new peer
	*/

	for _, p := range peerConnections {
		peer.Ws.WriteJSON(Message{
			Type: "init",
			Id:   p.Id,
		})
	}

	peerConnections = append(peerConnections, peer)
	defer func() {
		for i, p := range peerConnections {
			if p.Id == id {
				peerConnections = append(peerConnections[:i], peerConnections[i+1:]...)
				break
			}
		}
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

		fmt.Println("msg from", id, "to", msg.Id, "type", msg.Type)

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
