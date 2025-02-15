/* ---------------------------------------
 * Labels
 * ------------------------------------- */

import { isLpTokenInput, isLpTokenOutput, type SwapIntention } from '../swapIntention';

export function getFromLabel(swapIntent: SwapIntention): string {
	if (isLpTokenOutput(swapIntent)) return 'Add Liquidity';
	if (isLpTokenInput(swapIntent)) return 'Remove Liquidity';
	return 'From';
}
