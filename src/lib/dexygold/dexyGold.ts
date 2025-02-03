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
		// OLD ONE
		// amountDexy = BigInt(Math.floor((Number(amountErg) * rate * Number(feeNumLp)) / Number(feeDenomLp))); //Round Down //- 1n;

		//amountDexy =< lpYIn* amountErg * 997n / (lpXIn * 1000n + amountErg * 997n)
		amountDexy =
			(reservesYIn * amountErg * feeNumLp) / (reservesXIn * feeDenomLp + amountErg * feeNumLp) - 1n; // =<
	} else {
		// OLD ONE
		// amountDexy = BigInt(
		// 	Math.ceil((Number(amountErg + 100n) * (Number(feeDenomLp) * rate)) / Number(feeNumLp)) //Round UP
		// );
		//directionBuy
		amountDexy =
			(amountErg * reservesYIn * feeDenomLp) / (reservesXIn * feeNumLp - amountErg * feeNumLp) + 1n;
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
		//amountDexy = 1000n;
		amountErg =
			(amountDexy * reservesXIn * feeDenomLp) / (reservesYIn * feeNumLp - amountDexy * feeNumLp) +
			1n; // cause >=?
	} else {
		//amountDexy = 1000n;
		amountErg =
			(reservesXIn * amountDexy * feeNumLp) / (reservesYIn * feeDenomLp + amountDexy * feeNumLp) -
			1n; // cause <=
	}

	// if (direction == directionSell) {
	// 	console.log('we are here');
	// 	amountErg = BigInt(
	// 		Math.floor(Number((amountDexy + 1n) * feeDenomLp) / (rate * Number(feeNumLp)))
	// 	); //- 100n; //- 1n; //Rounded but need to check -1n <==
	// } else {
	// 	//
	// 	amountErg = BigInt(
	// 		Math.ceil((Number(amountDexy) * Number(feeNumLp)) / (Number(feeDenomLp) * rate))
	// 	); //+100n; //Rounded but need to check +1n <==
	// }

	return { amountErg, amountDexy, rate }; // as result amountErg, amountDexy
}

// -------------------------------- TEST AND REWORK --------------------------
// Same for FreeMint and ArbitrageMint so called bankMint
export function bankMintBigInt(
	oracleRateXy: bigint, // oracle x 1_000_000 ???
	oracleDimension: bigint,
	bankFeeNum: bigint,
	buybackFeeNum: bigint,
	feeDenom: bigint,
	contractDexy: bigint
) {
	//const oracleDimension = 1_000_000n;

	const bankRate =
		Number(oracleRateXy * (bankFeeNum + feeDenom)) / Number(feeDenom * oracleDimension);
	const buybackRate = Number(oracleRateXy * buybackFeeNum) / Number(feeDenom * oracleDimension);

	const bankErgsAdded = BigInt(Math.floor(bankRate * Number(contractDexy)));
	const buybackErgsAdded = BigInt(Math.floor(buybackRate * Number(contractDexy)));

	const contractErg = bankErgsAdded + buybackErgsAdded;

	return { contractErg, bankErgsAdded, buybackErgsAdded, bankRate, buybackRate }; // as result contractDexy, contractErg , bankErgsAdded, buybackErgsAdded
}

export function bankMint(
	oracleRateXy: bigint, // oracle x 1_000_000 ???
	scale: bigint,
	bankFeeNum: bigint,
	buybackFeeNum: bigint,
	feeDenom: bigint,
	contractDexy: bigint
) {
	//const scale = 1_000_000n;

	const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / (feeDenom * scale);
	const buybackRate = (oracleRateXy * buybackFeeNum) / (feeDenom * scale);

	const bankErgsAdded = bankRate * contractDexy;
	const buybackErgsAdded = buybackRate * contractDexy;

	const contractErg = bankErgsAdded + buybackErgsAdded;

	return { contractErg, bankErgsAdded, buybackErgsAdded, bankRate, buybackRate }; // as result contractDexy, contractErg , bankErgsAdded, buybackErgsAdded
}

