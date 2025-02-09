import type { ErgoNodeInfo } from '$lib/api/ergoNode';
import { writable, type Writable } from 'svelte/store';

export const info: Writable<ErgoNodeInfo> = writable();
