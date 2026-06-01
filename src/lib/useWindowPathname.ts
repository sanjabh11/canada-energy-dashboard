import { useSyncExternalStore } from 'react';

const PATHNAME_CHANGE_EVENT = 'ceip:pathname-change';

let historyPatched = false;

function getWindowPathname(): string {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname || '/';
}

function notifyPathnameChange() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(PATHNAME_CHANGE_EVENT));
}

function ensureHistoryPatched() {
  if (historyPatched || typeof window === 'undefined') return;

  const originalPushState = window.history.pushState.bind(window.history);
  const originalReplaceState = window.history.replaceState.bind(window.history);

  window.history.pushState = function pushState(...args) {
    const result = originalPushState(...args);
    notifyPathnameChange();
    return result;
  };

  window.history.replaceState = function replaceState(...args) {
    const result = originalReplaceState(...args);
    notifyPathnameChange();
    return result;
  };

  window.addEventListener('popstate', notifyPathnameChange);
  historyPatched = true;
}

function subscribe(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  ensureHistoryPatched();
  window.addEventListener(PATHNAME_CHANGE_EVENT, onStoreChange);
  window.addEventListener('popstate', onStoreChange);

  return () => {
    window.removeEventListener(PATHNAME_CHANGE_EVENT, onStoreChange);
    window.removeEventListener('popstate', onStoreChange);
  };
}

export function useWindowPathname(): string {
  return useSyncExternalStore(subscribe, getWindowPathname, () => '/');
}
