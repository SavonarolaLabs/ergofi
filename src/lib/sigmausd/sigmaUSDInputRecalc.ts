import BigNumber from 'bignumber.js';
import {
	applyFee,
	applyFeeSell,
	reverseFee,
	reverseFeeSell,
	type Direction
} from './sigmaUSDAndDexy';
import {
	calculateBankRateRSVInputERG,
	calculateBankRateRSVInputRSV,
	calculateBankRateUSDInputERG,
	calculateBankRateUSDInputUSD
} from './sigmaUSDMath';
import { DIRECTION_BUY, DIRECTION_SELL } from '$lib/api/ergoNode';
import type { SigmaUsdNumbers } from '$lib/stores/bank';
import {
	getSwapTag,
	getSwapTagAndAmount,
	setAmount,
	type SwapIntention,
	type SwapItem,
	type SwapPreview
} from '$lib/swapIntention';
import { ERGO_TOKEN_ID, SigRSV_TOKEN_ID, SigUSD_TOKEN_ID } from '$lib/stores/ergoTokens';

export const BASE_INPUT_AMOUNT_ERG = 1_000_000_000n; //1 ERG
export const BASE_INPUT_AMOUNT_USD = 100_00n; //100 USD
export const BASE_INPUT_AMOUNT_RSV = 10_000n; //10k RSV

export function calculateInputsUsdErgInErg(
	direction: Direction,
	buyAmountInput: bigint,
	bankBoxNanoErg: bigint,
	bankBoxCirculatingUsdCent: bigint,
	oraclePriceSigUsdCent: bigint,
	feeMining: bigint
): any {
	const { contractRate, contractFee, contractUSD, contractErg, uiFeeErg, swapFee, swapRate } =
		calculateInputsUsdErgInErgPrice(
			direction,
			buyAmountInput,
			bankBoxNanoErg,
			bankBoxCirculatingUsdCent,
			oraclePriceSigUsdCent,
			feeMining
		);
	return {
		totalSigUSD: contractUSD,
		finalPrice: swapRate,
		totalFee: swapFee,
		contractErg,
		uiFeeErg
	};
}
export function calculateInputsUsdErgInErgPrice(
	direction: Direction,
	inputErg: bigint,
	bankBoxNanoErg: bigint,
	bankBoxCirculatingUsdCent: bigint,
	oraclePriceSigUsdCent: bigint,
	feeMining: bigint
): any {
	let uiFeeErg: bigint;
	let contractErg: bigint;

	if (direction === 1n) {
		({ uiSwapFee: uiFeeErg, contractErg } = applyFee(inputErg, feeMining));
	} else {
		({ uiSwapFee: uiFeeErg, contractErg } = applyFeeSell(inputErg, feeMining));
	}

	let { fee: contractFee, requestSC: contractUSD } = calculateBankRateUSDInputERG(
		bankBoxNanoErg,
		bankBoxCirculatingUsdCent,
		oraclePriceSigUsdCent,
		contractErg,
		direction
	);

	if (direction == -1n) {
		contractUSD = contractUSD + 1n;
	}

	const { contractRate, bcDeltaExpectedWithFee: contractErgCompare } = calculateBankRateUSDInputUSD(
		bankBoxNanoErg,
		bankBoxCirculatingUsdCent,
		oraclePriceSigUsdCent,
		contractUSD,
		direction
	);

	if (direction == -1n) {
		if (contractErg < contractErgCompare) {
			uiFeeErg = uiFeeErg + (contractErgCompare - contractErg); // Right
		}
	}

	const swapFee = contractFee + feeMining + uiFeeErg;
	const swapRate = new BigNumber(contractUSD.toString()).dividedBy(inputErg.toString());

	return {
		contractRate,
		contractFee,
		contractUSD,
		contractErg,
		uiFeeErg,
		swapFee, //totalFee
		swapRate //totalRate
	};
}

