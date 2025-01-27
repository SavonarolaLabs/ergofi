import { vitestTokenIds } from '$lib/dexygold/dexyConstants';
import { writable } from 'svelte/store';

export const dexygold_lp_box = writable<any>();
export const oracle_erg_xau_box = writable<any>();

const lpIn = {
	value: 1_000_000_000_000n, //1_000_000_000_000n
	assets: [
		{ tokenId: vitestTokenIds.lpNFT, amount: 1n },
		{ tokenId: vitestTokenIds.lpToken, amount: 100_000_000n }, //lpBalance //100_000_000n
		{ tokenId: vitestTokenIds.dexyUSD, amount: 100_000_000n } //100_000_000n
	]
};

export function initTestBoxes() {
	dexygold_lp_box.set(lpIn);
}
