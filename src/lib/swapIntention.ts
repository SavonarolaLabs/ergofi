import { ergoTokens } from '$lib/stores/ergoTokens';

export type SwapSide = 'input' | 'output';

export type TokenInput = {
	tokenId: string;
	value?: string;
};

export type SwapItem = TokenInput & {
	ticker: string;
	side: SwapSide;
	amount?: bigint;
	lastInput?: boolean;
};

export type SwapIntention = SwapItem[];
export type SwapPreview = { calculatedIntent: SwapIntention; price: number };

export function inputTokenIds(swapIntention: SwapIntention): string[] {
	return swapIntention.filter((si) => si.side == 'input').map((si) => si.tokenId);
}

export function outputTokenIds(swapIntention: SwapIntention): string[] {
	return swapIntention.filter((so) => so.side == 'output').map((so) => so.tokenId);
}

export function swapAmount(swapIntention: SwapIntention): bigint {
	return swapIntention.find((si) => si.amount != undefined)!.amount!;
}

export function anchor(swapIntention: SwapIntention): SwapItem | undefined {
	return swapIntention.find((si) => si.amount != undefined)!;
}

export function anchorTokenId(swapIntention: SwapIntention): string {
	return swapIntention.find((si) => si.amount != undefined)!.tokenId;
}

export function anchorSide(swapIntention: SwapIntention): SwapSide {
	return swapIntention.find((si) => si.amount != undefined)!.side;
}

export function getSwapTag(swapIntent: SwapIntention, anchorIntent: SwapItem): string {
	console.log({ swapIntent });
	let inputStr = '';
	let outputStr = '';

	swapIntent.forEach((s) => {
		if (s.side == 'input') {
			inputStr = inputStr ? inputStr + '+' + s.ticker : s.ticker;
		} else {
			outputStr = outputStr ? outputStr + '+' + s.ticker : s.ticker;
		}
	});

	if (anchorIntent.side == 'input') {
		inputStr = inputStr + '_' + anchorIntent.ticker;
	} else {
		outputStr = outputStr + '_' + anchorIntent.ticker;
	}
	return (inputStr + '/' + outputStr).toUpperCase();
}

export function setAmount(
	swapIntention: SwapIntention,
	tokenId: string,
	amount: bigint,
	side?: SwapSide
) {
	if (side) {
		swapIntention.find((i) => i.tokenId == tokenId && i.side == side)!.amount = amount;
	} else {
		swapIntention.find((i) => i.tokenId == tokenId)!.amount = amount;
	}
}

export function isLpTokenOutput(swapIntent: SwapIntention): boolean {
	const tokenIds = outputTokenIds(swapIntent);
	return tokenIds.length == 1 && ergoTokens[tokenIds[0]].isLpToken;
}

export function isLpTokenInput(swapIntent: SwapIntention): boolean {
	const tokenIds = inputTokenIds(swapIntent);
	return tokenIds.length == 1 && ergoTokens[tokenIds[0]].isLpToken;
}

export function inputTicker(swapIntent: SwapIntention, index: number) {
	return swapIntent.filter((i) => 'input' == i.side)[index].ticker;
}

export function outputTicker(swapIntent: SwapIntention, index: number) {
	return swapIntent.filter((i) => 'output' == i.side)[index].ticker;
}
