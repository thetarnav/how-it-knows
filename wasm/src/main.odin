//+build js
package hive

import "core:fmt"
import "core:intrinsics"
import "core:mem"
import "core:runtime"
import "core:strings"

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


PAGE_SIZE :: 64 * 1024
page_alloc :: proc(page_count: int) -> (data: []byte, err: mem.Allocator_Error) {
	prev_page_count := intrinsics.wasm_memory_grow(0, uintptr(page_count))
	if prev_page_count < 0 {
		return nil, .Out_Of_Memory
	}

	ptr := ([^]u8)(uintptr(prev_page_count) * PAGE_SIZE)
	return ptr[:page_count * PAGE_SIZE], nil
}

page_allocator :: proc() -> mem.Allocator {
	procedure :: proc(
		allocator_data: rawptr,
		mode: mem.Allocator_Mode,
		size, alignment: int,
		old_memory: rawptr,
		old_size: int,
		location := #caller_location,
	) -> (
		[]byte,
		mem.Allocator_Error,
	) {
		switch mode {
		case .Alloc, .Alloc_Non_Zeroed:
			assert(size % PAGE_SIZE == 0)
			return page_alloc(size / PAGE_SIZE)
		case .Resize, .Free, .Free_All, .Query_Info:
			return nil, .Mode_Not_Implemented
		case .Query_Features:
			set := (^mem.Allocator_Mode_Set)(old_memory)
			if set != nil {
				set^ = {.Alloc, .Query_Features}
			}
		}

		return nil, nil
	}

	return {procedure = procedure, data = nil}
}


global_allocator := page_allocator()

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
	length := pages * PAGE_SIZE
	return mem.alloc_bytes(length, allocator = allocator, loc = loc)
}

@(export)
allocate_slice :: proc "c" (ctx: ^runtime.Context, len: int) {
	context = ctx^

	fmt.println(`allocate_slice called:`, len)

	buf, err := alloc_pages(len / PAGE_SIZE)
	context.allocator = mem.arena_allocator(&{data = buf})

	if err != nil {
		fmt.println("allocate_slice failed")
	}


	return
}
