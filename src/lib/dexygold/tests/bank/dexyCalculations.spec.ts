import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const directionBuy = 1n;
const directionSell = -1n;

describe('FreeMintSpec - Full Translation', () => {
	//let mockChain: MockChain;
	const bankFeeNum = 3n; // => 0.5% fee part
	const buybackFeeNum = 2n; // => 0.5% fee part
	//const { feeNumLp, feeDenomLp } = vitestContractConfig;
	const reservesXIn = 1_000_000_000_000n;
	const reservesYIn = 100_000_000n;
	const feeNumLp = 997n;
	const feeDenomLp = 1000n;

	it('lpSwap works sell ERG => buy Dexy', () => {
		const ergInput = 10_000_000n;
		//Direct conversion
		const { amountErg: step1Erg, amountDexy: step1Dexy } = lpSwapInputErg(
			directionSell,
			ergInput,
			reservesXIn,
			reservesYIn,
			feeNumLp,
			feeDenomLp
		);
		//Reversed conversion
		const { amountErg: step2Erg, amountDexy: step2Dexy } = lpSwapInputDexy(
			directionSell,
			step1Dexy, // &
			reservesXIn,
			reservesYIn,
			feeNumLp,
			feeDenomLp
		);

		console.log(ergInput, 'initial');
		console.log(step1Erg, ' erg ', step1Dexy, ' dexy', 'step 1');
		console.log(step2Erg, ' erg ', step2Dexy, ' dexy', 'step 2');
		expect(1).toBe(1);
	});

	it('lpSwap works buy ERG => sell Dexy', () => {
		const ergInput = 10_000_000n;
		//Direct conversion
		const { amountErg: step1Erg, amountDexy: step1Dexy } = lpSwapInputErg(
			directionBuy,
			ergInput,
			reservesXIn,
			reservesYIn,
			feeNumLp,
			feeDenomLp
		);
		//Reversed conversion
		const { amountErg: step2Erg, amountDexy: step2Dexy } = lpSwapInputDexy(
			directionBuy,
			step1Dexy, // &
			reservesXIn,
			reservesYIn,
			feeNumLp,
			feeDenomLp
		);

		console.log(ergInput, 'initial');
		console.log(step1Erg, ' erg ', step1Dexy, ' dexy', 'step 1');
		console.log(step2Erg, ' erg ', step2Dexy, ' dexy', 'step 2');
		expect(1).toBe(1);
	});
});

// Same for FreeMint and ArbitrageMint so called bankMint
function bankMint(
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

function bankMintInpuErg(
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
function bankInput() {} //bankMint + UI Fee
function bankInputErg() {} //bankMintInpuErg + UI Fee

function lpSwapInputErg(
	direction: bigint,
	amountErg: bigint,
	reservesXIn: bigint,
	reservesYIn: bigint,
	feeNumLp: bigint,
	feeDenomLp: bigint
) {
	const rate = Number(reservesYIn) / Number(reservesXIn);
	let amountDexy;
	//
	if (direction == directionSell) {
		//const buyDexy =
		amountDexy =
			BigInt(Math.floor((Number(amountErg) * rate * Number(feeNumLp)) / Number(feeDenomLp))) - 1n; // need to verify -1n
	} else {
		amountDexy = BigInt(
			Math.floor((Number(amountErg + 100n) * (Number(feeDenomLp) * rate)) / Number(feeNumLp)) //Any reason there +100n ?
			//Math.floor((Number(amountErg + 100n) * (Number(feeDenomLp) * rate)) / Number(feeNumLp)) //Any reason there +100n ?
		);
	}
	const buyY =
		BigInt(Math.floor((Number(amountErg) * rate * Number(feeNumLp)) / Number(feeDenomLp))) - 1n;
	return { amountErg, amountDexy }; // as result amountErg, amountDexy
}

function lpSwapInputDexy(
	direction: bigint,
	amountDexy: bigint,
	reservesXIn: bigint,
	reservesYIn: bigint,
	feeNumLp: bigint,
	feeDenomLp: bigint
) {
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

	return { amountErg, amountDexy }; // as result amountErg, amountDexy
}
