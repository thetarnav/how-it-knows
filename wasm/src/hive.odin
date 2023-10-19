package hive

import "core:fmt"
import "core:time"

Post :: struct {
	content:   string,
	timestamp: time.Time,
}

@(export)
store_own_post :: proc(content_length: uint) {
	fmt.printf("store_own_post: %d\n", content_length)

	// context.allocator = mem.arena_allocator(&{data = temp_buf})

	fmt.println(context.temp_allocator)

	buf := [1024]byte{}
	len := load_last_string(buf[:])
	content := string(buf[:len])

	timestamp := time.now()

	post := Post {
		content   = content,
		timestamp = timestamp,
	}

	fmt.println("HIVE store_own_post", post)
}
