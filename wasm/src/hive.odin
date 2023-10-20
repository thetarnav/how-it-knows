package hive

import "./serialize"
import "core:fmt"
import "core:intrinsics"
import "core:mem"
import "core:slice"
import "core:strings"
import "core:time"

Post :: struct {
	timestamp: i64,
	content:   string,
}

serialize_post :: proc(s: ^serialize.Serializer, post: ^Post) {
	serialize.serialize_number(s, &post.timestamp)
	serialize.serialize_string(s, &post.content)
}

timestamp_now :: proc() -> i64 {
	return time.now()._nsec / 1e6
}

Callback :: proc()

callbacks_buf: [1024]Callback
callbacks_offset: int

subscribe :: proc(callback: Callback) -> (err: mem.Allocator_Error) {
	if callbacks_offset == len(callbacks_buf) {
		return mem.Allocator_Error.Out_Of_Memory
	}

	callbacks_buf[callbacks_offset] = callback
	callbacks_offset += 1

	return
}

unsubscribe :: proc(callback: Callback) -> (ok: bool) {
	idx := slice.linear_search(callbacks_buf[:callbacks_offset], callback) or_return

	callbacks_offset -= 1
	callbacks_buf[idx] = callbacks_buf[callbacks_offset]

	return true
}

publish :: proc() {
	for callback in callbacks_buf[:callbacks_offset] {
		callback()
	}
}

@(export)
store_own_post :: proc(content_length: uint) {
	context.allocator = mem.arena_allocator(&{data = temp_buf})

	buf: [1024]byte
	len := load_last_string(buf[:])
	content := string(buf[:len])

	post := Post {
		content   = content,
		timestamp = timestamp_now(),
	}

	s: serialize.Serializer
	serialize.serializer_init_writer(&s)

	serialize_post(&s, &post)

	ls_set_bytes("HEY", s.data[:])

	publish()
}

read_post :: proc() {
	buf: [1024]byte
	len := ls_get_bytes("HEY", buf[:])

	s: serialize.Serializer
	serialize.serializer_init_reader(&s, buf[:len])

	post: Post

	serialize_post(&s, &post)

	fmt.println(post.content, post.timestamp)
}
