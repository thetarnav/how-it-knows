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

func rtcConnection(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)

	if err != nil {
		fmt.Println("err", err)
		return
	}

	if rtc_description != nil {
		conn.WriteJSON(rtc_description)
		conn.Close()
	} else {
		rtc_connections = append(rtc_connections, conn)

	}

	defer conn.Close()
	defer fmt.Println("Connection with", conn.RemoteAddr().String(), "closed")

	for {
		msg_type, msg, err := conn.ReadMessage()
		if err != nil {
			return
		}

		fmt.Printf("%s sent: %s\n", conn.RemoteAddr().String(), string(msg))

		if err = conn.WriteMessage(msg_type, msg); err != nil {
			return
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
