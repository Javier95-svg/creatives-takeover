/**
 * Scrolls whatever actually scrolls a page back to the top. Workspace pages
 * scroll inside a panel, where window.scrollTo does nothing.
 */
export function scrollToTopFrom(node: HTMLElement | null) {
  let element = node?.parentElement ?? null;
  while (element && !(element.scrollHeight > element.clientHeight && /(auto|scroll)/.test(getComputedStyle(element).overflowY))) {
    element = element.parentElement;
  }
  (element ?? window).scrollTo({ top: 0, behavior: "smooth" });
}