export function bankMintInpuErg(
	oracleRateXy: bigint,
	scale: bigint,
	bankFeeNum: bigint,
	buybackFeeNum: bigint,
	feeDenom: bigint,
	totalErgs: bigint
) {
	const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / scale;
	const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / scale;

	const contractDexy = totalErgs / (bankRate + buybackRate);
	const bankErgsAdded = bankRate * contractDexy;
	const buybackErgsAdded = buybackRate * contractDexy;

	return { contractDexy, bankErgsAdded, buybackErgsAdded, bankRate, buybackRate };
}

//TODO: Add Wrapper with FEE
export function bankInput() {
	// return { contractErg, bankErgsAdded, buybackErgsAdded }; // as result {contractDexy, contractErg , bankErgsAdded, buybackErgsAdded} + {finalPrice , totalFee, ...}
}
//TODO: Add Wrapper with FEE
export function bankInputErg() {}
// -------------------------------- -------------- --------------------------

export function calculateLpMintInputErg(
	contractErg: bigint,
	lpXIn: bigint,
	lpYIn: bigint,
	supplyLpIn: bigint
) {
	const contractLpTokens: bigint = (contractErg * supplyLpIn) / lpXIn;
	const contractDexy = (contractErg * (lpYIn * supplyLpIn)) / (supplyLpIn * lpXIn) + 1n; //roundUp bigInt + low values

	return { contractDexy, contractErg, contractLpTokens };
}
export function calculateLpMintInputDexy(
	contractDexy: bigint,
	lpXIn: bigint,
	lpYIn: bigint,
	supplyLpIn: bigint
) {
	const contractLpTokens: bigint = (contractDexy * supplyLpIn) / lpYIn;
	const contractErg = (contractDexy * supplyLpIn * lpXIn) / (lpYIn * supplyLpIn) + 1n; //RoundUp
	return { contractDexy, contractErg, contractLpTokens };
}
export function calculateLpMintInputSharesUnlocked(
	contractLpTokens: bigint,
	lpXIn: bigint,
	lpYIn: bigint,
	supplyLpIn: bigint
) {
	const contractDexy = (contractLpTokens * lpYIn) / supplyLpIn + 1n; // change to +1n //<==== NEED TO ROUND UP BigNumber.js?
	const contractErg = (contractLpTokens * lpXIn) / supplyLpIn + 1n; // change to +1n //<==== NEED TO ROUND UP BigNumber.js?
	return { contractDexy, contractErg, contractLpTokens };
}

export function calculateLpRedeemInputSharesUnlocked(
	contractLpTokens: bigint,
	lpXIn: bigint,
	lpYIn: bigint,
	supplyLpIn: bigint
) {
	const contractErg = (98n * contractLpTokens * lpXIn) / (100n * supplyLpIn) - 1n;
	const contractDexy = (98n * contractLpTokens * lpYIn) / (100n * supplyLpIn) - 1n;

	return { contractDexy, contractErg, contractLpTokens };
}
export function calculateLpRedeemInputErg(
	contractErg: bigint,
	lpXIn: bigint,
	lpYIn: bigint,
	supplyLpIn: bigint
) {
	let contractLpTokens = (100n * supplyLpIn * contractErg) / (98n * lpXIn);
	const contractDexy = (98n * contractLpTokens * lpYIn) / (100n * supplyLpIn); //- 1n;

	contractLpTokens = contractLpTokens + 1n; // add after calc
	return { contractDexy, contractErg, contractLpTokens };
}
export function calculateLpRedeemInputDexy(
	contractDexy: bigint,
	lpXIn: bigint,
	lpYIn: bigint,
	supplyLpIn: bigint
) {
	let contractLpTokens = (100n * supplyLpIn * contractDexy) / (98n * lpYIn);
	const contractErg = (98n * contractLpTokens * lpXIn) / (100n * supplyLpIn); //- 1n;

	contractLpTokens = contractLpTokens + 1n; // add after calc
	return { contractDexy, contractErg, contractLpTokens };
}
