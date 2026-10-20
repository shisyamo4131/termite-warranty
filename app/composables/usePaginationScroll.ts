import { shallowRef, watch, type Ref } from 'vue'

/** Reset only the paged table, after Vue has rendered its new rows. */
export function usePaginationScroll(page: Ref<number>) {
  const table = shallowRef<{ $el: HTMLElement } | HTMLElement | null>(null)
  watch(page, () => {
    const target = table.value
    const root = target && ('$el' in target ? target.$el : target)
    if (!root) return
    const wrapper = root.querySelector<HTMLElement>('.v-table__wrapper')
    if (wrapper) wrapper.scrollTop = 0
    // Some lists scroll in their workspace or dialog rather than inside VTable.
    // Reveal the table's start without moving horizontal scroll or the document.
    let parent = root.parentElement
    while (parent && parent !== root.ownerDocument.body && parent !== root.ownerDocument.documentElement) {
      if (parent.scrollHeight > parent.clientHeight && /^(auto|scroll)$/.test(getComputedStyle(parent).overflowY)) {
        const top = root.getBoundingClientRect().top
        const viewportTop = parent.getBoundingClientRect().top + parent.clientTop
        if (top < viewportTop || top >= viewportTop + parent.clientHeight) {
          parent.scrollTop += top - viewportTop
        }
      }
      parent = parent.parentElement
    }
  }, { flush: 'post' })
  return table
}
