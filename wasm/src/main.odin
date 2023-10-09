//+build js
package hive

import "core:fmt"
import "core:mem"
import "core:runtime"
import "core:strings"
import wasm "vendor:wasm/js"

foreign import "env"
foreign import "local_storage"

@(default_calling_convention = "contextless")
foreign env {
	pass_my_string :: proc(str: string) ---
	pass_my_post :: proc(post: ^Post) ---
}

@(default_calling_convention = "contextless")
foreign local_storage {
	ls_get :: proc(key: string, value: []byte) -> int ---
	ls_set :: proc(key: string, value: string) ---
	ls_remove :: proc(key: string) ---
	ls_clear :: proc() ---
}


global_allocator := wasm.page_allocator()

main :: proc() {
	context.allocator = global_allocator

	fmt.printf("Hello, world!\n\tptr_size: %d \n\talloc: %v\n", size_of(rawptr), global_allocator)

	ls_set("test", "test_value")

	// fmt.println("main alocated", alloc_ptr, err, buf)
}

Post :: struct {
	id:      int,
	title:   string,
	content: string,
}


@(export)
call_me :: proc "c" (ctx: ^runtime.Context) {
	context = ctx^
	context.allocator = global_allocator


	fmt.println("call_me called")

	buf, err := alloc_pages(1)
	context.allocator = mem.arena_allocator(&{data = buf})


	pass_my_string("nice to meet you!")

	post := Post {
		id      = 1,
		title   = "Hello, world!",
		content = "This is my first post!",
	}
	pass_my_post(&post)


	ls_buf := make([]byte, 100)
	len := ls_get("test", ls_buf)
	sb := strings.builder_make()
	strings.write_bytes(&sb, ls_buf[:len])
	from_storage := strings.to_string(sb)

	fmt.println("from_storage", from_storage)
}

@(require_results)
alloc_pages :: proc(
	pages := 1,
	allocator := global_allocator,
	loc := #caller_location,
) -> (
	buffer: []byte,
	err: mem.Allocator_Error,
) {
	length := pages * wasm.PAGE_SIZE
	return mem.alloc_bytes(length, allocator = allocator, loc = loc)
}

@(export)
allocate_slice :: proc "c" (ctx: ^runtime.Context, len: int) {
	context = ctx^

	fmt.println(`allocate_slice called:`, len)

	buf, err := alloc_pages(len / wasm.PAGE_SIZE)
	context.allocator = mem.arena_allocator(&{data = buf})

	if err != nil {
		fmt.println("allocate_slice failed")
	}


	return
}
