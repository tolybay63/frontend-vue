// src/shared/composables/useIsMobile.ts
import { ref, onMounted, onBeforeUnmount } from 'vue'

type MQLCompat = MediaQueryList & {
  addListener?: (listener: (this: MediaQueryList, ev: MediaQueryListEvent) => void) => void
  removeListener?: (listener: (this: MediaQueryList, ev: MediaQueryListEvent) => void) => void
  addEventListener?: (
    type: 'change',
    listener: (ev: MediaQueryListEvent) => void,
    options?: boolean | AddEventListenerOptions
  ) => void
  removeEventListener?: (
    type: 'change',
    listener: (ev: MediaQueryListEvent) => void,
    options?: boolean | EventListenerOptions
  ) => void
}

/** Реактивный флаг «мобильный экран» через matchMedia, без @vueuse/core. */
export function useIsMobile(query = '(max-width: 720px)') {
  const isMobile = ref(false)
  let mql: MQLCompat | null = null

  const apply = (mq: MediaQueryList | MediaQueryListEvent) => {
    const matches = 'matches' in mq ? mq.matches : (mq as MediaQueryList).matches
    isMobile.value = !!matches
  }
  const onChange = (e: MediaQueryListEvent) => apply(e)

  onMounted(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    mql = window.matchMedia(query) as MQLCompat
    apply(mql)
    if (mql.addEventListener) {
      mql.addEventListener('change', onChange)
    } else if (mql.addListener) {
      // deprecated, но оставляем для старых Safari
      mql.addListener(onChange)
    }
  })

  onBeforeUnmount(() => {
    if (!mql) return
    if (mql.removeEventListener) {
      mql.removeEventListener('change', onChange)
    } else if (mql.removeListener) {
      // deprecated, но оставляем для старых Safari
      mql.removeListener(onChange)
    }
  })

  return { isMobile }
}
