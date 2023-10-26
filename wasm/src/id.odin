package hive

import "core:fmt"
import rnd "core:math/rand"

LS_ID_KEY :: "id"

own_id := load_or_generate_id()

@(require_results)
generate_id :: proc() -> Id {
	r: rnd.Rand
	rnd.init_as_system(&r)
	return transmute(Id)rnd.int63(&r)
}

store_id :: proc(id: Id) {
	bytes := id.bytes
	ls_set_bytes(LS_ID_KEY, bytes[:])
}

@(require_results)
load_id :: proc() -> (id: Id, ok: bool) {
	bytes: [ID_LENGTH]byte
	len := ls_get_bytes(LS_ID_KEY, bytes[:])
	if len == ID_LENGTH {
		return {bytes = bytes}, true
	}
	return
}

@(require_results)
load_or_generate_id :: proc() -> Id {
	id, ok := load_id()
	if ok do return id

	id = generate_id()
	store_id(id)
	return id
}
