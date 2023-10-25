package hive

import rnd "core:math/rand"

ID_LENGTH :: 8
Id :: distinct [ID_LENGTH]byte

LS_ID_KEY :: "id"

generate_id :: proc() -> (id: Id) {
	r: rnd.Rand
	rnd.init(&r, 0)
	return transmute(Id)rnd.int63(&r)
}

store_id :: proc(id: Id) {
	id_bytes := ([ID_LENGTH]byte)(id)
	ls_set_bytes(LS_ID_KEY, id_bytes[:])
}

load_id :: proc() -> (id: Id, ok: bool) {
	bytes: [ID_LENGTH]byte
	len := ls_get_bytes(LS_ID_KEY, bytes[:])
	if len == ID_LENGTH {
		return Id(bytes), true
	}
	return
}

load_or_generate_id :: proc() -> Id {
	id, ok := load_id()
	if ok do return id

	id = generate_id()
	store_id(id)
	return id
}
