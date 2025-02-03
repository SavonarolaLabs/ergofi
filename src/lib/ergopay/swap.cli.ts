/**
 * CLI/entry-point file that calls `run()` at top-level.
 * This code is separate from `swap.ts` so it won’t break Vitest mocks.
 */

import { run } from './swap';

(async function main() {
	try {
		const params = await run();
		console.log('Parsed Parameters:', params);
	} catch (err) {
		console.error(err);
		process.exit(1);
	}
})();
