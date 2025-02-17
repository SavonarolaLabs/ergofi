import BigNumber from 'bignumber.js';
import {
	SIGUSD_BANK_ADDRESS,
	TOKEN_BANK_NFT,
	TOKEN_SIGRSV,
	TOKEN_SIGUSD,
	UI_FEE_ADDRESS,
	type Asset,
	type Output
} from './api/ergoNode';
import { absBigInt, decodeBigInt, maxBigInt, minBigInt } from './utils';
import {
	bank_box,
	bankBoxInCircSigUsdInCent,
	bankBoxInNanoErg,
	fee_mining,
	oracle_box,
	oraclePriceSigUsd,
	unconfirmed_bank_erg,
	unconfrimed_bank_reserve_rate,
	unconfrimed_bank_usd,
	unconfrimed_reserve_border_left_USD,
	unconfrimed_reserve_border_right_RSV,
	updateBestBankBoxLocal,
	type ErgoBox
} from './stores/bank';
import { get } from 'svelte/store';
import {
	addPreparedInteraction,
	addSignedInteraction,
	cancelPreparedInteractionById,
	confirmed_interactions,
	mempool_interactions,
	prepared_interactions,
	type Interaction
} from './stores/preparedInteractions';
import {
	ErgoAddress,
	ErgoUnsignedTransaction,
	OutputBuilder,
	SAFE_MIN_BOX_VALUE,
	SLong,
	TransactionBuilder
} from '@fleet-sdk/core';
import { submitTx } from './mempoolChannels';

export type OracleBoxesData = {
	inErg: bigint;
	inSigUSD: bigint;
	inSigRSV: bigint;
	inCircSigUSD: bigint;
	inCircSigRSV: bigint;
	oraclePrice: bigint;
	bankBox: Output;
	oracleBox: Output;
};

const FEE_BANK = 200n; //2%
const FEE_BANK_DENOM = 10_000n;

export const FEE_UI = 10n; //0.1%
export const FEE_UI_DENOM = 100_00n;

export const BASE_INPUT_AMOUNT_ERG = 1n; //1 ERG
export const BASE_INPUT_AMOUNT_USD = 100_00n; //100 USD
export const BASE_INPUT_AMOUNT_RSV = 10_000n; //10k RSV

// BankRate
export function calculateBankRateUSDInputUSD(
	inErg: bigint,
	inCircSigUSD: bigint,
	oraclePrice: bigint,
	requestSC: bigint,
	direction: bigint
): { rateSCERG: number; fee: bigint; bcDeltaExpectedWithFee: bigint } {
	let rateSCERG: number;
	// Stable PART --------
	const bcReserveNeededIn = inCircSigUSD * oraclePrice;
	const liabilitiesIn: bigint = maxBigInt(minBigInt(bcReserveNeededIn, inErg), 0n);
	const liableRate = liabilitiesIn / inCircSigUSD; // nanoerg for cent
	const scNominalPrice = minBigInt(liableRate, oraclePrice); // nanoerg for cent
	// Stable PART --------

	const bcDeltaExpected = scNominalPrice * requestSC;
	const fee = absBigInt((bcDeltaExpected * FEE_BANK) / FEE_BANK_DENOM);
	const bcDeltaExpectedWithFee = bcDeltaExpected + fee * direction;
	rateSCERG = Number(requestSC) / Number(bcDeltaExpectedWithFee);

	return { rateSCERG, fee, bcDeltaExpectedWithFee };
}
export function calculateBankRateUSDInputERG(
	inErg: bigint,
	inCircSigUSD: bigint,
	oraclePrice: bigint,
	requestErg: bigint,
	direction: bigint
): { rateSCERG: number; fee: bigint; requestSC: bigint } {
	let rateSCERG: number;
	// Stable PART --------
	const bcReserveNeededIn = inCircSigUSD * oraclePrice;
	const liabilitiesIn: bigint = maxBigInt(minBigInt(bcReserveNeededIn, inErg), 0n);
	const liableRate = liabilitiesIn / inCircSigUSD; // nanoerg for cent
	const scNominalPrice = minBigInt(liableRate, oraclePrice); // nanoerg for cent
	// Stable PART --------

	const requestSC =
		(requestErg * FEE_BANK_DENOM) / (scNominalPrice * (FEE_BANK_DENOM + FEE_BANK * direction));
	const bcDeltaExpected = scNominalPrice * requestSC;
	const fee = absBigInt((bcDeltaExpected * FEE_BANK) / FEE_BANK_DENOM);
	rateSCERG = Number(requestSC) / Number(requestErg);

	return { rateSCERG, fee, requestSC }; //cents for nanoerg
}
export function calculateBankRateRSVInputRSV(
	inErg: bigint,
	inCircSigUSD: bigint,
	inCircSigRSV: bigint,
	oraclePrice: bigint,
	requestRSV: bigint,
	direction: bigint
): { rateRSVERG: number; fee: bigint; bcDeltaExpectedWithFee: bigint } {
	let rateRSVERG: number;
	// Stable PART --------
	const bcReserveNeededIn = inCircSigUSD * oraclePrice; // nanoergs
	const liabilitiesIn: bigint = maxBigInt(minBigInt(bcReserveNeededIn, inErg), 0n);
	const equityIn = inErg - liabilitiesIn;
	const equityRate = equityIn / inCircSigRSV; // nanoergs per RSV
	// Stable PART --------

	const bcDeltaExpected = equityRate * requestRSV;
	const fee = absBigInt((bcDeltaExpected * FEE_BANK) / FEE_BANK_DENOM);
	const bcDeltaExpectedWithFee = bcDeltaExpected + direction * fee;
	rateRSVERG = Number(requestRSV) / Number(bcDeltaExpectedWithFee);

	return { rateRSVERG, fee, bcDeltaExpectedWithFee };
}
export function calculateBankRateRSVInputERG(
	inErg: bigint,
	inCircSigUSD: bigint,
	inCircSigRSV: bigint,
	oraclePrice: bigint,
	requestErg: bigint,
	direction: bigint
): { rateRSVERG: number; fee: bigint; requestRSV: bigint } {
	let rateRSVERG: number;
	// Stable PART --------
	const bcReserveNeededIn = inCircSigUSD * oraclePrice; // nanoergs
	const liabilitiesIn: bigint = maxBigInt(minBigInt(bcReserveNeededIn, inErg), 0n);
	const equityIn = inErg - liabilitiesIn;
	const equityRate = equityIn / inCircSigRSV; // nanoergs per RSV
	// Stable PART --------

	const requestRSV =
		(requestErg * FEE_BANK_DENOM) / (equityRate * (FEE_BANK_DENOM + FEE_BANK * direction));
	const bcDeltaExpected = equityRate * requestRSV;
	const fee = absBigInt((bcDeltaExpected * FEE_BANK) / FEE_BANK_DENOM);
	rateRSVERG = Number(requestRSV) / Number(requestErg);

	return { rateRSVERG, fee, requestRSV };
}
// BankBox Out
export function calculateOutputSc(
	inErg: bigint,
	inSigUSD: bigint,
	inSigRSV: bigint,
	inCircSigUSD: bigint,
	inCircSigRSV: bigint,
	requestSC: bigint,
	requestErg: bigint,
	direction: bigint
): {
	outErg: bigint;
	outSigUSD: bigint;
	outSigRSV: bigint;
	outCircSigUSD: bigint;
	outCircSigRSV: bigint;
} {
	const outErg = inErg + requestErg * direction;
	const outSigUSD = inSigUSD - requestSC * direction;
	const outCircSigUSD = inCircSigUSD + requestSC * direction;
	const outSigRSV = inSigRSV;
	const outCircSigRSV = inCircSigRSV;

	return {
		outErg,
		outSigUSD,
		outSigRSV,
		outCircSigUSD,
		outCircSigRSV
	};
}
export function calculateOutputRsv(
	inErg: bigint,
	inSigUSD: bigint,
	inSigRSV: bigint,
	inCircSigUSD: bigint,
	inCircSigRSV: bigint,
	requestRSV: bigint,
	requestErg: bigint,
	direction: bigint
) {
	const outErg = inErg + requestErg * direction;
	const outSigRSV = inSigRSV - requestRSV * direction;
	const outCircSigRSV = inCircSigRSV + requestRSV * direction;
	const outSigUSD = inSigUSD;
	const outCircSigUSD = inCircSigUSD;

	return {
		outErg,
		outSigUSD,
		outSigRSV,
		outCircSigUSD,
		outCircSigRSV
	};
}

