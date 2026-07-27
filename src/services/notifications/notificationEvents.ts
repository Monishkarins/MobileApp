/**
 * Lightweight pub/sub so the notifications screen refreshes when a push arrives.
 */

type Listener = () => void;
const listeners = new Set<Listener>();

export const notificationEvents = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  emit(): void {
    listeners.forEach((listener) => listener());
  },
};
