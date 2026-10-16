// Whether the closed navbar can be plain type, with no sheet behind it: only while a page holds a screen
// still (a pinned stage) that keeps everything clear of the bar. The page says so; the navbar listens.

const EVENT = "nav:plain";
// kept, because a page can say it before the navbar listens (layout effects run before passive ones)
let current = false;

/** a page's pinned stage, entering (true) or leaving (false) the screen it holds */
export function setNavPlain(on: boolean) {
  if (on === current) return;
  current = on;
  window.dispatchEvent(new CustomEvent<boolean>(EVENT, { detail: on }));
}

/** the navbar's side: called at once with where things stand, then with each change; returns the cleanup */
export function onNavPlain(fn: (on: boolean) => void) {
  fn(current);
  const listener = (e: Event) => fn((e as CustomEvent<boolean>).detail);
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