// Вспомогательные функции
export function extractBoxesData(oracleBox: Output, bankBox: Output): OracleBoxesData {
	const inErg = BigInt(bankBox.value);
	const inSigUSD = BigInt(
		bankBox.assets.find((asset: Asset) => asset.tokenId == TOKEN_SIGUSD)!.amount
	);
	const inSigRSV = BigInt(
		bankBox.assets.find((asset: Asset) => asset.tokenId == TOKEN_SIGRSV)!.amount
	);
	const inCircSigUSD = decodeBigInt(bankBox.additionalRegisters.R4);
	const inCircSigRSV = decodeBigInt(bankBox.additionalRegisters.R5);
	// ORACLE PRICE / 100n
	//console.log('oracle box:', oracleBox);
	const oraclePrice = decodeBigInt(oracleBox.additionalRegisters.R4) / 100n; // nanoerg for cent

	return {
		inErg,
		inSigUSD,
		inSigRSV,
		inCircSigUSD,
		inCircSigRSV,
		oraclePrice,
		bankBox,
		oracleBox
	};
}

// Reserve Rate
export function calculateReserveRate(bankErg: bigint, bankUSD: bigint, oraclePrice: bigint) {
	const bankERGBigNumber = BigNumber(bankErg.toString()).dividedBy(10 ** 9); //convert to ERG
	const bankUSDBigNumber = BigNumber(bankUSD.toString()).dividedBy(100); //convert to USD
	const price = BigNumber(10 ** 9)
		.dividedBy(BigNumber(oraclePrice.toString()))
		.dividedBy(100); //convert to ERG / USD price

	const reserveRate = Number(
		bankERGBigNumber.multipliedBy(price).dividedBy(bankUSDBigNumber).multipliedBy(100).toFixed(0)
	);
	return reserveRate; //%
}
export function calculateReserveRateAndBorders(
	inErg: bigint,
	inCircSigUSD: bigint,
	oraclePrice: bigint,
	rsvPriceBuy: number,
	rsvPriceSell: number
): any {
	// Clear convert
	const bankERG = BigNumber(inErg.toString()).dividedBy(10 ** 9); //convert to ERG
	const bankUSD = BigNumber(inCircSigUSD.toString()).dividedBy(100); //convert to USD
	const priceRSVBuy = BigNumber(rsvPriceBuy.toString());
	const priceRSVSell = BigNumber(rsvPriceSell.toString());

	const priceUSD = BigNumber(10 ** 9)
		.dividedBy(BigNumber(oraclePrice.toString()))
		.dividedBy(100); //convert to ERG / USD price

	const reserveRate = Number(
		bankERG.multipliedBy(priceUSD).dividedBy(bankUSD).multipliedBy(100).toFixed(0)
	); // as function

	const leftBorder = 4;
	const rightBorder = 8;

	function calculateBorderUSD(
		border: number,
		bankUSD: BigNumber,
		bankERG: BigNumber,
		price: BigNumber
	) {
		const a_Left = BigNumber(bankERG).multipliedBy(price);
		const b_Left = BigNumber(bankUSD).multipliedBy(border);
		const delta_a_b_Left = a_Left.minus(b_Left);
		const borderUSD = delta_a_b_Left.dividedBy(border - 1);
		return borderUSD;
	}

	function calculateBorderRSV(
		border: number,
		bankUSD: BigNumber,
		bankERG: BigNumber,
		price: BigNumber,
		priceRSV: BigNumber
	) {
		const adjErg = bankUSD.multipliedBy(border).dividedBy(price);
		const deltaErg = adjErg.minus(bankERG);
		const borderRSV = deltaErg.multipliedBy(priceRSV);
		return borderRSV;
	}

	const leftUSD = Number(calculateBorderUSD(leftBorder, bankUSD, bankERG, priceUSD).toFixed(0));
	const rightUSD = Number(calculateBorderUSD(rightBorder, bankUSD, bankERG, priceUSD).toFixed(0));
	const leftERG = Number(BigNumber(leftUSD).dividedBy(priceUSD).toFixed(0));
	const rightERG = Number(BigNumber(rightUSD).dividedBy(priceUSD).toFixed(0));
	const leftRSV = Number(
		calculateBorderRSV(leftBorder, bankUSD, bankERG, priceUSD, priceRSVBuy).toFixed(0)
	);
	const rightRSV = Number(
		calculateBorderRSV(rightBorder, bankUSD, bankERG, priceUSD, priceRSVSell).toFixed(0)
	);

	return { reserveRate, leftUSD, rightUSD, leftERG, rightERG, leftRSV, rightRSV };
}

// Fee
export function applyFee(inputERG: bigint, feeMining: bigint) {
	const uiSwapFee = (inputERG * FEE_UI) / FEE_UI_DENOM;
	const contractERG = inputERG - feeMining - uiSwapFee;
	return { uiSwapFee, contractERG };
}
export function reverseFee(contractERG: bigint, feeMining: bigint) {
	const uiSwapFee = (contractERG * FEE_UI) / (FEE_UI_DENOM - FEE_UI);
	const inputERG = contractERG + feeMining + uiSwapFee;
	return { inputERG, uiSwapFee };
}
export function reverseFeeSell(contractERG: bigint, feeMining: bigint) {
	const uiSwapFee = (contractERG * FEE_UI) / FEE_UI_DENOM;
	const userERG = contractERG - feeMining - uiSwapFee;
	return { userERG, uiSwapFee };
}
export function applyFeeSell(inputERG: bigint, feeMining: bigint) {
	const uiSwapFee = (inputERG * FEE_UI) / (FEE_UI_DENOM - FEE_UI);
	const contractERG = inputERG + feeMining + uiSwapFee;
	return { uiSwapFee, contractERG };
}

