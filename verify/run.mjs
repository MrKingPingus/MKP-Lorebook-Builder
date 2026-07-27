// Entry point for `npm run verify`. Ensures a dev server is up (starting one if
// needed and tearing it down afterward), then runs the behavioural checks.
// Exits non-zero if any scenario fails, so it can gate CI or a pre-push hook.
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { runAllChecks } from './checks.mjs';
import { runKeychordChecks } from './keychord-checks.mjs';
import { runFolderTreeChecks } from './folder-tree-checks.mjs';
import { runSelectionRangeChecks } from './selection-range-checks.mjs';
import { runDragDropChecks } from './drag-drop-checks.mjs';
import { BASE_URL } from './driver.mjs';

async function serverUp() {
  try {
    const r = await fetch(BASE_URL, { signal: AbortSignal.timeout(1500) });
    return r.ok;
  } catch {
    return false;
  }
}

// Pure-logic checks first — no browser needed. They cover the platform paths
// (macOS Option key) the Linux-only browser suite can't reach, and the folder
// maths, which is far cheaper to exercise exhaustively here than through the UI.
// `npm run verify -- folders` runs only the scenarios whose names contain
// "folders". The pure-logic checks are milliseconds, so they always run.
const only = process.argv.slice(2).find((a) => !a.startsWith('-')) || process.env.VERIFY_ONLY || '';

const pureOk = [
  runKeychordChecks(),
  runFolderTreeChecks(),
  runSelectionRangeChecks(),
  runDragDropChecks(),
].every(Boolean);

let child = null;
if (await serverUp()) {
  console.log(`Using already-running dev server at ${BASE_URL}`);
} else {
  console.log('Starting dev server…');
  child = spawn('npm', ['run', 'dev'], { stdio: 'ignore' });
  for (let i = 0; i < 40 && !(await serverUp()); i++) await sleep(500);
  if (!(await serverUp())) {
    console.error('Dev server did not come up on', BASE_URL);
    child.kill('SIGTERM');
    process.exit(1);
  }
}

let ok = false;
try {
  ok = await runAllChecks(only);
} finally {
  if (child) child.kill('SIGTERM');
}
process.exit(ok && pureOk ? 0 : 1);
