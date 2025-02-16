// All possible "from" currencies

import { getTokenId } from '$lib/stores/ergoTokens';
import type { SwapIntention, SwapItem } from '../swapIntention';

export type SwapOption =
	| { item: SwapItem; intention?: never }
	| { item?: never; intention: SwapIntention };

export const currencyERG: SwapItem = { side: 'input', ticker: 'ERG', tokenId: getTokenId('ERG')! };
export const currencySigUSD: SwapItem = {
	side: 'input',
	ticker: 'SigUSD',
	tokenId: getTokenId('SigUSD')!
};
export const currencySigRSV: SwapItem = {
	side: 'input',
	ticker: 'SigRSV',
	tokenId: getTokenId('SigRSV')!
};
export const currencyDexyGold: SwapItem = {
	side: 'input',
	ticker: 'DexyGold',
	tokenId: getTokenId('DexyGold')!
};
export const currencyErgDexyGoldLpToken: SwapItem = {
	side: 'input',
	ticker: 'DexyGoldLP',
	tokenId: getTokenId('DexyGoldLP')!
};
export const ergDexyGoldToLp: SwapIntention = [
	{ side: 'input', ticker: 'ERG', tokenId: getTokenId('ERG')! },
	{ side: 'input', ticker: 'DexyGold', tokenId: getTokenId('DexyGold')! },
	{ side: 'output', ticker: 'DexyGoldLP', tokenId: getTokenId('DexyGoldLP')! }
];

export const inputOptions: SwapOption[] = [
	{ item: currencyERG },
	{ item: currencyDexyGold },
	{ item: currencySigUSD },
	{ item: currencySigRSV },
	// currencyErgDexyGoldLpToken,
	{ intention: ergDexyGoldToLp }
];

export function getOutputOptions(swapIntent: SwapIntention): SwapOption[] {
	const inputs = swapIntent.filter((i) => i.side == 'input');
	if (inputs.length == 1 && inputs[0].ticker == 'ERG') {
		return [currencySigUSD, currencySigRSV, currencyDexyGold];
	} else if (inputs.length == 2) {
		return [currencyErgDexyGoldLpToken];
	} else {
		return [currencyERG];
	}
}

export function tokenColor(ticker: string) {
	return {
		ERG: 'bg-orange-500',
		SigUSD: 'bg-green-500',
		SigRSV: 'bg-[#4A90E2]',
		DexyGold: 'bg-[yellow]'
	}[ticker];
}
