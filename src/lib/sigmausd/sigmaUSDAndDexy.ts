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
	multiplicator: bigint = 1n,
	multiplicatorDenom: bigint = 1n
): FeeResult {
	const uiSwapFee = (inputErg * FEE_UI * multiplicator) / FEE_UI_DENOM / multiplicatorDenom;
	const contractErg = inputErg - feeMining - uiSwapFee;
	return { uiSwapFee, contractErg };
}
export function reverseFee(
	contractErg: bigint,
	feeMining: bigint,
	multiplicator: bigint = 1n,
	multiplicatorDenom: bigint = 1n
): ReverseFeeResult {
	const uiSwapFee =
		(contractErg * FEE_UI * multiplicator) /
		(FEE_UI_DENOM - FEE_UI * multiplicator) /
		multiplicatorDenom;
	const inputErg = contractErg + feeMining + uiSwapFee;
	return { inputErg, uiSwapFee };
}

export function reverseFeeSell(
	contractErg: bigint,
	feeMining: bigint,
	multiplicator: bigint = 1n,
	multiplicatorDenom: bigint = 1n
): ReverseFeeSellResult {
	const uiSwapFee = (contractErg * FEE_UI * multiplicator) / FEE_UI_DENOM / multiplicatorDenom;
	const userErg = contractErg - feeMining - uiSwapFee;
	return { userErg, uiSwapFee };
}
export function applyFeeSell(
	inputErg: bigint,
	feeMining: bigint,
	multiplicator: bigint = 1n,
	multiplicatorDenom: bigint = 1n
): FeeResult {
	const uiSwapFee =
		(inputErg * FEE_UI * multiplicator) /
		(FEE_UI_DENOM - FEE_UI * multiplicator) /
		multiplicatorDenom;
	const contractErg = inputErg + feeMining + uiSwapFee;
	return { uiSwapFee, contractErg };
}

export function feeErg() {
	//2 options:
	// apply fee before
	//	// if Input ERG
	//	// 		if From
	//	// 		else To
	//
	// apply fee after
	//	// if Input TOKEN
	//	// 		if From
	//	// 		else To
}

export function feeTokensAndErgForward(
	inputErg,
	inputTokens,
	feeMining,
	multiplicatorErg: bigint = 1n,
	multiplicatorDenomErg: bigint = 1n,
	multiplicatorTokens: bigint = 1n,
	multiplicatorDenomTokens: bigint = 1n
) {
	let uiSwapFee = {};

	// Logic: input ERG
	// apply fee before

	const input = 'ERG';

	const { contractErg, uiSwapFeeErg } = applyFeeErgForward(
		inputErg,
		feeMining,
		multiplicatorErg,
		multiplicatorDenomErg
	);

	const { contractInputTokens, uiSwapFeeInputTokens } = applyFeeTokensForward(
		inputTokens,
		multiplicatorTokens,
		multiplicatorDenomTokens
	);

	return { contractErg, uiSwapFeeErg, contractInputTokens, uiSwapFeeInputTokens };
}

function applyFeeErgForward(
	inputErg: bigint,
	feeMining: bigint,
	multiplicator: bigint = 1n,
	multiplicatorDenom: bigint = 1n
) {
	const minimalErgFee = 100_000n; // <== To Change? Global const?
	let uiSwapFeeErg = forwardFee(inputErg, multiplicator, multiplicatorDenom);
	uiSwapFeeErg = uiSwapFeeErg < minimalErgFee ? minimalErgFee : uiSwapFeeErg;
	const contractErg = inputErg - feeMining - uiSwapFeeErg;
	return { contractErg, uiSwapFeeErg };
}

function applyFeeTokensForward(
	inputTokens: any[],
	multiplicator: bigint = 1n,
	multiplicatorDenom: bigint = 1n
) {
	const inputTokensWithFee = inputTokens.map((i) => {
		const feeАmount = forwardFee(i.amount, multiplicator, multiplicatorDenom);
		return {
			tokenId: i.tokenId,
			amount: i.amount - feeАmount,
			feeАmount: feeАmount
		};
	});

	const contractInputTokens = inputTokensWithFee
		.filter((i) => i.amount)
		.map((i) => {
			return {
				tokendId: i.tokenId,
				amount: i.amount
			};
		});

	const uiSwapFeeInputTokens = inputTokensWithFee
		.filter((i) => i.feeАmount)
		.map((i) => {
			return {
				tokendId: i.tokenId,
				amount: i.feeАmount
			};
		});

	return { contractInputTokens, uiSwapFeeInputTokens };
}

function applyFeeErgBackward(
	inputErg: bigint,
	feeMining: bigint,
	multiplicator: bigint = 1n,
	multiplicatorDenom: bigint = 1n
) {
	const minimalErgFee = 100_000n; // <== To Change? Global const?
	let uiSwapFeeErg = backwardFee(inputErg, multiplicator, multiplicatorDenom);
	uiSwapFeeErg = uiSwapFeeErg < minimalErgFee ? minimalErgFee : uiSwapFeeErg;
	const contractErg = inputErg - feeMining - uiSwapFeeErg;
	return { contractErg, uiSwapFeeErg };
}

function applyFeeTokensBackward(
	inputTokens: any[],
	multiplicator: bigint = 1n,
	multiplicatorDenom: bigint = 1n
) {
	const inputTokensWithFee = inputTokens.map((i) => {
		const feeАmount = backwardFee(i.amount, multiplicator, multiplicatorDenom);
		return {
			tokenId: i.tokenId,
			amount: i.amount - feeАmount,
			feeАmount: feeАmount
		};
	});

	const contractInputTokens = inputTokensWithFee
		.filter((i) => i.amount)
		.map((i) => {
			return {
				tokendId: i.tokenId,
				amount: i.amount
			};
		});

	const uiSwapFeeInputTokens = inputTokensWithFee
		.filter((i) => i.feeАmount)
		.map((i) => {
			return {
				tokendId: i.tokenId,
				amount: i.feeАmount
			};
		});

	return { contractInputTokens, uiSwapFeeInputTokens };
}

//prettier-ignore
function forwardFee(
	amount: bigint,
	multiplicator: bigint = 1n,
	multiplicatorDenom: bigint = 1n
) {
	return (amount * FEE_UI * multiplicator) / FEE_UI_DENOM / multiplicatorDenom;
}
//prettier-ignore
function backwardFee(
	amount: bigint,
	multiplicator: bigint = 1n,
	multiplicatorDenom: bigint = 1n
) {
	return (amount * FEE_UI * multiplicator) / (FEE_UI_DENOM - FEE_UI * multiplicator) /multiplicatorDenom;
}
