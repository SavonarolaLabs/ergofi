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

export const BASE_INPUT_AMOUNT_ERG = 1n; //1 ERG
export const BASE_INPUT_AMOUNT_USD = 100_00n; //100 USD
export const BASE_INPUT_AMOUNT_RSV = 10_000n; //10k RSV

export function calculateInputsUsdErgInErg(
	direction: Direction,
	buyAmountInput: any,
	bankBoxInNanoErg: bigint,
	bankBoxInCircSigUsdInCent: bigint,
	oraclePriceSigUsd: bigint,
	feeMining: bigint
): any {
	let inputAmountERG = new BigNumber(buyAmountInput);
	if (inputAmountERG.isNaN() || !inputAmountERG.gt(0)) {
		inputAmountERG = new BigNumber(BASE_INPUT_AMOUNT_ERG.toString());
	}
	const { contractRate, contractFee, contractUSD, contractErg, uiFeeErg, swapFee, swapRate } =
		calculateInputsUsdErgInErgPrice(
			direction,
			inputAmountERG,
			bankBoxInNanoErg,
			bankBoxInCircSigUsdInCent,
			oraclePriceSigUsd,
			feeMining
		);

	const totalSigUSD = new BigNumber(contractUSD.toString()).dividedBy('100').toFixed(2);
	const finalPrice = new BigNumber(10000000).multipliedBy(swapRate).toFixed(2);
	const totalFee = new BigNumber(swapFee.toString()).dividedBy('1000000000').toFixed(2);
	return { totalSigUSD, finalPrice, totalFee, contractErg, uiFeeErg };
}
export function calculateInputsUsdErgInErgPrice(
	direction: Direction,
	buyAmount: BigNumber,
	bankBoxInNanoErg: bigint,
	bankBoxInCircSigUsdInCent: bigint,
	oraclePriceSigUsd: bigint,
	feeMining: bigint
): any {
	const inputAmountNanoERG = buyAmount
		.multipliedBy('1000000000')
		.integerValue(BigNumber.ROUND_FLOOR)
		.toFixed(0);
	const inputErg = BigInt(inputAmountNanoERG);

	let uiFeeErg: bigint;
	let contractErg: bigint;

	if (direction === 1n) {
		({ uiSwapFee: uiFeeErg, contractErg } = applyFee(inputErg, feeMining));
	} else {
		({ uiSwapFee: uiFeeErg, contractErg } = applyFeeSell(inputErg, feeMining));
	}

	let { fee: contractFee, requestSC: contractUSD } = calculateBankRateUSDInputERG(
		bankBoxInNanoErg,
		bankBoxInCircSigUsdInCent,
		oraclePriceSigUsd,
		contractErg,
		direction
	);

	if (direction == -1n) {
		contractUSD = contractUSD + 1n;
	}

	const { contractRate, bcDeltaExpectedWithFee: contractErgCompare } = calculateBankRateUSDInputUSD(
		bankBoxInNanoErg,
		bankBoxInCircSigUsdInCent,
		oraclePriceSigUsd,
		contractUSD,
		direction
	);

	if (direction == -1n) {
		if (contractErg < contractErgCompare) {
			uiFeeErg = uiFeeErg + (contractErgCompare - contractErg); // Right
		}
	}

	const swapFee = contractFee + feeMining + uiFeeErg;
	const swapRate = new BigNumber(contractUSD.toString()).dividedBy(inputAmountNanoERG.toString());

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
	bankBoxInNanoErg: bigint,
	bankBoxInCircSigUsdInCent: bigint,
	oraclePriceSigUsd: bigint,
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
				bankBoxInNanoErg,
				bankBoxInCircSigUsdInCent,
				oraclePriceSigUsd,
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
				bankBoxInNanoErg,
				bankBoxInCircSigUsdInCent,
				oraclePriceSigUsd,
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
	bankBoxInNanoErg: bigint,
	bankBoxInCircSigUsdInCent: bigint,
	oraclePriceSigUsd: bigint,
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
		bankBoxInNanoErg,
		bankBoxInCircSigUsdInCent,
		oraclePriceSigUsd,
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
	bankBoxInNanoErg: bigint,
	bankBoxInCircSigUsdInCent: bigint,
	bankBoxInCircSigRSV: bigint,
	oraclePriceSigUsd: bigint,
	feeMining: bigint
): any {
	const inputAmountERG = new BigNumber(buyAmountInput);
	if (!inputAmountERG.isNaN() && inputAmountERG.gt(0)) {
		const { contractRate, contractFee, contractRSV, contractErg, uiFeeErg, swapFee, swapRate } =
			calculateInputsRSVErgInErgPrice(
				direction,
				inputAmountERG,
				bankBoxInNanoErg,
				bankBoxInCircSigUsdInCent,
				bankBoxInCircSigRSV,
				oraclePriceSigUsd,
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
				new BigNumber(BASE_INPUT_AMOUNT_ERG.toString()),
				bankBoxInNanoErg,
				bankBoxInCircSigUsdInCent,
				bankBoxInCircSigRSV,
				oraclePriceSigUsd,
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
	buyAmount: BigNumber,
	bankBoxInNanoErg: bigint,
	bankBoxInCircSigUsdInCent: bigint,
	bankBoxInCircSigRSV: bigint,
	oraclePriceSigUsd: bigint,
	feeMining: bigint
): any {
	const inputAmountNanoERG = buyAmount
		.multipliedBy('1000000000')
		.integerValue(BigNumber.ROUND_FLOOR)
		.toFixed(0);
	const inputErg = BigInt(inputAmountNanoERG);

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
		bankBoxInNanoErg,
		bankBoxInCircSigUsdInCent,
		bankBoxInCircSigRSV,
		oraclePriceSigUsd,
		contractErg,
		direction
	);

	if (direction == -1n) {
		contractRSV = contractRSV + 1n;
	}

	const { contractRate, bcDeltaExpectedWithFee: contractErgCompare } = calculateBankRateRSVInputRSV(
		bankBoxInNanoErg,
		bankBoxInCircSigUsdInCent,
		bankBoxInCircSigRSV,
		oraclePriceSigUsd,
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
	const swapRate = new BigNumber(contractRSV.toString()).dividedBy(inputAmountNanoERG.toString());

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
	bankBoxInNanoErg: bigint,
	bankBoxInCircSigUsdInCent: bigint,
	bankBoxInCircSigRSV: bigint,
	oraclePriceSigUsd: bigint,
	feeMining: bigint
): any {
	const totalRSV = new BigNumber(inputRSV).integerValue(BigNumber.ROUND_CEIL);

	if (!totalRSV.isNaN() && totalRSV.gt(0)) {
		const { contractRate, contractFee, totalErgoRequired, swapFee, swapRate } =
			calculateInputsRSVErgInRSVPrice(
				direction,
				totalRSV,
				bankBoxInNanoErg,
				bankBoxInCircSigUsdInCent,
				bankBoxInCircSigRSV,
				oraclePriceSigUsd,
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
				bankBoxInNanoErg,
				bankBoxInCircSigUsdInCent,
				bankBoxInCircSigRSV,
				oraclePriceSigUsd,
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
	bankBoxInNanoErg: bigint,
	bankBoxInCircSigUsdInCent: bigint,
	bankBoxInCircSigRSV: bigint,
	oraclePriceSigUsd: bigint,
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
		bankBoxInNanoErg,
		bankBoxInCircSigUsdInCent,
		bankBoxInCircSigRSV,
		oraclePriceSigUsd,
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
