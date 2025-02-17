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
	buyAmountInput: any,
	bankBoxNanoErg: bigint,
	bankBoxCirculatingUsdCent: bigint,
	oraclePriceSigUsdCent: bigint,
	feeMining: bigint
): any {
	const inputAmountERG = new BigNumber(buyAmountInput);

	if (!inputAmountERG.isNaN() && inputAmountERG.gt(0)) {
		const inputAmountNanoERG = BigInt(
			inputAmountERG.multipliedBy('1000000000').integerValue(BigNumber.ROUND_FLOOR).toFixed(0)
		);

		const { contractRate, contractFee, contractUSD, contractErg, uiFeeErg, swapFee, swapRate } =
			calculateInputsUsdErgInErgPrice(
				direction,
				inputAmountNanoERG,
				bankBoxNanoErg,
				bankBoxCirculatingUsdCent,
				oraclePriceSigUsdCent,
				feeMining
			);

		const totalSigUSD = new BigNumber(contractUSD.toString()).dividedBy('100').toFixed(2);
		const finalPrice = new BigNumber(10000000).multipliedBy(swapRate).toFixed(2);
		const totalFee = new BigNumber(swapFee.toString()).dividedBy('1000000000').toFixed(2);
		return { totalSigUSD, finalPrice, totalFee, contractErg, uiFeeErg };
	} else {
		const { contractRate, contractFee, contractUSD, contractErg, uiFeeErg, swapFee, swapRate } =
			calculateInputsUsdErgInErgPrice(
				direction,
				BASE_INPUT_AMOUNT_ERG,
				bankBoxNanoErg,
				bankBoxCirculatingUsdCent,
				oraclePriceSigUsdCent,
				feeMining
			);
		const totalSigUSD = '';
		const finalPrice = new BigNumber(10000000).multipliedBy(swapRate).toFixed(2);
		const totalFee = '';
		return { totalSigUSD, finalPrice, totalFee };
	}
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
	buyTotalInput: any,
	bankBoxNanoErg: bigint,
	bankBoxCirculatingUsdCent: bigint,
	oraclePriceSigUsdCent: bigint,
	feeMining: bigint
): any {
	const totalSigUSD = new BigNumber(buyTotalInput)
		.multipliedBy('100')
		.integerValue(BigNumber.ROUND_CEIL);

	if (!totalSigUSD.isNaN() && totalSigUSD.gt(0)) {
		const { contractRate, feeContract, totalErgoRequired, feeTotal, rateTotal } =
			calculateInputsUsdErgInUsdPrice(
				direction,
				totalSigUSD,
				bankBoxNanoErg,
				bankBoxCirculatingUsdCent,
				oraclePriceSigUsdCent,
				feeMining
			);

		//---------------------------------
		const totalErg = new BigNumber(totalErgoRequired.toString()).dividedBy('1000000000').toFixed(9);
		const finalPrice = new BigNumber(10000000).multipliedBy(rateTotal).toFixed(2);
		const totalFee = new BigNumber(feeTotal.toString()).dividedBy('1000000000').toFixed(2);
		return { totalErg, finalPrice, totalFee };
	} else {
		const { contractRate, feeContract, totalErgoRequired, feeTotal, rateTotal } =
			calculateInputsUsdErgInUsdPrice(
				direction,
				new BigNumber(BASE_INPUT_AMOUNT_USD.toString()),
				bankBoxNanoErg,
				bankBoxCirculatingUsdCent,
				oraclePriceSigUsdCent,
				feeMining
			);
		const totalErg = '';
		const finalPrice = new BigNumber(10000000).multipliedBy(rateTotal).toFixed(2);
		const totalFee = '';
		return { totalErg, finalPrice, totalFee };
	}
}
export function calculateInputsUsdErgInUsdPrice(
	direction: Direction,
	buyTotal: BigNumber,
	bankBoxNanoErg: bigint,
	bankBoxCirculatingUsdCent: bigint,
	oraclePriceSigUsdCent: bigint,
	feeMining: bigint
): any {
	const totalSC = BigInt(buyTotal.toString());

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
		totalSC,
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

	const rateTotal = new BigNumber(totalSC.toString()).dividedBy(totalErgoRequired.toString());
	return { contractRate, feeContract, totalErgoRequired, feeTotal, rateTotal };
}

