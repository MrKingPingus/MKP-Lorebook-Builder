// Lorebook list with timestamps, and switch/create/delete actions via lorebook-store
import { useLorebookStore } from '../state/lorebook-store.js';
import { useLorebook } from './use-lorebook.js';

function relativeTime(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const secs = Math.floor(diff / 1000);
  if (secs < 60)  return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60)  return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function useLorebookSwitcher() {
  const activeLorebookId = useLorebookStore((s) => s.activeLorebookId);
  const lorebookIndex    = useLorebookStore((s) => s.lorebookIndex);
  const { createLorebook, switchLorebook, deleteLorebook, renameLorebookById } = useLorebook();

  const items = lorebookIndex.map((item) => ({
    ...item,
    relativeTime: relativeTime(item.updatedAt),
    isActive:     item.id === activeLorebookId,
  }));

  return { items, createLorebook, switchLorebook, deleteLorebook, renameLorebookById };
}
