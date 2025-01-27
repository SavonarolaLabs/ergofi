import { directionSell } from '$lib/api/ergoNode';

export type LpDexySwapResult = {
	amountErg: bigint;
	amountDexy: bigint;
	rate: number;
};

export function lpSwapInputErg(
	direction: bigint,
	amountErg: bigint,
	reservesXIn: bigint,
	reservesYIn: bigint,
	feeNumLp: bigint,
	feeDenomLp: bigint
): LpDexySwapResult {
	const rate = Number(reservesYIn) / Number(reservesXIn);
	let amountDexy: bigint;

	if (direction === directionSell) {
		amountDexy =
			BigInt(Math.floor((Number(amountErg) * rate * Number(feeNumLp)) / Number(feeDenomLp))) - 1n;
	} else {
		amountDexy = BigInt(
			Math.floor((Number(amountErg + 100n) * (Number(feeDenomLp) * rate)) / Number(feeNumLp))
		);
	}

	const buyY =
		BigInt(Math.floor((Number(amountErg) * rate * Number(feeNumLp)) / Number(feeDenomLp))) - 1n;

	return { amountErg, amountDexy, rate };
}
