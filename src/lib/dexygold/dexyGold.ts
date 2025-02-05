import { directionSell, UI_FEE_ADDRESS } from '$lib/api/ergoNode';
import { reverseFee } from '$lib/sigmausd/sigmaUSDAndDexy';
import type { NodeBox } from '$lib/stores/bank.types';
import {
	parseBankArbitrageMintBox,
	parseBankBox,
	parseBuybackBox,
	parseDexyGoldOracleBox,
	parseLpBox
} from '$lib/stores/dexyGoldParser';
import { ErgoUnsignedInput, OutputBuilder, TransactionBuilder } from '@fleet-sdk/core';
import { SInt, SLong } from '@fleet-sdk/serializer';
import { DEXY_GOLD } from './dexyConstants';
import type { EIP12UnsignedTransaction } from '@fleet-sdk/common';

export type LpDexySwapResult = {
	amountErg: bigint;
	amountDexy: bigint;
	rate: number;
};

export type DexyGoldArbitrageInputs = {
	arbMintIn: NodeBox;
	bankIn: NodeBox;
	buybankIn: NodeBox;
	lpIn: NodeBox;
	goldOracle: NodeBox;
	tracking101: NodeBox;
};

// CALC
//--------------Calc LP--------------
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

//--------------Calc Bank--------------
export function calculateBankMintInputDexy(
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
export function calculateBankMintInputErg(
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

// BUILD

export function dexyGoldBankArbitrageInputDexyTx(
	inputDexy: bigint,
	userBase58PK: string,
	height: number,
	feeMining: bigint,
	utxos: NodeBox[],
	arbState: DexyGoldArbitrageInputs
): EIP12UnsignedTransaction {
	const { T_arb, T_buffer_5: T_buffer, bankFeeNum, buybackFeeNum, feeDenom } = DEXY_GOLD;

	const {
		value: arbMintXIn,
		arbitrageMintNFT,
		R4ResetHeight,
		R5AvailableAmount
	} = parseBankArbitrageMintBox(arbState.arbMintIn);
	const {
		value: bankXIn,
		bankNFT,
		dexyAmount: bankYIn,
		dexyTokenId
	} = parseBankBox(arbState.bankIn);
	const {
		value: buybackXIn,
		buybackNFT,
		gortAmount,
		gortTokenId
	} = parseBuybackBox(arbState.buybankIn);
	const { dexyAmount: lpYData, value: lpXData, lpTokenAmount } = parseLpBox(arbState.lpIn);
	const { oraclePoolNFT, R4Rate: oracleRateData } = parseDexyGoldOracleBox(arbState.goldOracle);

	const dataInputs = [arbState.goldOracle, arbState.lpIn, arbState.tracking101];
	const userUtxos = utxos; //<== rename

	const userAddress = userBase58PK; //<== rename
	const userChangeAddress = userAddress; //<== delete after

	let buybackBoxIn = new ErgoUnsignedInput(arbState.buybankIn);
	buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });

	//--------------- Calculations -------------

	//data process:
	const lpRate = lpXData / lpYData; //<===
	const oracleRate = oracleRateData / 1_000_000n;

	// FEE ------------------------------
	const dexyContract = inputDexy; //<===

	const { contractErg, bankErgsAdded, buybackErgsAdded, bankRate, buybackRate } =
		calculateBankMintInputDexy(oracleRate, 1n, bankFeeNum, buybackFeeNum, feeDenom, dexyContract);
	const oracleRateWithFee = bankRate + buybackRate;

	// FEE  ------------------------------
	//Part 0 - use Fee Reversed
	const { inputErg, uiSwapFee } = reverseFee(contractErg, feeMining);

	const maxAllowedIfReset = (lpXData - oracleRateWithFee * lpYData) / oracleRateWithFee; //arb
	//maxAllowedIfReset = lpYData / 100n; //free

	const bankXOut = bankXIn + bankErgsAdded;
	const bankYOut = bankYIn - dexyContract;
	const buybackXOut = buybackXIn + buybackErgsAdded;

	//freeMintXOut = freeMintXIn;
	const arbMintXOut = arbMintXIn;

	const { resetHeightOut, remainingDexyOut } = calculateResetAndAmountArbMint(
		height,
		R4ResetHeight,
		R5AvailableAmount,
		dexyContract,
		maxAllowedIfReset,
		T_arb,
		T_buffer
	);

	//------------------------------
	const bankOut = new OutputBuilder(bankXOut, DEXY_GOLD.bankErgoTree).addTokens([
		{ tokenId: bankNFT, amount: 1n },
		{ tokenId: dexyTokenId, amount: bankYOut }
	]);

	const arbMintOut = new OutputBuilder(arbMintXOut, DEXY_GOLD.arbitrageMintErgoTree)
		.addTokens([{ tokenId: arbitrageMintNFT, amount: 1n }])
		.setAdditionalRegisters({
			R4: SInt(Number(resetHeightOut)).toHex(),
			R5: SLong(BigInt(remainingDexyOut)).toHex()
		});

	const buybackOut = new OutputBuilder(buybackXOut, DEXY_GOLD.buybackErgoTree).addTokens([
		{ tokenId: buybackNFT, amount: 1n },
		{ tokenId: gortTokenId, amount: gortAmount }
	]);

	const swapFeeBox = new OutputBuilder(uiSwapFee, UI_FEE_ADDRESS);

	const unsignedTx = new TransactionBuilder(height)
		.from([arbState.arbMintIn, arbState.bankIn, buybackBoxIn, ...userUtxos], {
			ensureInclusion: true
		})
		.withDataFrom(dataInputs)
		.to(arbMintOut)
		.to(bankOut)
		.to(buybackOut)
		.to(swapFeeBox)
		.payFee(feeMining)
		.sendChangeTo(userChangeAddress)
		.build()
		.toEIP12Object();

	return unsignedTx;
}
export function calculateResetAndAmountArbMint(
	height: number,
	resetHeight: bigint,
	availableAmount: bigint,
	dexyMinted: bigint,
	maxAllowedIfReset: bigint,
	tArb: bigint,
	tBuffer: bigint
) {
	const isCounterReset = BigInt(height) > resetHeight;

	if (isCounterReset) {
		const resetHeightOut = height + Number(tArb + tBuffer - 1n);
		const remainingDexyOut = maxAllowedIfReset - dexyMinted;
		return { isCounterReset, resetHeightOut, remainingDexyOut };
	} else {
		const resetHeightOut = resetHeight;
		const remainingDexyOut = availableAmount - dexyMinted;
		return { isCounterReset, resetHeightOut, remainingDexyOut };
	}
}
