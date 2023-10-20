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

ptr_move :: proc(ptr: rawptr, offset: uint) -> rawptr {
	return rawptr((uintptr(ptr) + uintptr(offset)))
}

timestamp_now :: proc() -> i64 {
	return time.now()._nsec / 1e6
}

@(export)
store_own_post :: proc(content_length: uint) {

	context.allocator = mem.arena_allocator(&{data = temp_buf})

	fmt.println(context.temp_allocator)

	buf: [1024]byte

	timestamp := timestamp_now()


	// mem.copy(&buf, &timestamp, 8)

	len := load_last_string(buf[:])
	content := string(buf[:len])

	fmt.println(content, timestamp)

	// post := Post {
	// 	content   = content,
	// 	timestamp = timestamp,
	// }

	s: serialize.Serializer
	serialize.serializer_init_writer(&s)

	serialize.serialize_string(&s, &content)
	serialize.serialize_number(&s, &timestamp)

	ls_set_bytes("HEY", s.data[:])

	read_buf: [1024]byte

	read_len := ls_get_bytes("HEY", read_buf[:])

	read_buf_slice := read_buf[:read_len]

	s_read: serialize.Serializer
	serialize.serializer_init_reader(&s_read, read_buf[:])

	content_read: string
	timestamp_read: i64

	serialize.serialize_string(&s_read, &content_read)
	serialize.serialize_number(&s_read, &timestamp_read)

	fmt.println(content_read, timestamp_read)
}
