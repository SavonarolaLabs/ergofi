export const FEE_UI = 10n; //0.1%
export const FEE_UI_DENOM = 100_00n;

// Fee
export function applyFee(inputERG: bigint, feeMining: bigint) {
	const uiSwapFee = (inputERG * FEE_UI) / FEE_UI_DENOM;
	const contractERG = inputERG - feeMining - uiSwapFee;
	return { uiSwapFee, contractERG };
}
export function reverseFee(contractERG: bigint, feeMining: bigint) {
	const uiSwapFee = (contractERG * FEE_UI) / (FEE_UI_DENOM - FEE_UI);
	const inputERG = contractERG + feeMining + uiSwapFee;
	return { inputERG, uiSwapFee };
}
export function reverseFeeSell(contractERG: bigint, feeMining: bigint) {
	const uiSwapFee = (contractERG * FEE_UI) / FEE_UI_DENOM;
	const userERG = contractERG - feeMining - uiSwapFee;
	return { userERG, uiSwapFee };
}
export function applyFeeSell(inputERG: bigint, feeMining: bigint) {
	const uiSwapFee = (inputERG * FEE_UI) / (FEE_UI_DENOM - FEE_UI);
	const contractERG = inputERG + feeMining + uiSwapFee;
	return { uiSwapFee, contractERG };
}
