export type SwapSide = 'input' | 'output';

export type SwapRow = {
	tokenId: string;
	ticker: string;
	amount?: bigint;

	side: SwapSide;
	value?: string;
};

export type SwapIntention = SwapRow[];
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

export function anchor(swapIntention: SwapIntention): SwapRow {
	return swapIntention.find((si) => si.amount != undefined)!;
}

export function anchorTokenId(swapIntention: SwapIntention): string {
	return swapIntention.find((si) => si.amount != undefined)!.tokenId;
}

export function anchorSide(swapIntention: SwapIntention): SwapSide {
	return swapIntention.find((si) => si.amount != undefined)!.side;
}

export function getSwapTag(swapIntent: SwapIntention): string {
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
	const anchorIntent = anchor(swapIntent);
	if (anchorIntent.side == 'input') {
		inputStr = inputStr + '_' + anchorIntent.ticker;
	} else {
		outputStr = outputStr + '_' + anchorIntent.ticker;
	}
	return (inputStr + '/' + outputStr).toUpperCase();
}
