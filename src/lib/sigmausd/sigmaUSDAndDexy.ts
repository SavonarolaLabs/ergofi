// Constants
export const FEE_UI = 10n; // 0.1%
export const FEE_UI_DENOM = 100_00n;

export type Direction = -1n | 1n;

// Types
type FeeResult = {
	uiSwapFee: bigint;
	contractErg: bigint;
};

type ReverseFeeResult = {
	inputErg: bigint;
	uiSwapFee: bigint;
};

type ReverseFeeSellResult = {
	userErg: bigint;
	uiSwapFee: bigint;
};

// Functions
export function applyFee(
	inputErg: bigint,
	feeMining: bigint,
	multiplicator: bigint = 1n
): FeeResult {
	const uiSwapFee = (inputErg * FEE_UI * multiplicator) / FEE_UI_DENOM;
	const contractErg = inputErg - feeMining - uiSwapFee;
	return { uiSwapFee, contractErg };
}
export function reverseFee(
	contractErg: bigint,
	feeMining: bigint,
	multiplicator: bigint = 1n
): ReverseFeeResult {
	const uiSwapFee =
		(contractErg * FEE_UI * multiplicator) / (FEE_UI_DENOM - FEE_UI * multiplicator);
	const inputErg = contractErg + feeMining + uiSwapFee;
	return { inputErg, uiSwapFee };
}

export function reverseFeeSell(
	contractErg: bigint,
	feeMining: bigint,
	multiplicator: bigint = 1n
): ReverseFeeSellResult {
	const uiSwapFee = (contractErg * FEE_UI * multiplicator) / FEE_UI_DENOM;
	const userErg = contractErg - feeMining - uiSwapFee;
	return { userErg, uiSwapFee };
}

export function applyFeeSell(
	inputErg: bigint,
	feeMining: bigint,
	multiplicator: bigint = 1n
): FeeResult {
	const uiSwapFee = (inputErg * FEE_UI * multiplicator) / (FEE_UI_DENOM - FEE_UI * multiplicator);
	const contractErg = inputErg + feeMining + uiSwapFee;
	return { uiSwapFee, contractErg };
}
