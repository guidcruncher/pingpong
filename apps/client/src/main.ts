import "bootstrap"
import { createApp } from "vue"
import './assets/style.scss'

// Import Bootstrap CSS and JS Bundle (Includes Popper)
import "bootstrap/dist/css/bootstrap.min.css"
import "bootstrap/dist/js/bootstrap.bundle.min.js"

import App from "./App.vue"

createApp(App).mount("#app")
