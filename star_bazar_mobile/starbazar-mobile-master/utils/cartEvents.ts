type Listener = (count: number) => void;

let listeners: Listener[] = [];

export function subscribeCart(listener: Listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

export function emitCart(count: number) {
  listeners.forEach(l => {
    try { l(count); } catch (e) { /* ignore */ }
  });
}

export default { subscribeCart, emitCart };
