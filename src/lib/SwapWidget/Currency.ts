// All possible "from" currencies

import type { Currency } from './SwapWidget.types';

export const currencyERG: Currency = { tokens: ['ERG'], isToken: true };
export const currencySigUSD: Currency = { tokens: ['SigUSD'], isToken: true };
export const currencySigRSV: Currency = { tokens: ['SigRSV'], isToken: true };
export const currencyDexyGold: Currency = { tokens: ['DexyGold'], isToken: true };
export const currencyErgDexyGoldLpToken: Currency = {
	tokens: ['ERG', 'DexyGold'],
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

export function getAllowedToCurrencies(fromC: Currency): Currency[] {
	if (fromC.tokens[0] === 'ERG' && fromC.isToken) {
		return [currencySigUSD, currencySigRSV, currencyDexyGold];
	} else if (fromC.isLpPool) {
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
