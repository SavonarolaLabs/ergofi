export type SwapSide = 'input' | 'output';

export type SwapRow = {
	tokenId: string;
	amount?: bigint;

	side: SwapSide;
	value?: string;
};

export type SwapIntention = SwapRow[];

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
