import { randomUUID } from 'crypto';
import type { ExtensionEvent } from './soc-types';

const MAX_EVENTS = 500;

type ExtensionEventStore = {
  events: ExtensionEvent[];
};

const globalStore = globalThis as unknown as {
  __extensionEventStore?: ExtensionEventStore;
};

function getStore(): ExtensionEventStore {
  if (!globalStore.__extensionEventStore) {
    globalStore.__extensionEventStore = { events: [] };
  }
  return globalStore.__extensionEventStore;
}

export function listExtensionEvents(limit = 100): ExtensionEvent[] {
  return getStore().events.slice(0, Math.max(1, Math.min(limit, MAX_EVENTS)));
}

export function addExtensionEvent(event: Omit<ExtensionEvent, 'id' | 'timestamp'> & Partial<Pick<ExtensionEvent, 'id' | 'timestamp'>>) {
  const store = getStore();
  const normalized: ExtensionEvent = {
    id: event.id || randomUUID(),
    timestamp: event.timestamp || new Date().toISOString(),
    emailSubject: event.emailSubject || 'Unknown Subject',
    sender: event.sender || 'unknown@sender',
    threatType: event.threatType || 'None',
    score: Number.isFinite(event.score) ? event.score : 0,
    severity: event.severity || 'Safe',
    action: event.action || 'allowed',
    fingerprint: event.fingerprint || randomUUID().replace(/-/g, '').slice(0, 16),
    source: event.source || 'inbound',
  };

  store.events.unshift(normalized);
  if (store.events.length > MAX_EVENTS) {
    store.events.length = MAX_EVENTS;
  }
  return normalized;
}
