package hive

import "core:fmt"

store_own_post :: proc(content: string) {
	fmt.println("HIVE store_own_post", content)
}
