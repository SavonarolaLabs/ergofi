import { txToSigmaUSDInteraction } from '$lib/interaction';
import type { Interaction } from '$lib/types/interaction';
import { writable, type Writable } from 'svelte/store';

export const prepared_interactions: Writable<Interaction[]> = writable([]);

export function addPreparedInteraction(tx) {
	let i = txToSigmaUSDInteraction(tx);
	prepared_interactions.update((l) => [i, ...l]);
}
