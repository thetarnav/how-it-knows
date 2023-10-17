//+build js
package wasm

import "../hive"
import "core:fmt"
import "core:intrinsics"
import "core:mem"
import "core:runtime"
import "core:strings"

foreign import "env"
foreign import "local_storage"

@(default_calling_convention = "contextless")
foreign env {
	pass_string :: proc(buf: []byte) -> uint ---
}

@(default_calling_convention = "contextless")
foreign local_storage {
	ls_get :: proc(key: string, value: []byte) -> uint ---
	ls_set :: proc(key: string, value: string) ---
	ls_remove :: proc(key: string) ---
	ls_clear :: proc() ---
}

global_allocator := page_allocator()
temp_buf: []byte

main :: proc() {
	context.allocator = global_allocator

	_temp_buf, err := alloc_pages(1)
	temp_buf = _temp_buf
}

@(export)
store_own_post :: proc(content_length: uint) {
	fmt.printf("store_own_post: %d\n", content_length)

	// context.allocator = mem.arena_allocator(&{data = temp_buf})

	fmt.println(context.temp_allocator)

	buf := [1024]byte{}
	len := pass_string(buf[:])
	content := string(buf[:len])

	hive.store_own_post(content)
}
