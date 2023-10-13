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
	pass_types :: proc(types: ^Types) ---
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


Types :: struct {
	int:     int, //        register size
	i8:      i8, //         1
	i16:     i16, //        2
	i32:     i32, //        4
	i64:     i64, //        8
	i128:    i128, //       16
	uint:    uint, //       register size
	u8:      u8, //         1
	u16:     u16, //        2
	u32:     u32, //        4
	u64:     u64, //        8
	u128:    u128, //       16
	uintptr: uintptr, //    4
	i16le:   i16le, //      2
	i32le:   i32le, //      4
	i64le:   i64le, //      8
	i128le:  i128le, //     16
	u16le:   u16le, //      2
	u32le:   u32le, //      4
	u64le:   u64le, //      8
	u128le:  u128le, //     16
	i16be:   i16be, //      2
	i32be:   i32be, //      4
	i64be:   i64be, //      8
	i128be:  i128be, //     16
	u16be:   u16be, //      2
	u32be:   u32be, //      4
	u64be:   u64be, //      8
	u128be:  u128be, //     16
	f16:     f16, //        2
	f32:     f32, //        4
	f64:     f64, //        8
	f16le:   f16le, //      2
	f32le:   f32le, //      4
	f64le:   f64le, //      8
	f16be:   f16be, //      2
	f32be:   f32be, //      4
	f64be:   f64be, //      8
	bool:    bool, //       register size
	b8:      b8, //         1
	b16:     b16, //        2
	b32:     b32, //        4
	b64:     b64, //        8
	string:  string, // 	8
	cstring: cstring, //    4
	rune:    rune, // 	    4
	rawptr:  rawptr, // 	register size
	byte:    byte, // 	    1
}

