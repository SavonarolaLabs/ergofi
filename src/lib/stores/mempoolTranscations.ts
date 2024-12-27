import { mempoolDummy } from '$lib/mempoolDummy';
import { writable } from 'svelte/store';

export const mempool_transactions = writable([]);
let x = mempoolDummy;
mempool_transactions.set([x, x, x, x, x, x, x, x, x, x, x, x, x, x, x, x, x]);
