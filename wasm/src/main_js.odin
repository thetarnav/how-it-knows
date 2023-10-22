//+build js
package hive

import "core:fmt"
import "core:intrinsics"
import "core:mem"
import "core:runtime"
import "core:strings"

foreign import "env"

@(default_calling_convention = "contextless")
foreign env {
	load_last_string :: proc(buf: []byte) -> uint ---
	notify_post_subscribers :: proc(post: ^Post) ---
}

foreign import "odin_env"

@(default_calling_convention = "contextless")
foreign odin_env {
	trap :: proc() -> ! ---
	abort :: proc() -> ! ---
	alert :: proc(msg: string) ---
	evaluate :: proc(str: string) ---
}

foreign import "local_storage"

@(default_calling_convention = "contextless")
foreign local_storage {
    // odinfmt: disable
	ls_key        :: proc(index: uint, key: []byte) -> uint ---
	ls_get_bytes  :: proc(key: string, value: []byte) -> uint ---
	ls_set_bytes  :: proc(key: string, value: []byte) ---
	ls_get_string :: proc(key: string, value: []byte) -> uint ---
	ls_set_string :: proc(key: string, value: []byte) ---
	ls_remove     :: proc(key: string) ---
	ls_length     :: proc() -> uint ---
	ls_clear      :: proc() ---
    // odinfmt: enable
}

global_allocator := page_allocator()
temp_buf: []byte

main :: proc() {
	_temp_buf, err := alloc_pages(1)
	temp_buf = _temp_buf

	test_buf, err_2 := alloc_pages(1)

	context.allocator = mem.arena_allocator(&{data = test_buf})

	my_int := new(int)
	my_int^ = 5

	cb :: proc(my_int: ^int) {
		fmt.printf("heyyyyy!!! %d\n", my_int^)

		unsubscribe(cb)
	}

	subscribe(my_int, cb)
}