main :: proc() {
	context.allocator = global_allocator

	fmt.printf("Hello, world!\n\tptr_size: %d \n\talloc: %v\n", size_of(rawptr), global_allocator)

	ls_set("test", "test_value")


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

	types := Types {
		int     = max(int) / 2 + 2,
		i8      = max(i8) / 2 + 2,
		i16     = max(i16) / 2 + 2,
		i32     = max(i32) / 2 + 2,
		i64     = max(i64) / 2 + 2,
		i128    = max(i128) / 2 + 2,
		uint    = max(uint) / 2 + 2,
		u8      = 188,
		u16     = max(u16) / 2 + 2,
		u32     = max(u32) / 2 + 2,
		u64     = max(u64) / 2 + 2,
		u128    = max(u128) / 2 + 2,
		uintptr = max(uintptr) / 2 + 2,
		i16le   = max(i16le) / 2 + 2,
		i32le   = max(i32le) / 2 + 2,
		i64le   = max(i64le) / 2 + 2,
		i128le  = max(i128le) / 2 + 2,
		u16le   = max(u16le) / 2 + 2,
		u32le   = max(u32le) / 2 + 2,
		u64le   = max(u64le) / 2 + 2,
		u128le  = max(u128le) / 2 + 2,
		i16be   = max(i16be) / 2 + 2,
		i32be   = max(i32be) / 2 + 2,
		i64be   = max(i64be) / 2 + 2,
		i128be  = max(i128be) / 2 + 2,
		u16be   = max(u16be) / 2 + 2,
		u32be   = max(u32be) / 2 + 2,
		u64be   = max(u64be) / 2 + 2,
		u128be  = max(u128be) / 2 + 2,
		f16     = 75.69,
		f32     = 75.69,
		f64     = 75.69,
		f16le   = 75.69,
		f32le   = 75.69,
		f64le   = 75.69,
		f16be   = 75.69,
		f32be   = 75.69,
		f64be   = 75.69,
		bool    = true,
		b8      = false,
		b16     = true,
		b32     = false,
		b64     = true,
		string  = "nice",
		cstring = "nice",
		rune    = 'a',
		rawptr  = &global_allocator,
		byte    = 69,
	}

	fmt.printf("types: %v\n", types)

	fmt.printf(
		"types:\n\tint: %v\n\ti8: %v\n\ti16: %v\n\ti32: %v\n\ti64: %v\n\ti128: %v\n\tuint: %v\n\tu8: %v\n\tu16: %v\n\tu32: %v\n\tu64: %v\n\tu128: %v\n\tuintptr: %v\n\ti16le: %v\n\ti32le: %v\n\ti64le: %v\n\ti128le: %v\n\tu16le: %v\n\tu32le: %v\n\tu64le: %v\n\tu128le: %v\n\ti16be: %v\n\ti32be: %v\n\ti64be: %v\n\ti128be: %v\n\tu16be: %v\n\tu32be: %v\n\tu64be: %v\n\tu128be: %v\n\tf16: %v\n\tf32: %v\n\tf64: %v\n\tf16le: %v\n\tf32le: %v\n\tf64le: %v\n\tf16be: %v\n\tf32be: %v\n\tf64be: %v\n\tbool: %v\n\tb8: %v\n\tb16: %v\n\tb32: %v\n\tb64: %v\n\tstring: %v\n\trune: %v\n\trawptr: %v\n\tbyte: %v\n\tcstring: %v\n",
		types.int,
		types.i8,
		types.i16,
		types.i32,
		types.i64,
		types.i128,
		types.uint,
		types.u8,
		types.u16,
		types.u32,
		types.u64,
		types.u128,
		types.uintptr,
		types.i16le,
		types.i32le,
		types.i64le,
		types.i128le,
		types.u16le,
		types.u32le,
		types.u64le,
		types.u128le,
		types.i16be,
		types.i32be,
		types.i64be,
		types.i128be,
		types.u16be,
		types.u32be,
		types.u64be,
		types.u128be,
		types.f16,
		types.f32,
		types.f64,
		types.f16le,
		types.f32le,
		types.f64le,
		types.f16be,
		types.f32be,
		types.f64be,
		types.bool,
		types.b8,
		types.b16,
		types.b32,
		types.b64,
		&types.string,
		// size_of(types.string),
		// transmute([]u8)(types.string),
		types.rune,
		types.rawptr,
		types.byte,
		types.cstring,
	)

	// fmt.printf(
	// 	"type maxes:\n\tint: %v\n\ti8: %v\n\ti16: %v\n\ti32: %v\n\ti64: %v\n\ti128: %v\n\tuint: %v\n\tu8: %v\n\tu16: %v\n\tu32: %v\n\tu64: %v\n\tu128: %v\n\tuintptr: %v\n\ti16le: %v\n\ti32le: %v\n\ti64le: %v\n\ti128le: %v\n\tu16le: %v\n\tu32le: %v\n\tu64le: %v\n\tu128le: %v\n\ti16be: %v\n\ti32be: %v\n\ti64be: %v\n\ti128be: %v\n\tu16be: %v\n\tu32be: %v\n\tu64be: %v\n\tu128be: %v\n\tf16: %v\n\tf32: %v\n\tf64: %v\n\tf16le: %v\n\tf32le: %v\n\tf64le: %v\n\tf16be: %v\n\tf32be: %v\n\tf64be: %v\n\trune: %d\n\tbyte: %v\n",
	// 	max(int),
	// 	max(i8),
	// 	max(i16),
	// 	max(i32),
	// 	max(i64),
	// 	max(i128),
	// 	max(uint),
	// 	max(u8),
	// 	max(u16),
	// 	max(u32),
	// 	max(u64),
	// 	max(u128),
	// 	max(uintptr),
	// 	max(i16le),
	// 	max(i32le),
	// 	max(i64le),
	// 	max(i128le),
	// 	max(u16le),
	// 	max(u32le),
	// 	max(u64le),
	// 	max(u128le),
	// 	max(i16be),
	// 	max(i32be),
	// 	max(i64be),
	// 	max(i128be),
	// 	max(u16be),
	// 	max(u32be),
	// 	max(u64be),
	// 	max(u128be),
	// 	max(f16),
	// 	max(f32),
	// 	max(f64),
	// 	max(f16le),
	// 	max(f32le),
	// 	max(f64le),
	// 	max(f16be),
	// 	max(f32be),
	// 	max(f64be),
	// 	max(rune),
	// 	max(byte),
	// )

	pass_types(&types)
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
