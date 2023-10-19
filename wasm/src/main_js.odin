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
