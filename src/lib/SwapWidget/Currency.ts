// All possible "from" currencies

import type { SwapIntention } from '../swapIntention';
import type { SwapItem } from './SwapWidget.types';

export const currencyERG: SwapItem = { tokens: ['ERG'], isToken: true };
export const currencySigUSD: SwapItem = { tokens: ['SigUSD'], isToken: true };
export const currencySigRSV: SwapItem = { tokens: ['SigRSV'], isToken: true };
export const currencyDexyGold: SwapItem = { tokens: ['DexyGold'], isToken: true };
export const currencyErgDexyGoldLpToken: SwapItem = {
	tokens: ['DexyGoldLP'],
	isLpToken: true
};
export const currencyErgDexyGoldLpPool: SwapItem = { tokens: ['ERG', 'DexyGold'], isLpPool: true };

export const fromCurrencies: SwapItem[] = [
	currencyERG,
	currencyDexyGold,
	currencySigUSD,
	currencySigRSV,
	// currencyErgDexyGoldLpToken,
	currencyErgDexyGoldLpPool
];

export function getAllowedSwapItems(swapIntent: SwapIntention): SwapItem[] {
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
