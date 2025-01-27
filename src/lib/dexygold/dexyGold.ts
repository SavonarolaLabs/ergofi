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

	return { amountErg, amountDexy, rate };
}

export function lpSwapInputDexy(
	direction: bigint,
	amountDexy: bigint,
	reservesXIn: bigint,
	reservesYIn: bigint,
	feeNumLp: bigint,
	feeDenomLp: bigint
): LpDexySwapResult {
	const rate = Number(reservesYIn) / Number(reservesXIn);
	let amountErg;
	// in case amountDexy is OUTPUT
	if (direction == directionSell) {
		amountErg = BigInt(
			Math.ceil(Number((amountDexy + 1n) * feeDenomLp) / (rate * Number(feeNumLp)))
		); //AlreadyRounded
	} else {
		amountErg =
			BigInt(Math.floor((Number(amountDexy) * Number(feeNumLp)) / (Number(feeDenomLp) * rate))) -
			100n; //Any reason there -100n ?
	}

	return { amountErg, amountDexy, rate }; // as result amountErg, amountDexy
}

// -------------------------------- TEST AND REWORK --------------------------
// Same for FreeMint and ArbitrageMint so called bankMint
export function bankMint(
	oracleRateXy: bigint, // oracle x 1_000_000 ???
	oracleDimension: bigint,
	bankFeeNum: bigint,
	buybackFeeNum: bigint,
	feeDenom: bigint,
	contractDexy: bigint
) {
	//const oracleDimension = 1_000_000n;

	const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / oracleDimension;
	const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / oracleDimension;

	const bankErgsAdded = bankRate * contractDexy;
	const buybackErgsAdded = buybackRate * contractDexy;

	const contractErg = bankErgsAdded + buybackErgsAdded;

	return { contractErg, bankErgsAdded, buybackErgsAdded }; // as result contractDexy, contractErg , bankErgsAdded, buybackErgsAdded
}
export function bankMintInpuErg(
	oracleRateXy: bigint, // oracle x 1_000_000 ???
	oracleDimension: bigint,
	bankFeeNum: bigint,
	buybackFeeNum: bigint,
	feeDenom: bigint,
	contractErg: bigint
) {
	//const oracleDimension = 1_000_000n;

	const contractDexy =
		(contractErg * feeDenom * oracleDimension) /
		(oracleRateXy * (bankFeeNum + feeDenom + buybackFeeNum));

	const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / oracleDimension;
	const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / oracleDimension;

	const bankErgsAdded = bankRate * contractDexy;
	const buybackErgsAdded = buybackRate * contractDexy;

	return { contractDexy, bankErgsAdded, buybackErgsAdded }; // as result contractDexy, contractErg , bankErgsAdded, buybackErgsAdded
}

//TODO: Add Wrapper with FEE
export function bankInput() {
	// return { contractErg, bankErgsAdded, buybackErgsAdded }; // as result {contractDexy, contractErg , bankErgsAdded, buybackErgsAdded} + {finalPrice , totalFee, ...}
}
//TODO: Add Wrapper with FEE
export function bankInputErg() {}
// -------------------------------- -------------- --------------------------