export function calculateInputsRSVErgInErg(
	direction: Direction,
	buyAmountInput: any,
	bankBoxNanoErg: bigint,
	bankBoxCirculatingUsdCent: bigint,
	bankBoxInCircSigRSV: bigint,
	oraclePriceSigUsdCent: bigint,
	feeMining: bigint
): any {
	const inputAmountERG = new BigNumber(buyAmountInput);
	if (!inputAmountERG.isNaN() && inputAmountERG.gt(0)) {
		const inputAmountNanoERG = BigInt(
			inputAmountERG.multipliedBy('1000000000').integerValue(BigNumber.ROUND_FLOOR).toFixed(0)
		);
		const { contractRate, contractFee, contractRSV, contractErg, uiFeeErg, swapFee, swapRate } =
			calculateInputsRSVErgInErgPrice(
				direction,
				inputAmountNanoERG,
				bankBoxNanoErg,
				bankBoxCirculatingUsdCent,
				bankBoxInCircSigRSV,
				oraclePriceSigUsdCent,
				feeMining
			);

		const totalSigRSV = new BigNumber(contractRSV).toFixed(0);
		const finalPrice = new BigNumber(1000000000).multipliedBy(swapRate).toFixed(0);
		const totalFee = new BigNumber(swapFee.toString()).dividedBy('1000000000').toFixed(2);
		return { totalSigRSV, finalPrice, totalFee, contractErg, uiFeeErg };
	} else {
		const { contractRate, contractFee, contractRSV, contractErg, uiFeeErg, swapFee, swapRate } =
			calculateInputsRSVErgInErgPrice(
				direction,
				BASE_INPUT_AMOUNT_ERG,
				bankBoxNanoErg,
				bankBoxCirculatingUsdCent,
				bankBoxInCircSigRSV,
				oraclePriceSigUsdCent,
				feeMining
			);
		const totalSigRSV = '';
		const finalPrice = new BigNumber(1000000000).multipliedBy(swapRate).toFixed(0);
		const totalFee = '';
		return { totalSigRSV, finalPrice, totalFee };
	}
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
	inputRSV: any,
	bankBoxNanoErg: bigint,
	bankBoxCirculatingUsdCent: bigint,
	bankBoxInCircSigRSV: bigint,
	oraclePriceSigUsdCent: bigint,
	feeMining: bigint
): any {
	const totalRSV = new BigNumber(inputRSV).integerValue(BigNumber.ROUND_CEIL);

	if (!totalRSV.isNaN() && totalRSV.gt(0)) {
		const { contractRate, contractFee, totalErgoRequired, swapFee, swapRate } =
			calculateInputsRSVErgInRSVPrice(
				direction,
				totalRSV,
				bankBoxNanoErg,
				bankBoxCirculatingUsdCent,
				bankBoxInCircSigRSV,
				oraclePriceSigUsdCent,
				feeMining
			);

		const totalErg = new BigNumber(totalErgoRequired.toString()).dividedBy('1000000000').toFixed(9);
		const finalPrice = new BigNumber(1000000000).multipliedBy(swapRate).toFixed(0);
		const totalFee = new BigNumber(swapFee.toString()).dividedBy('1000000000').toFixed(2);
		return { totalErg, finalPrice, totalFee };
	} else {
		const { contractRate, contractFee, totalErgoRequired, swapFee, swapRate } =
			calculateInputsRSVErgInRSVPrice(
				direction,
				new BigNumber(BASE_INPUT_AMOUNT_USD.toString()),
				bankBoxNanoErg,
				bankBoxCirculatingUsdCent,
				bankBoxInCircSigRSV,
				oraclePriceSigUsdCent,
				feeMining
			);
		const totalErg = '';
		const finalPrice = new BigNumber(1000000000).multipliedBy(swapRate).toFixed(0);
		const totalFee = '';
		return { totalErg, finalPrice, totalFee };
	}
}
export function calculateInputsRSVErgInRSVPrice(
	direction: Direction,
	inputRSV: BigNumber,
	bankBoxNanoErg: bigint,
	bankBoxCirculatingUsdCent: bigint,
	bankBoxInCircSigRSV: bigint,
	oraclePriceSigUsdCent: bigint,
	feeMining: bigint
): any {
	const totalRSV = BigInt(inputRSV.toString());

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
		totalRSV,
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

	const swapRate = new BigNumber(totalRSV.toString()).dividedBy(totalErgoRequired.toString());
	return { contractRate, contractFee, totalErgoRequired, swapFee, swapRate };
}

// prettier-ignore
export function calculateAmountAndSwapPrice( 
	anchor: SwapItem,
	swapIntent: SwapIntention,
	sigmaUsdNumbers:SigmaUsdNumbers,
	feeMining: bigint
	): SwapPreview {
	
	const swapTag = getSwapTag(swapIntent, anchor);
	const amount = anchor.amount!;
	
	let swapPreview: SwapPreview;
	console.log(anchor,' inside anchor')
	console.log(swapIntent,' inside swapIntent')

	let calculatedIntent = structuredClone(swapIntent);

	//ERGO_TOKEN_ID
	//SigUSD_TOKEN_ID
	//SigRSV_TOKEN_ID

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
	if (swapTag == 'SigRSV/ERG_ERG'){
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
		new BigNumber(BASE_INPUT_AMOUNT_ERG.toString()),
		bankBoxNanoErg,
		bankBoxCicrulatingUsdCent,
		oraclePriceUsdCent,
		feeMining
	);
	const { finalPrice: bankPriceUsdSell } = calculateInputsUsdErgInErg(
		DIRECTION_SELL,
		new BigNumber(BASE_INPUT_AMOUNT_ERG.toString()),
		bankBoxNanoErg,
		bankBoxCicrulatingUsdCent,
		oraclePriceUsdCent,
		feeMining
	);

	const { finalPrice: bankPriceRsvBuy } = calculateInputsRSVErgInErg(
		DIRECTION_BUY,
		new BigNumber(BASE_INPUT_AMOUNT_ERG.toString()),
		bankBoxNanoErg,
		bankBoxCicrulatingUsdCent,
		bankBoxCirculatingRsv,
		oraclePriceUsdCent,
		feeMining
	);
	const { finalPrice: bankPriceRsvSell } = calculateInputsRSVErgInErg(
		DIRECTION_SELL,
		new BigNumber(BASE_INPUT_AMOUNT_ERG.toString()),
		bankBoxNanoErg,
		bankBoxCicrulatingUsdCent,
		bankBoxCirculatingRsv,
		oraclePriceUsdCent,
		feeMining
	);
	return { bankPriceUsdBuy, bankPriceUsdSell, bankPriceRsvBuy, bankPriceRsvSell };
}
