// All possible "from" currencies

import type { SwapIntention } from '../swapIntention';
import type { Currency } from './SwapWidget.types';

export const currencyERG: Currency = { tokens: ['ERG'], isToken: true };
export const currencySigUSD: Currency = { tokens: ['SigUSD'], isToken: true };
export const currencySigRSV: Currency = { tokens: ['SigRSV'], isToken: true };
export const currencyDexyGold: Currency = { tokens: ['DexyGold'], isToken: true };
export const currencyErgDexyGoldLpToken: Currency = {
	tokens: ['DexyGoldLP'],
	isLpToken: true
};
export const currencyErgDexyGoldLpPool: Currency = { tokens: ['ERG', 'DexyGold'], isLpPool: true };

export const fromCurrencies: Currency[] = [
	currencyERG,
	currencyDexyGold,
	currencySigUSD,
	currencySigRSV,
	// currencyErgDexyGoldLpToken,
	currencyErgDexyGoldLpPool
];

export function getAllowedToTokens(swapIntent: SwapIntention): Currency[] {
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
