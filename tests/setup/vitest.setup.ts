import WebSocket from 'ws';

if (typeof globalThis.WebSocket === 'undefined') {
  Object.defineProperty(globalThis, 'WebSocket', {
    value: WebSocket,
    configurable: true,
  });
}
