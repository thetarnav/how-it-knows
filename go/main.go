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

var rtc_connections []*websocket.Conn
var rtc_description *RTCDescription
var rtc_pending bool

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

	if rtc_pending {
		fmt.Println("Add conn", conn)
		rtc_connections = append(rtc_connections, conn)
		return
	}

	if rtc_description != nil {
		fmt.Println("Send desc", rtc_description)
		conn.WriteJSON(rtc_description)
		conn.Close()
		return
	}

	fmt.Println("Set pending")

	rtc_pending = true
	rtc_description = &RTCDescription{}

	defer func() {
		rtc_pending = false
		rtc_description = nil
		rtc_connections = nil
	}()

	err = conn.ReadJSON(rtc_description)
	if err != nil {
		fmt.Println("err", err)
		return
	}

	fmt.Println("RTC description", rtc_description)

	for _, c := range rtc_connections {
		c.WriteJSON(rtc_description)
		c.Close()
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
