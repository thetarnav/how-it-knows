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
