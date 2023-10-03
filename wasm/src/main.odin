package hive

import "core:fmt"

main :: proc() {
	fmt.println("Hello, world!", size_of(i64), size_of(int), size_of(rawptr))
}

@(export)
call_me :: proc() {
	fmt.println("Thank you")
}
