// Hook wrapping html-escape service — components import this instead of the service directly
import { escapeHtml, escapeRegex } from '../services/html-escape.js';

export function useHtmlEscape() {
  return { escapeHtml, escapeRegex };
}
