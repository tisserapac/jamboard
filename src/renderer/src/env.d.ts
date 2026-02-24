/// <reference types="vite/client" />

import type { JamboardAPI } from '../../preload/index'

declare global {
  interface Window {
    api: JamboardAPI
  }
}
