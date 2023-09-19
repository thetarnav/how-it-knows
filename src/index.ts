import 'virtual:uno.css'
import './root.css'

import './app.js'

const next_to_update: (() => void)[] = []
let scheduled = false

function update(): void {
    scheduled = false

    if (next_to_update.length === 0) return

    const to_update = next_to_update.slice()

    for (const id of to_update) {
        id()
    }
}

export function scheduleRender(id: () => void): void {
    next_to_update.push(id)
    if (!scheduled) {
        scheduled = true
        void requestAnimationFrame(update)
    }
}
