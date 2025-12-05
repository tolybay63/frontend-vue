declare module 'workbox-window' {
  export type WorkboxEventType = 'waiting' | 'controlling' | string

  export type WorkboxEventListener = (...args: unknown[]) => void

  export class Workbox {
    constructor(scriptURL: string, options?: Record<string, unknown>)
    addEventListener(type: WorkboxEventType, listener: WorkboxEventListener): void
    messageSkipWaiting(): void
    register(): Promise<void>
  }
}
