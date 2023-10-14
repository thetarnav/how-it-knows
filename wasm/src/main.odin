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
	pass_types :: proc(types: ^Types, from_js: ^Types) ---
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


test_f16 :: proc() {
	a := f16(1.2)
	b := f16(-1.2)
	c := f16(0.0)
	d := f16(1.0)
	e := f16(-1.0)
	f := f16(-27.15625)
	inf: f16 = transmute(f16)([2]byte{0x0, 0b01111100})
	neg_inf: f16 = transmute(f16)([2]byte{0x0, 0b11111100})

	fmt.printf(
		"f16:\n\t%f; %b\n\t%f; %b\n\t%f; %b\n\t%f; %b\n\t%f; %b\n\t%f; %b\n\t%f; %b\n\t%f; %b\n",
		a,
		(transmute([2]byte)(a)),
		b,
		(transmute([2]byte)(b)),
		c,
		(transmute([2]byte)(c)),
		d,
		(transmute([2]byte)(d)),
		e,
		(transmute([2]byte)(e)),
		f,
		(transmute([2]byte)(f)),
		inf,
		(transmute([2]byte)(inf)),
		neg_inf,
		(transmute([2]byte)(neg_inf)),
	)
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

	test_f16()

	types := Types {
		int     = -(123),
		i8      = -(123),
		i16     = -(123),
		i32     = -(123),
		i64     = -(123),
		i128    = (0x10000000000000000000000000000000),
		uint    = 69,
		u8      = 188,
		u16     = 123,
		u32     = 123,
		u64     = 123,
		u128    = 123,
		uintptr = 123,
		i16le   = -(123),
		i32le   = -(123),
		i64le   = -(123),
		i128le  = -(123),
		u16le   = 123,
		u32le   = 123,
		u64le   = 123,
		u128le  = 123,
		i16be   = -(123),
		i32be   = -(123),
		i64be   = -(123),
		i128be  = -(0x10000000000000000000000000000000),
		u16be   = 123,
		u32be   = 123,
		u64be   = 123,
		u128be  = 123,
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

	from_js := Types{}

	fmt.printf("types: %v\n", types)


	pass_types(&types, &from_js)

	fmt.printf("from_js: %v\n", from_js)
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
