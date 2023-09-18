/* @refresh reload */
import {render} from 'solid-js/web'
import App from './App.tsx'

import 'virtual:uno.css'
import './root.css'

void render(() => <App />, document.getElementById('root')!)
