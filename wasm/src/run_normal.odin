package hive

// import "core:fmt"
// import "core:mem"
// import "core:strings"


// My_Str :: struct {
// 	len: int,
// 	str: string,
// }

// main :: proc() {
// 	my_str := new(My_Str)
// 	my_str.str = "nice to meet you!"


// 	fmt.println("size of struct ptr", size_of(my_str))
// 	fmt.println("size of struct", size_of(my_str^))
// 	fmt.println("size of str", size_of(my_str.str))
// 	fmt.println("size of len", size_of(my_str.len))

// 	// my_str.len = size_of(my_str.ptr)

// 	str_bytes := mem.byte_slice(&my_str.str, size_of(my_str.str))

// 	fmt.printf("str_bytes: %v\n", str_bytes)

// 	sb := strings.builder_make()
// 	strings.write_string(&sb, my_str.str)
// 	from_builder := strings.to_string(sb)

// 	fmt.println("my_str:", from_builder)


// 	fmt.println("size of str", size_of(from_builder))

// 	str_bytes = mem.byte_slice(&from_builder, size_of(from_builder))
// 	fmt.printf("str_bytes: %v\n", str_bytes)
// }