// Swap Price | USD <-> ERG
// (f1.price && f4.price)
export function calculateInputsUsdErgInErg(
	direction: bigint,
	buyAmountInput: any,
	bankBoxInNanoErg: bigint,
	bankBoxInCircSigUsdInCent: bigint,
	oraclePriceSigUsd: bigint,
	feeMining: bigint
): any {
	const inputAmountERG = new BigNumber(buyAmountInput);
	if (!inputAmountERG.isNaN() && inputAmountERG.gt(0)) {
		const { contractRate, contractFee, contractUSD, contractERG, uiFeeErg, swapFee, swapRate } =
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
		return { totalSigUSD, finalPrice, totalFee, contractERG, uiFeeErg };
	} else {
		const { contractRate, contractFee, contractUSD, contractERG, uiFeeErg, swapFee, swapRate } =
			calculateInputsUsdErgInErgPrice(
				direction,
				new BigNumber(BASE_INPUT_AMOUNT_ERG.toString()),
				bankBoxInNanoErg,
				bankBoxInCircSigUsdInCent,
				oraclePriceSigUsd,
				feeMining
			);
		const totalSigUSD = '';
		const finalPrice = new BigNumber(10000000).multipliedBy(swapRate).toFixed(2);
		const totalFee = '';
		return { totalSigUSD, finalPrice, totalFee };
	}
}
export function calculateInputsUsdErgInErgPrice(
	direction: bigint,
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
	let contractERG: bigint;

	if (direction === 1n) {
		//f1
		({ uiSwapFee: uiFeeErg, contractERG } = applyFee(inputErg, feeMining));
	} else {
		//f4
		//({ uiSwapFee: uiFeeErg, contractERG } = applyFee(inputErg));
		({ uiSwapFee: uiFeeErg, contractERG } = applyFeeSell(inputErg, feeMining));
	}

	//Part 2 - Calculate Price
	let {
		rateSCERG: contractRate,
		fee: contractFee,
		requestSC: contractUSD
	} = calculateBankRateUSDInputERG(
		bankBoxInNanoErg,
		bankBoxInCircSigUsdInCent,
		oraclePriceSigUsd,
		contractERG,
		direction
	);

	////console.log(direction, 'direction');
	if (direction == -1n) {
		contractUSD = contractUSD + 1n;
	}

	//---------------------------------
	//Part 2 - Calculate Price ()
	const { rateSCERG: contractRateCompare, bcDeltaExpectedWithFee: contractErgCompare } =
		calculateBankRateUSDInputUSD(
			bankBoxInNanoErg,
			bankBoxInCircSigUsdInCent,
			oraclePriceSigUsd,
			contractUSD,
			direction
		);

	// TODO: --------------------------------
	//console.log('');
	//console.log(inputAmountNanoERG, ' Input ERG');
	//console.log(contractERG, ' Contract ERG');
	//console.log(contractErgCompare, ' contractErgCompare');
	//console.log(contractUSD, ' contractUSD');

	// --------------------------------
	if (direction == -1n) {
		//console.log('sell');
		if (contractERG < contractErgCompare) {
			//console.log('Adjust FEE SELL');
			//uiFeeErg = uiFeeErg - (-contractErgCompare + contractERG); // ITS NEGATIVE: GG
			uiFeeErg = uiFeeErg + (contractErgCompare - contractERG); // Right
		}
	}

	// // ------ TEST ------
	// if (direction == 1n) {
	// 	//console.log('buy');
	// 	// < probably this way
	// 	if (contractERG > contractErgCompare) {
	// 		//console.log('Adjust FEE BUY');
	// 		uiFeeErg = uiFeeErg + (-contractErgCompare + contractERG);
	// 	}
	// }

	//if (contractERG > contractErgCompare) uiFeeErg = uiFeeErg + (contractErgCompare - contractERG);

	////console.log(uiFeeErg, 'uiFeeErg');
	const swapFee = contractFee + feeMining + uiFeeErg;
	const swapRate = new BigNumber(contractUSD.toString()).dividedBy(inputAmountNanoERG.toString());

	return {
		contractRate,
		contractFee,
		contractUSD,
		contractERG,
		uiFeeErg,
		swapFee, //totalFee
		swapRate //totalRate
	};
}
// (f3.price && f2.price)
export function calculateInputsUsdErgInUsd(
	direction: bigint,
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
		const { rateSCERG, feeContract, totalErgoRequired, feeTotal, rateTotal } =
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
		const { rateSCERG, feeContract, totalErgoRequired, feeTotal, rateTotal } =
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
	direction: bigint,
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
		rateSCERG,
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
		//f2
		({ inputERG: totalErgoRequired, uiSwapFee: uiFeeErg } = reverseFee(
			contractErgoRequired,
			feeMining
		));
	} else {
		//f3
		////console.log('f3.price');
		////console.log(contractErgoRequired, ' contract ERG');
		({ userERG: totalErgoRequired, uiSwapFee: uiFeeErg } = reverseFeeSell(
			contractErgoRequired,
			feeMining
		));
	}
	const feeTotal = feeContract + feeMining + uiFeeErg;
	//console.log(contractErgoRequired - feeMining - uiFeeErg, ' final ERG');

	//console.log();
	//console.log();

	const rateTotal = new BigNumber(totalSC.toString()).dividedBy(totalErgoRequired.toString());
	return { rateSCERG, feeContract, totalErgoRequired, feeTotal, rateTotal };
}

