package hive

import "core:mem"
import "core:slice"

Callback :: #type proc(data_ptr: rawptr)

@(private = "file")
cb_array: #soa[1024]struct {
	data_ptr: rawptr,
	callback: Callback,
}

@(private = "file")
cb_offset: int

subscribe :: proc(data_ptr: rawptr, callback: Callback) -> (err: mem.Allocator_Error) {
	if cb_offset == len(cb_array) {
		return mem.Allocator_Error.Out_Of_Memory
	}

	cb_array[cb_offset] = {
		data_ptr = data_ptr,
		callback = callback,
	}
	cb_offset += 1

	return
}

unsubscribe :: proc(callback: Callback) -> (ok: bool) {
	idx := slice.linear_search(cb_array.callback[:cb_offset], callback) or_return

	cb_offset -= 1
	cb_array[idx] = cb_array[cb_offset]

	return true
}

publish :: proc() {
	for callback_data in cb_array[:cb_offset] {
		callback_data.callback(callback_data.data_ptr)
	}
}
