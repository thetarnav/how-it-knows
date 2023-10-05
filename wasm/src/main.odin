//+build js
package hive

import "core:fmt"
import "core:mem"
import "core:runtime"
import wasm "vendor:wasm/js"


global_allocator := wasm.page_allocator()

main :: proc() {
	context.allocator = global_allocator

	fmt.printf("Hello, world!\n\tptr_size: %d \n\talloc: %v\n", size_of(rawptr), global_allocator)


	// fmt.println("main alocated", alloc_ptr, err, buf)
}

Post :: struct {
	id:      int,
	title:   string,
	content: string,
}

@(export)
call_me :: proc "c" (ctx: ^runtime.Context, input_str: cstring) -> (msg: cstring) {
	context = ctx^
	context.allocator = global_allocator

	fmt.printf("call_me called:\n\tstr: %s \n\talloc: %v\n", input_str, global_allocator)

	return "nice to meet you"
}

@(export)
allocate_slice :: proc "c" (ctx: ^runtime.Context, len: int) -> (ptr: rawptr) {
	context = ctx^

	fmt.println(`allocate_slice called:`, len)

	alloc_ptr, err := mem.alloc(len, allocator = global_allocator)
	buf := ([^]u8)(alloc_ptr)[:len] // mem.byte_slice

	if err != nil {
		fmt.println("allocate_slice failed")
	} else {
		fmt.println("alocated", alloc_ptr)

		// for i in 0 ..< len {
		// 	buf[i] = byte(i)
		// }
	}

	arena := mem.Arena {
		data = buf,
	}
	arena_allocator := mem.arena_allocator(&arena)

	context.allocator = arena_allocator


	return alloc_ptr
}