export function calculateInputsUsdErgInUsd(
	direction: Direction,
	buyTotalInput: bigint,
	bankBoxNanoErg: bigint,
	bankBoxCirculatingUsdCent: bigint,
	oraclePriceSigUsdCent: bigint,
	feeMining: bigint
): any {
	const { contractRate, feeContract, totalErgoRequired, feeTotal, rateTotal } =
		calculateInputsUsdErgInUsdPrice(
			direction,
			buyTotalInput,
			bankBoxNanoErg,
			bankBoxCirculatingUsdCent,
			oraclePriceSigUsdCent,
			feeMining
		);

	return { totalErg: totalErgoRequired, finalPrice: rateTotal, totalFee: feeTotal };
}
export function calculateInputsUsdErgInUsdPrice(
	direction: Direction,
	buyTotal: bigint,
	bankBoxNanoErg: bigint,
	bankBoxCirculatingUsdCent: bigint,
	oraclePriceSigUsdCent: bigint,
	feeMining: bigint
): any {
	let uiFeeErg: bigint;
	let totalErgoRequired: bigint;

	const {
		contractRate,
		fee: feeContract,
		bcDeltaExpectedWithFee: contractErgoRequired
	} = calculateBankRateUSDInputUSD(
		bankBoxNanoErg,
		bankBoxCirculatingUsdCent,
		oraclePriceSigUsdCent,
		buyTotal,
		direction
	);
	if (direction === 1n) {
		({ inputErg: totalErgoRequired, uiSwapFee: uiFeeErg } = reverseFee(
			contractErgoRequired,
			feeMining
		));
	} else {
		({ userErg: totalErgoRequired, uiSwapFee: uiFeeErg } = reverseFeeSell(
			contractErgoRequired,
			feeMining
		));
	}
	const feeTotal = feeContract + feeMining + uiFeeErg;

	const rateTotal = new BigNumber(buyTotal.toString()).dividedBy(totalErgoRequired.toString());
	return { contractRate, feeContract, totalErgoRequired, feeTotal, rateTotal };
}

export function calculateInputsRSVErgInErg(
	direction: Direction,
	buyAmountInput: bigint,
	bankBoxNanoErg: bigint,
	bankBoxCirculatingUsdCent: bigint,
	bankBoxInCircSigRSV: bigint,
	oraclePriceSigUsdCent: bigint,
	feeMining: bigint
): any {
	const { contractRate, contractFee, contractRSV, contractErg, uiFeeErg, swapFee, swapRate } =
		calculateInputsRSVErgInErgPrice(
			direction,
			buyAmountInput,
			bankBoxNanoErg,
			bankBoxCirculatingUsdCent,
			bankBoxInCircSigRSV,
			oraclePriceSigUsdCent,
			feeMining
		);

	return {
		totalSigRSV: contractRSV,
		finalPrice: swapRate,
		totalFee: swapFee,
		contractErg,
		uiFeeErg
	};
}
export function calculateInputsRSVErgInErgPrice(
	direction: Direction,
	inputErg: bigint,
	bankBoxNanoErg: bigint,
	bankBoxCirculatingUsdCent: bigint,
	bankBoxInCircSigRSV: bigint,
	oraclePriceSigUsdCent: bigint,
	feeMining: bigint
): any {
	let uiFeeErg: bigint;
	let contractErg: bigint;

	if (direction === 1n) {
		//f5
		({ uiSwapFee: uiFeeErg, contractErg } = applyFee(inputErg, feeMining));
	} else {
		//f8
		({ uiSwapFee: uiFeeErg, contractErg } = applyFeeSell(inputErg, feeMining));
	}

	let { fee: contractFee, requestRSV: contractRSV } = calculateBankRateRSVInputERG(
		bankBoxNanoErg,
		bankBoxCirculatingUsdCent,
		bankBoxInCircSigRSV,
		oraclePriceSigUsdCent,
		contractErg,
		direction
	);

	if (direction == -1n) {
		contractRSV = contractRSV + 1n;
	}

	const { contractRate, bcDeltaExpectedWithFee: contractErgCompare } = calculateBankRateRSVInputRSV(
		bankBoxNanoErg,
		bankBoxCirculatingUsdCent,
		bankBoxInCircSigRSV,
		oraclePriceSigUsdCent,
		contractRSV,
		direction
	);

	if (direction == 1n) {
		if (contractErg > contractErgCompare) uiFeeErg = uiFeeErg + (-contractErgCompare + contractErg);
	}

	if (direction == -1n) {
		if (contractErg < contractErgCompare) {
			uiFeeErg = uiFeeErg + (contractErgCompare - contractErg); // Right
		}
	}

	const swapFee = contractFee + feeMining + uiFeeErg;
	const swapRate = new BigNumber(contractRSV.toString()).dividedBy(inputErg.toString());

	return {
		contractRate,
		contractFee,
		contractRSV,
		contractErg,
		uiFeeErg,
		swapFee, //totalFee
		swapRate //totalRate
	};
}

