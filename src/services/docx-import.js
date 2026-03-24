// Dynamically load Mammoth.js from CDN, extract raw text from a .docx file, then delegate to txt-import
import { parseTxtToEntries } from './txt-import.js';

const MAMMOTH_CDN = 'https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js';

let mammothPromise = null;

function loadMammoth() {
  if (mammothPromise) return mammothPromise;
  mammothPromise = new Promise((resolve, reject) => {
    if (window.mammoth) { resolve(window.mammoth); return; }
    const script = document.createElement('script');
    script.src = MAMMOTH_CDN;
    script.onload = () => resolve(window.mammoth);
    script.onerror = () => reject(new Error('Failed to load Mammoth.js from CDN.'));
    document.head.appendChild(script);
  });
  return mammothPromise;
}

export async function importFromDocx(file) {
  const mammoth = await loadMammoth();
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const text = result.value;
  return parseTxtToEntries(text);
}
