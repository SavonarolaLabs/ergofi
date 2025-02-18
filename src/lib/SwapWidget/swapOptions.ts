// All possible "from" currencies

import { ergoTokens, getTokenId } from '$lib/stores/ergoTokens';
import { amountToValue } from '$lib/utils';
import { type SwapIntention, type SwapItem } from '../swapIntention';

export type SwapOption =
	| { item: SwapItem; intention?: never }
	| { item?: never; intention: SwapIntention };

export const itemERG: SwapOption = {
	item: {
		side: 'input',
		ticker: 'ERG',
		tokenId: getTokenId('ERG')!
	}
};
export const itemSigUSD: SwapOption = {
	item: {
		side: 'input',
		ticker: 'SigUSD',
		tokenId: getTokenId('SigUSD')!
	}
};
export const itemSigRSV: SwapOption = {
	item: {
		side: 'input',
		ticker: 'SigRSV',
		tokenId: getTokenId('SigRSV')!
	}
};
export const itemDexyGold: SwapOption = {
	item: {
		side: 'input',
		ticker: 'DexyGold',
		tokenId: getTokenId('DexyGold')!
	}
};
export const itemErgDexyGoldLpToken: SwapOption = {
	item: {
		side: 'input',
		ticker: 'DexyGoldLP',
		tokenId: getTokenId('DexyGoldLP')!
	}
};
export const ergDexyGoldToLp: SwapOption = {
	intention: [
		{ side: 'input', ticker: 'ERG', tokenId: getTokenId('ERG')! },
		{ side: 'input', ticker: 'DexyGold', tokenId: getTokenId('DexyGold')! },
		{ side: 'output', ticker: 'DexyGoldLP', tokenId: getTokenId('DexyGoldLP')! }
	]
};

export const ergToSigUsd: SwapOption = {
	intention: [
		{ side: 'input', ticker: 'ERG', tokenId: getTokenId('ERG')! },
		{ side: 'output', ticker: 'SigUSD', tokenId: getTokenId('SigUSD')! }
	]
};

export const inputOptions: SwapOption[] = [
	itemERG,
	itemDexyGold,
	itemSigUSD,
	itemSigRSV,
	ergDexyGoldToLp
];

export function defaultAmountIntent(swapIntent: SwapIntention) {
	const copySwapIntent = structuredClone(swapIntent);

	const defaultAmount = ergoTokens[copySwapIntent[0].tokenId].defaultAmount;

	copySwapIntent[0].amount = defaultAmount;
	return copySwapIntent;
}

export function getOutputOptions(swapOption: SwapOption): SwapOption[] {
	if (swapOption.item) {
		if (swapOption.item.ticker == 'ERG') {
			return [itemSigUSD, itemSigRSV, itemDexyGold];
		} else {
			return [itemERG];
		}
	} else {
		//intention...
		if (swapOption.intention.length > 2) {
			return [itemErgDexyGoldLpToken];
		} else {
			if (swapOption.intention[0].ticker == 'ERG') {
				return [itemSigUSD, itemSigRSV, itemDexyGold];
			} else {
				return [itemERG];
			}
		}
	}
}

export function createDefaultInput(swapIntent: SwapIntention): SwapItem {
	const firstItem: SwapItem = {
		side: swapIntent[0].side,
		tokenId: swapIntent[0].tokenId,
		ticker: swapIntent[0].ticker,
		amount: ergoTokens[swapIntent[0].tokenId].defaultAmount
	};
	firstItem.value = amountToValue(firstItem);
	return firstItem;
}

export function tokenColor(ticker: string) {
	return {
		ERG: 'bg-orange-500',
		SigUSD: 'bg-green-500',
		SigRSV: 'bg-[#4A90E2]',
		DexyGold: 'bg-[yellow]'
	}[ticker];
}