export function calculateInputsRSVErgInRSV(
	direction: Direction,
	inputRSV: bigint,
	bankBoxNanoErg: bigint,
	bankBoxCirculatingUsdCent: bigint,
	bankBoxInCircSigRSV: bigint,
	oraclePriceSigUsdCent: bigint,
	feeMining: bigint
): any {
	const { contractRate, contractFee, totalErgoRequired, swapFee, swapRate } =
		calculateInputsRSVErgInRSVPrice(
			direction,
			inputRSV,
			bankBoxNanoErg,
			bankBoxCirculatingUsdCent,
			bankBoxInCircSigRSV,
			oraclePriceSigUsdCent,
			feeMining
		);

	return { totalErg: totalErgoRequired, finalPrice: swapRate, totalFee: swapFee };
}
export function calculateInputsRSVErgInRSVPrice(
	direction: Direction,
	inputRSV: bigint,
	bankBoxNanoErg: bigint,
	bankBoxCirculatingUsdCent: bigint,
	bankBoxInCircSigRSV: bigint,
	oraclePriceSigUsdCent: bigint,
	feeMining: bigint
): any {
	let uiFeeErg: bigint;
	let totalErgoRequired: bigint;

	const {
		contractRate,
		fee: contractFee,
		bcDeltaExpectedWithFee: contractErgoRequired
	} = calculateBankRateRSVInputRSV(
		bankBoxNanoErg,
		bankBoxCirculatingUsdCent,
		bankBoxInCircSigRSV,
		oraclePriceSigUsdCent,
		inputRSV,
		direction
	);

	if (direction === 1n) {
		({ inputErg: totalErgoRequired, uiSwapFee: uiFeeErg } = reverseFee(
			contractErgoRequired,
			feeMining
		));
	} else {
		({ userErg: totalErgoRequired, uiSwapFee: uiFeeErg } = reverseFeeSell(
			contractErgoRequired,
			feeMining
		));
	}
	const swapFee = contractFee + feeMining + uiFeeErg;

	const swapRate = new BigNumber(inputRSV.toString()).dividedBy(totalErgoRequired.toString());
	return { contractRate, contractFee, totalErgoRequired, swapFee, swapRate };
}

