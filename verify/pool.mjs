// Runs browser scenarios a few at a time instead of one after another.
//
// Each scenario already launches its own browser with an empty profile, so
// scenarios share nothing but the dev server and can run side by side. What
// they cannot share is the terminal: four scenarios printing at once would
// interleave line by line. So every console.log made while a scenario runs
// (from the runner, the scenario itself or the driver) is caught in that
// scenario's buffer, through AsyncLocalStorage, and printed as one block when
// it finishes. Blocks therefore appear in finishing order, not file order.
//
// VERIFY_JOBS sets how many run at once (default: up to 4, never more than the
// machine's cores). VERIFY_JOBS=1 is the old one-at-a-time behaviour, for
// telling a real failure from one that only appears under load.
import os from 'node:os';
import { AsyncLocalStorage } from 'node:async_hooks';

const scope = new AsyncLocalStorage();
const writeLine = console.log.bind(console);

console.log = (...args) => {
  const buffer = scope.getStore();
  if (buffer) buffer.push(args);
  else writeLine(...args);
};

export const JOBS = Math.max(1, Number(process.env.VERIFY_JOBS) || Math.min(4, os.cpus().length));

/** Runs `worker` over `items`, at most `jobs` at once; results keep item order. */
export async function runPool(items, worker, jobs = JOBS) {
  const results = new Array(items.length);
  let next = 0;
  async function lane() {
    while (next < items.length) {
      const i = next++;
      const buffer = [];
      try {
        results[i] = await scope.run(buffer, () => worker(items[i], i));
      } finally {
        for (const args of buffer) writeLine(...args);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(jobs, items.length) }, lane));
  return results;
}
