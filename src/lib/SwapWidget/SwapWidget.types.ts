import type { Asset } from '$lib/api/ergoNode';

export type Currency = {
	tokens: string[]; // e.g. ["ERG"], ["SigUSD"], ["SigRSV"]
	isToken?: boolean;
	isLpToken?: boolean;
	isLpPool?: boolean;
};

export type UiInputAsset = {
	tokenId: string;
	amount: string;
};

export type LastUserInput = 'From' | 'To';

export type SwapOrderInput = {
	fromCurrency: Currency;
	toCurrency: Currency;
	lastInput: Asset;
};
