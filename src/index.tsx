/* @refresh reload */
import {render} from 'solid-js/web'

import App from './App.tsx'

document.body.style.backgroundColor = '#222'
document.body.style.color = '#fff'
document.body.style.fontFamily = 'sans-serif'

void render(() => <App />, document.getElementById('root')!)
