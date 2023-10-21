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

/*
ls key name
post_<timestamp>
*/

LS_KEY_PREFIX :: "post_"
LS_KEY_PREFIX_LEN :: len(LS_KEY_PREFIX)

make_ls_key :: proc(timestamp: i64) -> string {
	buf: [LS_KEY_PREFIX_LEN + 8]byte = {}
	copy(buf[:], LS_KEY_PREFIX)
	timestamp_bytes := transmute([8]byte)(i64le(timestamp))
	copy(buf[LS_KEY_PREFIX_LEN:], timestamp_bytes[:])
	return string(buf[:])
}

get_timestamp_from_ls_key :: proc(key: string) -> (timestamp: i64) {
	assert(len(key) == LS_KEY_PREFIX_LEN + 8)

	timestamp_bytes: [8]byte
	copy(timestamp_bytes[:], key[LS_KEY_PREFIX_LEN:])
	return i64(transmute(i64le)(timestamp_bytes))
}

@(export)
store_own_post :: proc(_content_length: uint) {
	context.allocator = mem.arena_allocator(&{data = temp_buf})

	buf: [1024]byte
	content_length := load_last_string(buf[:])
	content := string(buf[:content_length])

	post := Post {
		content   = content,
		timestamp = timestamp_now(),
	}

	s: serialize.Serializer
	serialize.serializer_init_writer(&s)

	serialize_post(&s, &post)

	ls_key := make_ls_key(post.timestamp)

	ls_set_bytes(ls_key, s.data[:])

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
