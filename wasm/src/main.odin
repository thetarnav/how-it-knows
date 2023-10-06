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

My_Str :: struct {
	len: int,
	ptr: string,
}


@(export)
call_me :: proc "c" (ctx: ^runtime.Context, input_str: cstring) -> ^My_Str {
	context = ctx^
	context.allocator = global_allocator

	fmt.printf("call_me called:\n\tstr: %s \n\talloc: %v\n", input_str, global_allocator)

	buf, err := alloc_pages(1)
	context.allocator = mem.arena_allocator(&{data = buf})

	str: string = "nice to meet you!"


	my_str := new(My_Str)
	my_str.ptr = str
	my_str.len = len(str)

	str_bytes := mem.byte_slice(&str, size_of(str))

	fmt.printf(
		"my_str:\n\tstr: %s\n\tsize: %d\n\tstr bytes: %v\n",
		str,
		size_of(my_str^),
		str_bytes,
	)


	return my_str
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
