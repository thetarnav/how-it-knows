package hive

import lbp "./serialize"
import "core:fmt"
import "core:intrinsics"
import "core:mem"
import "core:slice"
import "core:strings"
import "core:time"

Post :: struct {
	timestamp: i64,
	content:   string,
}

serialize_post :: proc(s: ^lbp.Serializer, post: ^Post) {
	lbp.serialize_number(s, &post.timestamp)
	lbp.serialize_string(s, &post.content)
}

timestamp_now :: proc() -> i64 {
	return time.now()._nsec / 1e6
}

/*
ls key name
post_<timestamp>
*/

LS_KEY_PREFIX :: "post_"
LS_KEY_PREFIX_LEN :: len(LS_KEY_PREFIX)
LS_KEY_MAX_LEN :: LS_KEY_PREFIX_LEN + 8

make_ls_key :: proc(timestamp: i64) -> string {
	buf: [LS_KEY_MAX_LEN]byte
	copy(buf[:], LS_KEY_PREFIX)
	timestamp_bytes := transmute([8]byte)(i64le(timestamp))
	copy(buf[LS_KEY_PREFIX_LEN:], timestamp_bytes[:])
	return string(buf[:])
}

get_timestamp_from_ls_key :: proc(key: string) -> (timestamp: i64) {
	assert(len(key) == LS_KEY_MAX_LEN)

	timestamp_bytes: [8]byte
	copy(timestamp_bytes[:], key[LS_KEY_PREFIX_LEN:])
	return i64(transmute(i64le)(timestamp_bytes))
}

@(export)
store_own_post :: proc(_content_length: uint) {
	context.allocator = mem.arena_allocator(&{data = temp_buf})

	buf: [1024]byte
	content_length := load_last_string(buf[:])
	content := string(buf[:content_length])

	post := Post {
		content   = content,
		timestamp = timestamp_now(),
	}

	s: lbp.Serializer
	err := lbp.serializer_init_writer(&s);defer lbp.serializer_destroy_writer(s)
	if err != nil {
		panic("serializer_init_writer failed")
	}

	serialize_post(&s, &post)

	ls_key := make_ls_key(post.timestamp)
	ls_set_bytes(ls_key, s.data[:])

	publish()
	notify_post_subscribers(&post)
}

read_post :: proc() {
	buf: [1024]byte
	len := ls_get_bytes("HEY", buf[:])

	s: lbp.Serializer
	lbp.serializer_init_reader(&s, buf[:len])

	post: Post

	serialize_post(&s, &post)

	fmt.println(post.content, post.timestamp)
}


/*
export function getAllPostMessages(): PostMessage[] {
    const messages: PostMessage[] = []
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key || !key.startsWith('post:')) continue

        const value = localStorage.getItem(key)
        if (!value) continue

        const message = JSON.parse(value)
        if (!isPostMessage(message)) continue

        messages.push(message)
    }
    return messages
}
*/

@(export)
load_all_stored_posts :: proc(
	capacity: int = 1024,
	allocator := context.allocator,
	loc := #caller_location,
) -> (
	posts: []^Post,
	err: mem.Allocator_Error,
) {
	posts_dynamic:= make([dynamic]^Post, 0, capacity, allocator, loc) or_return
    defer delete(posts_dynamic)

	length := ls_length()
	for i := 0; i < length; i += 1 {
		key_buf: [LS_KEY_MAX_LEN]byte
		key_len := ls_key_bytes(i, key_buf[:])
		key := string(key_buf[:key_len])
		if (!strings.has_prefix(key, LS_KEY_PREFIX)) do continue

		value_buf: [1024]byte
		value_len := ls_get_bytes(key, value_buf[:])
		if value_len == 0 do continue

		s: lbp.Serializer
		lbp.serializer_init_reader(&s, value_buf[:value_len])

		post := new(Post, allocator, loc)
		serialize_post(&s, post)

		fmt.printf("post: %d: %s\n", post.timestamp, post.content)

		append(&posts_dynamic, post)
	}

	posts = posts_dynamic[:]

	return
}