// Swap Price | RSV <-> ERG
// (f5.price && f8.price)
export function calculateInputsRSVErgInErg(
	direction: bigint,
	buyAmountInput: any,
	bankBoxInNanoErg: bigint,
	bankBoxInCircSigUsdInCent: bigint,
	bankBoxInCircSigRSV: bigint,
	oraclePriceSigUsd: bigint,
	feeMining: bigint
): any {
	const inputAmountERG = new BigNumber(buyAmountInput);
	if (!inputAmountERG.isNaN() && inputAmountERG.gt(0)) {
		const { contractRate, contractFee, contractRSV, contractERG, uiFeeErg, swapFee, swapRate } =
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
		return { totalSigRSV, finalPrice, totalFee, contractERG, uiFeeErg };
	} else {
		const { contractRate, contractFee, contractRSV, contractERG, uiFeeErg, swapFee, swapRate } =
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
	direction: bigint,
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
	let contractERG: bigint;

	if (direction === 1n) {
		//f5
		({ uiSwapFee: uiFeeErg, contractERG } = applyFee(inputErg, feeMining));
	} else {
		//f8
		({ uiSwapFee: uiFeeErg, contractERG } = applyFeeSell(inputErg, feeMining));
	}

	// CHANGE FUNCTION <--------
	//Part 2 - Calculate Price
	let {
		rateRSVERG: contractRate,
		fee: contractFee,
		requestRSV: contractRSV
	} = calculateBankRateRSVInputERG(
		bankBoxInNanoErg,
		bankBoxInCircSigUsdInCent,
		bankBoxInCircSigRSV,
		oraclePriceSigUsd,
		contractERG,
		direction
	);

	if (direction == -1n) {
		contractRSV = contractRSV + 1n;
	}

	//Part 2 - Calculate Price ()
	const { rateRSVERG: contractRateCompare, bcDeltaExpectedWithFee: contractErgCompare } =
		calculateBankRateRSVInputRSV(
			bankBoxInNanoErg,
			bankBoxInCircSigUsdInCent,
			bankBoxInCircSigRSV,
			oraclePriceSigUsd,
			contractRSV,
			direction
		);

	// --------------------------------
	if (direction == 1n) {
		if (contractERG > contractErgCompare) uiFeeErg = uiFeeErg + (-contractErgCompare + contractERG);
	}

	if (direction == -1n) {
		if (contractERG < contractErgCompare) {
			uiFeeErg = uiFeeErg + (contractErgCompare - contractERG); // Right
		}
	}

	const swapFee = contractFee + feeMining + uiFeeErg;
	const swapRate = new BigNumber(contractRSV.toString()).dividedBy(inputAmountNanoERG.toString());

	return {
		contractRate,
		contractFee,
		contractRSV,
		contractERG,
		uiFeeErg,
		swapFee, //totalFee
		swapRate //totalRate
	};
}
// (f6.price && f7.price)
export function calculateInputsRSVErgInRSV(
	direction: bigint,
	inputRSV: any,
	bankBoxInNanoErg: bigint,
	bankBoxInCircSigUsdInCent: bigint,
	bankBoxInCircSigRSV: bigint,
	oraclePriceSigUsd: bigint,
	feeMining: bigint
): any {
	const totalRSV = new BigNumber(inputRSV).integerValue(BigNumber.ROUND_CEIL);

	if (!totalRSV.isNaN() && totalRSV.gt(0)) {
		const { rateRSVERG, contractFee, totalErgoRequired, swapFee, swapRate } =
			calculateInputsRSVErgInRSVPrice(
				direction,
				totalRSV,
				bankBoxInNanoErg,
				bankBoxInCircSigUsdInCent,
				bankBoxInCircSigRSV,
				oraclePriceSigUsd,
				feeMining
			);

		//---------------------------------
		const totalErg = new BigNumber(totalErgoRequired.toString()).dividedBy('1000000000').toFixed(9);
		const finalPrice = new BigNumber(1000000000).multipliedBy(swapRate).toFixed(0);
		const totalFee = new BigNumber(swapFee.toString()).dividedBy('1000000000').toFixed(2);
		return { totalErg, finalPrice, totalFee };
	} else {
		const { rateRSVERG, contractFee, totalErgoRequired, swapFee, swapRate } =
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
	direction: bigint,
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
		rateRSVERG,
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
		//f6
		({ inputERG: totalErgoRequired, uiSwapFee: uiFeeErg } = reverseFee(
			contractErgoRequired,
			feeMining
		));
	} else {
		//f7
		({ userERG: totalErgoRequired, uiSwapFee: uiFeeErg } = reverseFeeSell(
			contractErgoRequired,
			feeMining
		));
	}
	const swapFee = contractFee + feeMining + uiFeeErg;

	const swapRate = new BigNumber(totalRSV.toString()).dividedBy(totalErgoRequired.toString());
	return { rateRSVERG, contractFee, totalErgoRequired, swapFee, swapRate };
}

// Web3 Wallet interactions
async function getWeb3WalletData() {
	await window.ergoConnector.nautilus.connect();
	const me = await ergo.get_change_address();
	const utxos = await ergo.get_utxos();
	const height = await ergo.get_current_height();
	return { me, utxos, height };
}
async function createInteractionAndSubmitTx(
	unsignedTx: ErgoUnsignedTransaction,
	ownAddressList: string[]
) {
	console.log('createInteractionAndSubmitTx');
	const interactionId = addPreparedInteraction(unsignedTx, ownAddressList);
	try {
		console.log({ unsignedTx });
		const signed = await ergo.sign_tx(unsignedTx);

		addSignedInteraction(signed, interactionId, ownAddressList);

		updateBestBankBoxLocal(
			get(confirmed_interactions),
			get(mempool_interactions),
			get(prepared_interactions)
		);
		console.log({ signed });
		//submitTx(signed, interactionId);
	} catch (e) {
		console.log(e);
		cancelPreparedInteractionById(interactionId);
	}
}

// (f1)
export async function buyUSDInputERG(
	inputErg: bigint = 1_000_000_000n,
	bankBox: ErgoBox,
	oracleBox: ErgoBox,
	feeMining: bigint
) {
	const { me, utxos, height } = await getWeb3WalletData();

	const direction = 1n;
	const tx = await buyUSDInputERGTx(
		inputErg,
		me,
		SIGUSD_BANK_ADDRESS,
		utxos,
		height,
		direction,
		bankBox,
		oracleBox,
		feeMining
	);
	console.log(tx);
	await createInteractionAndSubmitTx(tx, [me]);
}

export async function buyUSDInputERGTx(
	inputErg: bigint,
	holderBase58PK: string,
	bankBase58PK: string,
	utxos: Array<any>,
	height: number,
	direction: bigint,
	bankBox: ErgoBox,
	oracleBox: ErgoBox,
	feeMining: bigint
): any {
	//Part 0 - use Fee
	let uiSwapFee;

	const { uiSwapFee: abc, contractERG: contractErg } = applyFee(inputErg, feeMining);
	uiSwapFee = abc;

	//Part 1 - Get Oracle
	const {
		inErg,
		inSigUSD,
		inSigRSV,
		inCircSigUSD,
		inCircSigRSV,
		oraclePrice,
		bankBox: bankBoxDelete,
		oracleBox: oracleBoxDelete
	}: OracleBoxesData = await extractBoxesData(oracleBox, bankBox);

	//Part 2 - Calculate Price
	const { rateSCERG: contractRate, requestSC: contractUSD } = calculateBankRateUSDInputERG(
		inErg,
		inCircSigUSD,
		oraclePrice,
		contractErg,
		direction
	);

	//---- DEBUG Price Calculation ----
	//Part 2 - Calculate Price ()
	const { rateSCERG: contractRateCompare, bcDeltaExpectedWithFee: contractErgCompare } =
		calculateBankRateUSDInputUSD(inErg, inCircSigUSD, oraclePrice, contractUSD, direction);

	//Adjust fee
	if (contractErg > contractErgCompare) uiSwapFee = uiSwapFee + (-contractErgCompare + contractErg);
	// //DEBUG RESULT: Need to Fix:   ----------------------

	//Part 3 - Calculate BankBox
	const { outErg, outSigUSD, outSigRSV, outCircSigUSD, outCircSigRSV } = calculateOutputSc(
		inErg,
		inSigUSD,
		inSigRSV,
		inCircSigUSD,
		inCircSigRSV,
		contractUSD,
		contractErgCompare,
		direction
	);

	//Part 4 - Calculate TX
	const unsignedMintTransaction = buildTx_SIGUSD_ERG_USD(
		direction,
		contractErgCompare,
		contractUSD,
		holderBase58PK,
		bankBase58PK,
		height,
		bankBox,
		oracleBox,
		uiSwapFee,
		utxos,
		outErg,
		outSigUSD,
		outSigRSV,
		outCircSigUSD,
		outCircSigRSV,
		feeMining
	);

	//console.log(unsignedMintTransaction);
	return unsignedMintTransaction;
}

// (f2)
export async function buyUSDInputUSD(
	inputUSD: bigint = 1_00n,
	bankBox: ErgoBox,
	oracleBox: ErgoBox,
	feeMining: bigint
) {
	const { me, utxos, height } = await getWeb3WalletData();

	const direction = 1n;
	const tx = await buyUSDInputUSDTx(
		inputUSD,
		me,
		SIGUSD_BANK_ADDRESS,
		utxos,
		height,
		direction,
		bankBox,
		oracleBox,
		feeMining
	);
	await createInteractionAndSubmitTx(tx, [me]);
}
export async function buyUSDInputUSDTx(
	inputUSD: bigint,
	holderBase58PK: string,
	bankBase58PK: string,
	utxos: Array<any>,
	height: number,
	direction: bigint,
	bankBox: ErgoBox,
	oracleBox: ErgoBox,
	feeMining: bigint
): any {
	const contractUSD = inputUSD;

	//Part 1 - Get Oracle
	const {
		inErg,
		inSigUSD,
		inSigRSV,
		inCircSigUSD,
		inCircSigRSV,
		oraclePrice,
		bankBox: bankBoxDelete,
		oracleBox: oracleBoxDelete
	}: OracleBoxesData = await extractBoxesData(oracleBox, bankBox);

	//Part 2 - Calculate Price
	const { rateSCERG: contractRate, bcDeltaExpectedWithFee: contractErg } =
		calculateBankRateUSDInputUSD(inErg, inCircSigUSD, oraclePrice, contractUSD, direction);

	//Part 3 - Calculate BankBox
	const { outErg, outSigUSD, outSigRSV, outCircSigUSD, outCircSigRSV } = calculateOutputSc(
		inErg,
		inSigUSD,
		inSigRSV,
		inCircSigUSD,
		inCircSigRSV,
		contractUSD,
		contractErg,
		direction
	);

	//Part 0 - use Fee Reversed
	const { inputERG, uiSwapFee } = reverseFee(contractErg, feeMining);

	//Part 4 - Calculate TX
	const unsignedMintTransaction = buildTx_SIGUSD_ERG_USD(
		direction,
		contractErg,
		contractUSD,
		holderBase58PK,
		bankBase58PK,
		height,
		bankBox,
		oracleBox,
		uiSwapFee,
		utxos,
		outErg,
		outSigUSD,
		outSigRSV,
		outCircSigUSD,
		outCircSigRSV,
		feeMining
	); //UserErg is not important?

	//console.log(unsignedMintTransaction);
	return unsignedMintTransaction;
}

// (f3)
export async function sellUSDInputUSD(
	inputUSD: bigint = 1_00n,
	bankBox: ErgoBox,
	oracleBox: ErgoBox,
	feeMining: bigint
) {
	const { me, utxos, height } = await getWeb3WalletData();

	const direction = -1n;
	const tx = await sellUSDInputUSDTx(
		inputUSD,
		me,
		SIGUSD_BANK_ADDRESS,
		utxos,
		height,
		direction,
		bankBox,
		oracleBox,
		feeMining
	);
	await createInteractionAndSubmitTx(tx, [me]);
}
export async function sellUSDInputUSDTx(
	inputUSD: bigint,
	holderBase58PK: string,
	bankBase58PK: string,
	utxos: Array<any>,
	height: number,
	direction: bigint,
	bankBox: ErgoBox,
	oracleBox: ErgoBox,
	feeMining: bigint
): any {
	const contractUSD = inputUSD;

	//Part 1 - Get Oracle
	const {
		inErg,
		inSigUSD,
		inSigRSV,
		inCircSigUSD,
		inCircSigRSV,
		oraclePrice,
		bankBox: bankBoxDelete,
		oracleBox: oracleBoxDelete
	}: OracleBoxesData = await extractBoxesData(oracleBox, bankBox);

	//Part 2 - Calculate Price
	const { rateSCERG: contractRate, bcDeltaExpectedWithFee: contractERG } =
		calculateBankRateUSDInputUSD(inErg, inCircSigUSD, oraclePrice, contractUSD, direction);

	//Part 3 - Calculate BankBox
	const { outErg, outSigUSD, outSigRSV, outCircSigUSD, outCircSigRSV } = calculateOutputSc(
		inErg,
		inSigUSD,
		inSigRSV,
		inCircSigUSD,
		inCircSigRSV,
		contractUSD,
		contractERG,
		direction
	);

	// PART X
	const { userERG, uiSwapFee } = reverseFeeSell(contractERG, feeMining);
	//console.log(contractUSD, 'USD -> ERG ', userERG);

	// PART X - Build
	const unsignedMintTransaction = buildTx_SIGUSD_ERG_USD(
		direction,
		contractERG,
		contractUSD,
		holderBase58PK,
		bankBase58PK,
		height,
		bankBox,
		oracleBox,
		uiSwapFee,
		utxos,
		outErg,
		outSigUSD,
		outSigRSV,
		outCircSigUSD,
		outCircSigRSV,
		feeMining
	);

	//console.log(unsignedMintTransaction);
	return unsignedMintTransaction;
}

// (f4)
export async function sellUSDInputERG(
	inputErg: bigint = 1_000_000_000n,
	bankBox: ErgoBox,
	oracleBox: ErgoBox,
	feeMining: bigint
) {
	const { me, utxos, height } = await getWeb3WalletData();

	const direction = -1n;
	const tx = await sellUSDInputERGTx(
		inputErg,
		me,
		SIGUSD_BANK_ADDRESS,
		utxos,
		height,
		direction,
		bankBox,
		oracleBox,
		feeMining
	);
	await createInteractionAndSubmitTx(tx, [me]);
}
export async function sellUSDInputERGTx(
	inputErg: bigint,
	holderBase58PK: string,
	bankBase58PK: string,
	utxos: Array<any>,
	height: number,
	direction: bigint,
	bankBox: ErgoBox,
	oracleBox: ErgoBox,
	feeMining: bigint
): any {
	//Part 0 - use Fee
	let uiSwapFee;
	const { uiSwapFee: abc, contractERG: contractErg } = applyFeeSell(inputErg, feeMining);
	uiSwapFee = abc;

	//Part 1 - Get Oracle
	const {
		inErg,
		inSigUSD,
		inSigRSV,
		inCircSigUSD,
		inCircSigRSV,
		oraclePrice,
		bankBox: bankBoxDelete,
		oracleBox: oracleBoxDelete
	}: OracleBoxesData = await extractBoxesData(oracleBox, bankBox);

	//Part 2.1 - Calculate Price
	let { rateSCERG: contractRate, requestSC: contractUSD } = calculateBankRateUSDInputERG(
		inErg,
		inCircSigUSD,
		oraclePrice,
		contractErg,
		direction
	);

	//Part 2.2 - Reversed round UP ()
	if (direction == -1n) {
		contractUSD = contractUSD + 1n;
	}

	const { rateSCERG: contractRateCompare, bcDeltaExpectedWithFee: contractErgCompare } =
		calculateBankRateUSDInputUSD(inErg, inCircSigUSD, oraclePrice, contractUSD, direction);

	if (contractErg < contractErgCompare) {
		uiSwapFee = uiSwapFee + (contractErgCompare - contractErg);
		//console.log('real sell - fee adjusted');
	}

	//Part 3 - Calculate BankBox
	const { outErg, outSigUSD, outSigRSV, outCircSigUSD, outCircSigRSV } = calculateOutputSc(
		inErg,
		inSigUSD,
		inSigRSV,
		inCircSigUSD,
		inCircSigRSV,
		contractUSD,
		contractErgCompare,
		direction
	);

	//Part 4 - Calculate TX
	const unsignedMintTransaction = buildTx_SIGUSD_ERG_USD(
		direction,
		contractErgCompare,
		contractUSD,
		holderBase58PK,
		bankBase58PK,
		height,
		bankBox,
		oracleBox,
		uiSwapFee,
		utxos,
		outErg,
		outSigUSD,
		outSigRSV,
		outCircSigUSD,
		outCircSigRSV,
		feeMining
	);

	//console.log(unsignedMintTransaction);
	return unsignedMintTransaction;
}

// (f5)
export async function buyRSVInputERG(
	inputErg: bigint = 1_000_000_000n,
	bankBox: ErgoBox,
	oracleBox: ErgoBox,
	feeMining: bigint
) {
	const { me, utxos, height } = await getWeb3WalletData();

	const direction = 1n;
	const tx = await buyRSVInputERGTx(
		inputErg,
		me,
		SIGUSD_BANK_ADDRESS,
		utxos,
		height,
		direction,
		bankBox,
		oracleBox,
		feeMining
	);
	await createInteractionAndSubmitTx(tx, [me]);
}
export async function buyRSVInputERGTx(
	inputErg: bigint,
	holderBase58PK: string,
	bankBase58PK: string,
	utxos: Array<any>,
	height: number,
	direction: bigint,
	bankBox: ErgoBox,
	oracleBox: ErgoBox,
	feeMining: bigint
): any {
	//direction = 1n; // 1n or -1n
	//Part 0 - use Fee
	let uiSwapFee;

	const { uiSwapFee: abc, contractERG: contractErg } = applyFee(inputErg, feeMining);
	uiSwapFee = abc;

	// if buy RSV Input ERG -> Clear Fee (f1 + f4)
	// ---------------------------------

	//Part 1 - Get Oracle
	const {
		inErg,
		inSigUSD,
		inSigRSV,
		inCircSigUSD,
		inCircSigRSV,
		oraclePrice,
		bankBox: bankBoxDelete,
		oracleBox: oracleBoxDelete
	}: OracleBoxesData = await extractBoxesData(oracleBox, bankBox);

	// ----------------- REWORK? ----------------
	//Part 2 - Calculate Price (REVERSED)
	const { rateRSVERG: contractRate, requestRSV: contractRSV } = calculateBankRateRSVInputERG(
		inErg,
		inCircSigUSD,
		inCircSigRSV,
		oraclePrice,
		contractErg,
		direction
	);

	// Input ERG -> Contract ERG -> Contract RSV

	//---- DEBUG Price Calculation ----
	//Part 2 - Calculate Price ()
	const { rateRSVERG: contractRateCompare, bcDeltaExpectedWithFee: contractErgCompare } =
		calculateBankRateRSVInputRSV(
			inErg,
			inCircSigUSD,
			inCircSigRSV,
			oraclePrice,
			contractRSV,
			direction
		);

	console.log('---------F5---------');
	console.log(inputErg, 'Input ERG');
	console.log(contractErg, 'Contract ERG');
	console.log(contractErg, ' -> ', contractRSV, ' ERG -> RSV');
	console.log(contractErgCompare, ' <- ', contractRSV, ' ERG <- RSV');

	console.log(uiSwapFee, ' initial swapFee');
	//Adjust fee
	if (contractErg > contractErgCompare) uiSwapFee = uiSwapFee + (-contractErgCompare + contractErg);
	// //DEBUG RESULT: Need to Fix:   ----------------------
	console.log(uiSwapFee, ' changed swapFee');

	const { outErg, outSigUSD, outSigRSV, outCircSigUSD, outCircSigRSV } = calculateOutputRsv(
		inErg,
		inSigUSD,
		inSigRSV,
		inCircSigUSD,
		inCircSigRSV,
		contractRSV,
		contractErgCompare,
		direction
	);

	//Part 4 - Calculate TX
	const unsignedMintTransaction = buildTx_SIGUSD_ERG_RSV(
		direction,
		contractErgCompare,
		contractRSV,
		holderBase58PK,
		bankBase58PK,
		height,
		bankBox,
		oracleBox,
		uiSwapFee,
		utxos,
		outErg,
		outSigUSD,
		outSigRSV,
		outCircSigUSD,
		outCircSigRSV,
		feeMining
	);

	return unsignedMintTransaction;
}

// (f6)
export async function buyRSVInputRSV(
	requestRSV: bigint = 2200n,
	bankBox: ErgoBox,
	oracleBox: ErgoBox,
	feeMining: bigint
) {
	const { me, utxos, height } = await getWeb3WalletData();
	const direction = 1n;
	const tx = await buyRSVInputRSVTx(
		requestRSV,
		me,
		SIGUSD_BANK_ADDRESS,
		utxos,
		height,
		direction,
		bankBox,
		oracleBox,
		feeMining
	);
	await createInteractionAndSubmitTx(tx, [me]);
}
export async function buyRSVInputRSVTx(
	requestRSV: bigint,
	holderBase58PK: string,
	bankBase58PK: string,
	utxos: Array<any>,
	height: number,
	direction: bigint,
	bankBox: ErgoBox,
	oracleBox: ErgoBox,
	feeMining: bigint
): any {
	//direction = 1n; // 1n or -1n

	const contractRSV = requestRSV;

	// if buy RSV Input ERG -> Clear Fee (f1 + f4)
	// ---------------------------------

	//Part 1 - Get Oracle
	const {
		inErg,
		inSigUSD,
		inSigRSV,
		inCircSigUSD,
		inCircSigRSV,
		oraclePrice,
		bankBox: bankBoxDelete,
		oracleBox: oracleBoxDelete
	}: OracleBoxesData = await extractBoxesData(oracleBox, bankBox);

	// ----------------- REWORK? ----------------
	//Part 2 - Calculate Price
	const { rateRSVERG: contractRate, bcDeltaExpectedWithFee: contractErg } =
		calculateBankRateRSVInputRSV(
			inErg,
			inCircSigUSD,
			inCircSigRSV,
			oraclePrice,
			requestRSV,
			direction
		);

	const { outErg, outSigUSD, outSigRSV, outCircSigUSD, outCircSigRSV } = calculateOutputRsv(
		inErg,
		inSigUSD,
		inSigRSV,
		inCircSigUSD,
		inCircSigRSV,
		contractRSV,
		contractErg,
		direction
	);

	// if buy RSV Input RSV -> Fee Reversed (f2 + f3)
	//Part 0 - use Fee Reversed
	const { inputERG, uiSwapFee } = reverseFee(contractErg, feeMining);
	// BUILD RSV TX FUNCTION --------

	//Part 4 - Calculate TX
	const unsignedMintTransaction = buildTx_SIGUSD_ERG_RSV(
		direction,
		contractErg,
		contractRSV,
		holderBase58PK,
		bankBase58PK,
		height,
		bankBox,
		oracleBox,
		uiSwapFee,
		utxos,
		outErg,
		outSigUSD,
		outSigRSV,
		outCircSigUSD,
		outCircSigRSV,
		feeMining
	);

	return unsignedMintTransaction;
}

// (f7)
export async function sellRSVInputRSV(
	requestRSV: bigint = 2200n,
	bankBox: ErgoBox,
	oracleBox: ErgoBox,
	feeMining: bigint
) {
	const { me, utxos, height } = await getWeb3WalletData();
	const direction = -1n;
	const tx = await sellRSVInputRSVTx(
		requestRSV,
		me,
		SIGUSD_BANK_ADDRESS,
		utxos,
		height,
		direction,
		bankBox,
		oracleBox,
		feeMining
	);
	await createInteractionAndSubmitTx(tx, [me]);
}
export async function sellRSVInputRSVTx(
	requestRSV: bigint,
	holderBase58PK: string,
	bankBase58PK: string,
	utxos: Array<any>,
	height: number,
	direction: bigint,
	bankBox: ErgoBox,
	oracleBox: ErgoBox,
	feeMining: bigint
): any {
	const contractRSV = requestRSV; // ?

	//Part 1 - Get Oracle
	const {
		inErg,
		inSigUSD,
		inSigRSV,
		inCircSigUSD,
		inCircSigRSV,
		oraclePrice,
		bankBox: bankBoxDelete,
		oracleBox: oracleBoxDelete
	}: OracleBoxesData = await extractBoxesData(oracleBox, bankBox);

	// ----------------- REWORK? ----------------
	//Part 2 - Calculate Price
	const { rateRSVERG: contractRate, bcDeltaExpectedWithFee: contractErg } =
		calculateBankRateRSVInputRSV(
			inErg,
			inCircSigUSD,
			inCircSigRSV,
			oraclePrice,
			requestRSV,
			direction
		);

	const { outErg, outSigUSD, outSigRSV, outCircSigUSD, outCircSigRSV } = calculateOutputRsv(
		inErg,
		inSigUSD,
		inSigRSV,
		inCircSigUSD,
		inCircSigRSV,
		contractRSV,
		contractErg,
		direction
	);

	// if buy RSV Input RSV -> Fee Reversed (f2 + f3)
	//Part 0 - use Fee Reversed
	// PART X
	const { userERG, uiSwapFee } = reverseFeeSell(contractErg, feeMining);
	//console.log(contractUSD, 'USD -> ERG ', userERG);

	//Part 4 - Calculate TX
	const unsignedMintTransaction = buildTx_SIGUSD_ERG_RSV(
		direction,
		contractErg,
		contractRSV,
		holderBase58PK,
		bankBase58PK,
		height,
		bankBox,
		oracleBox,
		uiSwapFee,
		utxos,
		outErg,
		outSigUSD,
		outSigRSV,
		outCircSigUSD,
		outCircSigRSV,
		feeMining
	);

	return unsignedMintTransaction;
}

// (f8)
export async function sellRSVInputERG(
	inputErg: bigint = 1_000_000_000n,
	bankBox: ErgoBox,
	oracleBox: ErgoBox,
	feeMining: bigint
) {
	const { me, utxos, height } = await getWeb3WalletData();

	const direction = -1n;
	const tx = await sellRSVInputERGTx(
		inputErg,
		me,
		SIGUSD_BANK_ADDRESS,
		utxos,
		height,
		direction,
		bankBox,
		oracleBox,
		feeMining
	);
	await createInteractionAndSubmitTx(tx, [me]);
}
export async function sellRSVInputERGTx(
	inputErg: bigint,
	holderBase58PK: string,
	bankBase58PK: string,
	utxos: Array<any>,
	height: number,
	direction: bigint,
	bankBox: ErgoBox,
	oracleBox: ErgoBox,
	feeMining: bigint
): any {
	//direction = 1n; // 1n or -1n
	//Part 0 - use Fee
	let uiSwapFee;

	const { uiSwapFee: abc, contractERG: contractErg } = applyFeeSell(inputErg, feeMining);
	uiSwapFee = abc;

	// if buy RSV Input ERG -> Clear Fee (f1 + f4)
	// ---------------------------------

	//Part 1 - Get Oracle
	const {
		inErg,
		inSigUSD,
		inSigRSV,
		inCircSigUSD,
		inCircSigRSV,
		oraclePrice,
		bankBox: bankBoxDelete,
		oracleBox: oracleBoxDelete
	}: OracleBoxesData = await extractBoxesData(oracleBox, bankBox);

	// ----------------- REWORK? ----------------
	//Part 2 - Calculate Price (REVERSED)
	let { rateRSVERG: contractRate, requestRSV: contractRSV } = calculateBankRateRSVInputERG(
		inErg,
		inCircSigUSD,
		inCircSigRSV,
		oraclePrice,
		contractErg,
		direction
	);

	//---- DEBUG Price Calculation ----
	//Part 2 - Calculate Price ()
	//Part 2.2 - Reversed round UP ()
	if (direction == -1n) {
		contractRSV = contractRSV + 1n;
	}

	const { rateRSVERG: contractRateCompare, bcDeltaExpectedWithFee: contractErgCompare } =
		calculateBankRateRSVInputRSV(
			inErg,
			inCircSigUSD,
			inCircSigRSV,
			oraclePrice,
			contractRSV,
			direction
		);

	//Adjust fee
	if (contractErg < contractErgCompare) {
		uiSwapFee = uiSwapFee + (contractErgCompare - contractErg);
	}

	const { outErg, outSigUSD, outSigRSV, outCircSigUSD, outCircSigRSV } = calculateOutputRsv(
		inErg,
		inSigUSD,
		inSigRSV,
		inCircSigUSD,
		inCircSigRSV,
		contractRSV,
		contractErgCompare,
		direction
	);

	//Part 4 - Calculate TX
	const unsignedMintTransaction = buildTx_SIGUSD_ERG_RSV(
		direction,
		contractErgCompare,
		contractRSV,
		holderBase58PK,
		bankBase58PK,
		height,
		bankBox,
		oracleBox,
		uiSwapFee,
		utxos,
		outErg,
		outSigUSD,
		outSigRSV,
		outCircSigUSD,
		outCircSigRSV,
		feeMining
	);

	return unsignedMintTransaction;
}

// TODO: ADD RSV
export function calculateIntractionsERGUSD(interactions: Interaction[]) {
	const nanoErgAdd: bigint = BigInt(
		interactions.reduce((a, e) => a + e.ergAmountInNanoErg, 0).toFixed()
	);
	const usdCentAdd: bigint = BigInt(
		interactions
			.filter((i) => i.amountCurrency == 'SigUSD')
			.reduce((a, e) => a + e.amountExact, 0)
			.toFixed()
	);
	return { nanoErgAdd, usdCentAdd };
}
export async function updateUnconfirmedBank(
	bankBoxInNanoErg: bigint,
	bankBoxInCircSigUsdInCent: bigint,
	oraclePriceSigUsd: bigint,
	rsvPriceBuy: number,
	rsvPriceSell: number,
	mempoolInteractions: Interaction[],
	preparedInteractions: Interaction[]
) {
	const { nanoErgAdd: ergAddMem, usdCentAdd: usdAddMem } =
		calculateIntractionsERGUSD(mempoolInteractions);
	const { nanoErgAdd: ergAddPrep, usdCentAdd: usdAddPrep } =
		calculateIntractionsERGUSD(preparedInteractions);

	const newBankErg = bankBoxInNanoErg + ergAddMem + ergAddPrep;
	const newBankUsd = bankBoxInCircSigUsdInCent + usdAddMem + usdAddPrep;

	const { reserveRate, leftUSD, rightRSV } = calculateReserveRateAndBorders(
		newBankErg,
		newBankUsd,
		oraclePriceSigUsd,
		rsvPriceBuy,
		rsvPriceSell
	);
	unconfirmed_bank_erg.set(newBankErg);
	unconfrimed_bank_usd.set(newBankUsd);
	unconfrimed_reserve_border_left_USD.set(leftUSD);
	unconfrimed_reserve_border_right_RSV.set(rightRSV);

	unconfrimed_bank_reserve_rate.set(reserveRate);
}

// TX
export function buildTx_SIGUSD_ERG_USD(
	direction: bigint,
	contractErg: bigint,
	contractUSD: bigint,
	holderBase58PK: string,
	bankBase58PK: string,
	height: number,
	bankBox: any,
	oracleBox: any,
	uiSwapFee: bigint,
	utxos: Array<any>,
	outErg: bigint,
	outSigUSD: bigint,
	outSigRSV: bigint,
	outCircSigUSD: bigint,
	outCircSigRSV: bigint,
	feeMining: bigint
) {
	const myAddr = ErgoAddress.fromBase58(holderBase58PK);
	const bankAddr = ErgoAddress.fromBase58(bankBase58PK);
	const uiAddr = ErgoAddress.fromBase58(UI_FEE_ADDRESS);

	const BankOutBox = new OutputBuilder(outErg, bankAddr)
		.addTokens([
			{ tokenId: TOKEN_SIGUSD, amount: outSigUSD },
			{ tokenId: TOKEN_SIGRSV, amount: outSigRSV },
			{ tokenId: TOKEN_BANK_NFT, amount: 1n }
		])
		.setAdditionalRegisters({
			R4: SLong(BigInt(outCircSigUSD)).toHex(),
			R5: SLong(BigInt(outCircSigRSV)).toHex()
		});

	// ---------- Receipt ------------
	//console.log('direction=', direction, ' -1n?', direction == -1n);
	const receiptBox = new OutputBuilder(
		direction == -1n ? contractErg : SAFE_MIN_BOX_VALUE,
		myAddr
	).setAdditionalRegisters({
		R4: SLong(BigInt(direction * contractUSD)).toHex(),
		R5: SLong(BigInt(direction * contractErg)).toHex()
	});

	if (direction == 1n) {
		receiptBox.addTokens({ tokenId: TOKEN_SIGUSD, amount: contractUSD });
	}

	const uiFeeBox = new OutputBuilder(uiSwapFee, uiAddr);

	const unsignedMintTransaction = new TransactionBuilder(height)
		.from([bankBox, ...utxos])
		.to([BankOutBox, receiptBox, uiFeeBox])
		.sendChangeTo(myAddr)
		.payFee(feeMining)
		.build()
		.toEIP12Object();

	unsignedMintTransaction.dataInputs = [oracleBox];

	return unsignedMintTransaction;
}
export function buildTx_SIGUSD_ERG_RSV(
	direction: bigint,
	contractErg: bigint,
	contractRSV: bigint,
	holderBase58PK: string,
	bankBase58PK: string,
	height: number,
	bankBox: any,
	oracleBox: any,
	uiSwapFee: bigint,
	utxos: Array<any>,
	outErg: bigint,
	outSigUSD: bigint,
	outSigRSV: bigint,
	outCircSigUSD: bigint,
	outCircSigRSV: bigint,
	feeMining: bigint
) {
	const myAddr = ErgoAddress.fromBase58(holderBase58PK);
	const bankAddr = ErgoAddress.fromBase58(bankBase58PK);
	const uiAddr = ErgoAddress.fromBase58(UI_FEE_ADDRESS);

	//OLD

	//STANDART BANK OUT
	const BankOutBox = new OutputBuilder(outErg, bankAddr)
		.addTokens([
			{ tokenId: TOKEN_SIGUSD, amount: outSigUSD },
			{ tokenId: TOKEN_SIGRSV, amount: outSigRSV },
			{ tokenId: TOKEN_BANK_NFT, amount: 1n }
		])
		.setAdditionalRegisters({
			R4: SLong(BigInt(outCircSigUSD)).toHex(),
			R5: SLong(BigInt(outCircSigRSV)).toHex()
		});

	// ---------- Receipt ------------
	const receiptBox = new OutputBuilder(
		direction == -1n ? contractErg : SAFE_MIN_BOX_VALUE,
		myAddr
	).setAdditionalRegisters({
		R4: SLong(BigInt(direction * contractRSV)).toHex(),
		R5: SLong(BigInt(direction * contractErg)).toHex()
	});

	if (direction == 1n) {
		receiptBox.addTokens({ tokenId: TOKEN_SIGRSV, amount: contractRSV });
	}

	const uiFeeBox = new OutputBuilder(uiSwapFee, uiAddr);

	const unsignedMintTransaction = new TransactionBuilder(height)
		.from([bankBox, ...utxos])
		.to([BankOutBox, receiptBox, uiFeeBox])
		.sendChangeTo(myAddr)
		.payFee(feeMining)
		.build()
		.toEIP12Object();

	unsignedMintTransaction.dataInputs = [oracleBox];

	return unsignedMintTransaction;
}