// prettier-ignore
export function calculateAmountAndSwapPrice( 
	swapIntent: SwapIntention,
	sigmaUsdNumbers:SigmaUsdNumbers,
	feeMining: bigint
	): SwapPreview {
	const { swapTag, amount } = getSwapTagAndAmount(swapIntent);
	
	let swapPreview: SwapPreview;
	let calculatedIntent = structuredClone(swapIntent);

	if (swapTag == 'ERG_ERG/SIGUSD'){		
		const { totalSigUSD: newAmount, finalPrice: price } = calculateInputsUsdErgInErg(DIRECTION_BUY, amount, sigmaUsdNumbers.inErg, sigmaUsdNumbers.inCircSigUSD, sigmaUsdNumbers.oraclePrice, feeMining);
		setAmount(calculatedIntent, SigUSD_TOKEN_ID, newAmount);
		swapPreview = { calculatedIntent, price };
		console.log({ swapPreview });
	}
	if (swapTag == 'ERG_ERG/SIGRSV'){		
		const { totalSigRSV: newAmount, finalPrice: price } = calculateInputsRSVErgInErg(DIRECTION_BUY, amount, sigmaUsdNumbers.inErg, sigmaUsdNumbers.inCircSigUSD, sigmaUsdNumbers.inCircSigRSV, sigmaUsdNumbers.oraclePrice, feeMining);
		setAmount(calculatedIntent, SigRSV_TOKEN_ID, newAmount);
		swapPreview = { calculatedIntent, price };
		console.log({ swapPreview });	
	}
	if (swapTag == 'SIGUSD_SIGUSD/ERG'){
		const { totalErg:    newAmount, finalPrice: price } = calculateInputsUsdErgInUsd(DIRECTION_SELL, amount, sigmaUsdNumbers.inErg, sigmaUsdNumbers.inCircSigUSD, sigmaUsdNumbers.oraclePrice, feeMining);
		setAmount(calculatedIntent, ERGO_TOKEN_ID, newAmount);
		swapPreview = { calculatedIntent, price };
		console.log({ swapPreview });	
	}
	if (swapTag == 'SIGRSV_SIGRSV/ERG'){
		const { totalErg:    newAmount, finalPrice: price } = calculateInputsRSVErgInRSV(DIRECTION_SELL, amount, sigmaUsdNumbers.inErg, sigmaUsdNumbers.inCircSigUSD, sigmaUsdNumbers.inCircSigRSV, sigmaUsdNumbers.oraclePrice, feeMining);
		setAmount(calculatedIntent, ERGO_TOKEN_ID, newAmount);
		swapPreview = { calculatedIntent, price };
		console.log({ swapPreview });	
	}
	if (swapTag == 'ERG/SIGUSD_SIGUSD'){
		const { totalErg:  newAmount, finalPrice: price } = calculateInputsUsdErgInUsd(DIRECTION_BUY, amount, sigmaUsdNumbers.inErg, sigmaUsdNumbers.inCircSigUSD, sigmaUsdNumbers.oraclePrice, feeMining);
		setAmount(calculatedIntent, ERGO_TOKEN_ID, newAmount);
		swapPreview = { calculatedIntent, price };
		console.log({ swapPreview });	
	}
	if (swapTag == 'ERG/SIGRSV_SIGRSV'){
		const { totalErg:   newAmount, finalPrice: price } = calculateInputsRSVErgInRSV(DIRECTION_BUY, amount, sigmaUsdNumbers.inErg, sigmaUsdNumbers.inCircSigUSD, sigmaUsdNumbers.inCircSigRSV, sigmaUsdNumbers.oraclePrice, feeMining);
		setAmount(calculatedIntent, ERGO_TOKEN_ID, newAmount);
		swapPreview = { calculatedIntent, price };
		console.log({ swapPreview });	
	}
	if (swapTag == 'SIGUSD/ERG_ERG'){
		const { totalSigUSD:newAmount, finalPrice: price } = calculateInputsUsdErgInErg(DIRECTION_SELL, amount, sigmaUsdNumbers.inErg, sigmaUsdNumbers.inCircSigUSD, sigmaUsdNumbers.oraclePrice, feeMining);
		setAmount(calculatedIntent, SigUSD_TOKEN_ID, newAmount);
		swapPreview = { calculatedIntent, price };
		console.log({ swapPreview });
	}
	if (swapTag == 'SIGRSV/ERG_ERG'){
		const { totalSigRSV:newAmount, finalPrice: price } = calculateInputsRSVErgInErg(DIRECTION_SELL, amount, sigmaUsdNumbers.inErg, sigmaUsdNumbers.inCircSigUSD, sigmaUsdNumbers.inCircSigRSV, sigmaUsdNumbers.oraclePrice, feeMining);
		setAmount(calculatedIntent, SigRSV_TOKEN_ID, newAmount);
		swapPreview = { calculatedIntent, price };
		console.log({ swapPreview });		
	}
	// @ts-ignore
	return swapPreview;
}

export function calculateBankPrices(
	bankBoxNanoErg: bigint,
	bankBoxCicrulatingUsdCent: bigint,
	bankBoxCirculatingRsv: bigint,
	oraclePriceUsdCent: bigint,
	feeMining: bigint
) {
	const { finalPrice: bankPriceUsdBuy } = calculateInputsUsdErgInErg(
		DIRECTION_BUY,
		BASE_INPUT_AMOUNT_ERG,
		bankBoxNanoErg,
		bankBoxCicrulatingUsdCent,
		oraclePriceUsdCent,
		feeMining
	);
	const { finalPrice: bankPriceUsdSell } = calculateInputsUsdErgInErg(
		DIRECTION_SELL,
		BASE_INPUT_AMOUNT_ERG,
		bankBoxNanoErg,
		bankBoxCicrulatingUsdCent,
		oraclePriceUsdCent,
		feeMining
	);

	const { finalPrice: bankPriceRsvBuy } = calculateInputsRSVErgInErg(
		DIRECTION_BUY,
		BASE_INPUT_AMOUNT_ERG,
		bankBoxNanoErg,
		bankBoxCicrulatingUsdCent,
		bankBoxCirculatingRsv,
		oraclePriceUsdCent,
		feeMining
	);
	const { finalPrice: bankPriceRsvSell } = calculateInputsRSVErgInErg(
		DIRECTION_SELL,
		BASE_INPUT_AMOUNT_ERG,
		bankBoxNanoErg,
		bankBoxCicrulatingUsdCent,
		bankBoxCirculatingRsv,
		oraclePriceUsdCent,
		feeMining
	);
	return { bankPriceUsdBuy, bankPriceUsdSell, bankPriceRsvBuy, bankPriceRsvSell };
}
