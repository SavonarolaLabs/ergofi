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
	bankBoxInCircSigUsd,
	bankBoxInErg,
	fee_mining,
	oracle_box,
	oraclePriceSigUsd,
	unconfirmed_bank_erg,
	unconfrimed_bank_reserve_rate,
	unconfrimed_bank_usd,
	unconfrimed_reserve_boarder_left_USD,
	updateBestBankBoxLocal
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

export const BASE_INPUT_AMOUNT_ERG = 1n; //100 ERG
export const BASE_INPUT_AMOUNT_USD = 100_00n; //100 USD

// SigUSD
export function calculateBankRateUSDInputUSD(
	inErg: bigint,
	inCircSigUSD: bigint,
	oraclePrice: bigint,
	requestSC: bigint,
	direction: bigint
): { rateSCERG: number; fee: bigint; bcDeltaExpectedWithFee: bigint } {
	let rateSCERG: number;

	const bcReserveNeededIn = inCircSigUSD * oraclePrice;
	const liabilitiesIn: bigint = maxBigInt(minBigInt(bcReserveNeededIn, inErg), 0n);

	const liableRate = liabilitiesIn / inCircSigUSD; // nanoerg for cent
	const scNominalPrice = minBigInt(liableRate, oraclePrice); // nanoerg for cent

	const bcDeltaExpected = scNominalPrice * requestSC; // TO CHANGE
	const fee = absBigInt((bcDeltaExpected * FEE_BANK) / FEE_BANK_DENOM);

	const bcDeltaExpectedWithFee = bcDeltaExpected + fee * direction;
	rateSCERG = Number(requestSC) / Number(bcDeltaExpectedWithFee); // X

	return { rateSCERG, fee, bcDeltaExpectedWithFee };
}
export function calculateBankRateUSDInputERG(
	inErg: bigint,
	inCircSigUSD: bigint,
	oraclePrice: bigint,
	requestErg: bigint,
	direction: bigint
): { rateSCERG: number; fee: bigint; requestSC: bigint } {
	//------------- STABLE PART ---------------
	let rateSCERG: number;
	const bcReserveNeededIn = inCircSigUSD * oraclePrice;
	const liabilitiesIn: bigint = maxBigInt(minBigInt(bcReserveNeededIn, inErg), 0n);
	const liableRate = liabilitiesIn / inCircSigUSD; // nanoerg for cent
	const scNominalPrice = minBigInt(liableRate, oraclePrice); // nanoerg for cent
	const requestSC =
		(requestErg * FEE_BANK_DENOM) / (scNominalPrice * (FEE_BANK_DENOM + FEE_BANK * direction));

	// 2 more params
	const bcDeltaExpected = scNominalPrice * requestSC; // TO CHANGE
	const fee = absBigInt((bcDeltaExpected * FEE_BANK) / FEE_BANK_DENOM);
	rateSCERG = Number(requestSC) / Number(requestErg);

	return { rateSCERG, fee, requestSC }; //cents for nanoerg
}

// SigRSV - pause
export function calculateBankRateRSVInputRSV(
	inErg: bigint,
	inCircSigUSD: bigint,
	inCircSigRSV: bigint,
	oraclePrice: bigint,
	requestRSV: bigint,
	direction: bigint
): { rateRSVERG: number; fee: bigint; bcDeltaExpectedWithFee: bigint } {
	let rateRSVERG: number;
	const bcReserveNeededIn = inCircSigUSD * oraclePrice; // nanoergs
	const liabilitiesIn: bigint = maxBigInt(minBigInt(bcReserveNeededIn, inErg), 0n);

	const equityIn = inErg - liabilitiesIn;
	const equityRate = equityIn / inCircSigRSV; // nanoergs per RSV
	const bcDeltaExpected = equityRate * requestRSV;
	const fee = absBigInt((bcDeltaExpected * FEE_BANK) / FEE_BANK_DENOM);
	const bcDeltaExpectedWithFee = bcDeltaExpected + direction * fee;
	rateRSVERG = Number(requestRSV) / Number(bcDeltaExpectedWithFee);

	return { rateRSVERG, fee, bcDeltaExpectedWithFee };
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

//----------------------------------- FEE ----------------------------------------
export function applyFee(inputERG: bigint) {
	const uiSwapFee = (inputERG * FEE_UI) / FEE_UI_DENOM;
	const contractERG = inputERG - get(fee_mining) - uiSwapFee;
	return { uiSwapFee, contractERG };
}

export function reverseFee(contractERG: bigint) {
	const uiSwapFee = (contractERG * FEE_UI) / (FEE_UI_DENOM - FEE_UI);
	const inputERG = contractERG + get(fee_mining) + uiSwapFee;
	return { inputERG, uiSwapFee };
}

export function reverseFeeSell(contractERG: bigint) {
	const uiSwapFee = (contractERG * FEE_UI) / FEE_UI_DENOM;
	const userERG = contractERG - get(fee_mining) - uiSwapFee;
	return { userERG, uiSwapFee };
}

export function applyFeeSell(inputERG: bigint) {
	const uiSwapFee = (inputERG * FEE_UI) / (FEE_UI_DENOM - FEE_UI);
	const contractERG = inputERG + get(fee_mining) + uiSwapFee;
	return { uiSwapFee, contractERG };
}

//----------------------------------- PRICE/SWAP ----------------------------------------
// (f1.price && f4.price)
export function calculateInputsErg(
	direction: bigint,
	buyAmountInput: any,
	bankBoxInErg: bigint,
	bankBoxInCircSigUsd: bigint,
	oraclePriceSigUsd: bigint
): any {
	const inputAmountERG = new BigNumber(buyAmountInput);
	if (!inputAmountERG.isNaN() && inputAmountERG.gt(0)) {
		const { contractRate, contractFee, contractUSD, contractERG, uiFeeErg, swapFee, swapRate } =
			calculateInputsErgPrice(
				direction,
				inputAmountERG,
				bankBoxInErg,
				bankBoxInCircSigUsd,
				oraclePriceSigUsd
			);

		const totalSigUSD = new BigNumber(contractUSD.toString()).dividedBy('100').toFixed(2);
		const finalPrice = new BigNumber(10000000).multipliedBy(swapRate).toFixed(2);
		const totalFee = new BigNumber(swapFee.toString()).dividedBy('1000000000').toFixed(2);
		return { totalSigUSD, finalPrice, totalFee, contractERG, uiFeeErg };
	} else {
		const { contractRate, contractFee, contractUSD, contractERG, uiFeeErg, swapFee, swapRate } =
			calculateInputsErgPrice(
				direction,
				new BigNumber(BASE_INPUT_AMOUNT_ERG.toString()),
				bankBoxInErg,
				bankBoxInCircSigUsd,
				oraclePriceSigUsd
			);
		const totalSigUSD = '';
		const finalPrice = new BigNumber(10000000).multipliedBy(swapRate).toFixed(2);
		const totalFee = '';
		return { totalSigUSD, finalPrice, totalFee };
	}
}

export function calculateInputsErgPrice(
	direction: bigint,
	buyAmount: BigNumber,
	bankBoxInErg: bigint,
	bankBoxInCircSigUsd: bigint,
	oraclePriceSigUsd: bigint
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
		({ uiSwapFee: uiFeeErg, contractERG } = applyFee(inputErg));
	} else {
		//f4
		//({ uiSwapFee: uiFeeErg, contractERG } = applyFee(inputErg));
		({ uiSwapFee: uiFeeErg, contractERG } = applyFeeSell(inputErg));
	}

	//Part 2 - Calculate Price
	let {
		rateSCERG: contractRate,
		fee: contractFee,
		requestSC: contractUSD
	} = calculateBankRateUSDInputERG(
		bankBoxInErg,
		bankBoxInCircSigUsd,
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
			bankBoxInErg,
			bankBoxInCircSigUsd,
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

	//
	//console.log('TOTAL USER ERG:', contractErgCompare - uiFeeErg - get(fee_mining));

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
	const swapFee = contractFee + get(fee_mining) + uiFeeErg;
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
export function calculateInputsUsd(direction: bigint, buyTotalInput: any): any {
	const totalSigUSD = new BigNumber(buyTotalInput)
		.multipliedBy('100')
		.integerValue(BigNumber.ROUND_CEIL);

	if (!totalSigUSD.isNaN() && totalSigUSD.gt(0)) {
		const { rateSCERG, feeContract, totalErgoRequired, feeTotal, rateTotal } =
			calculateInputsUsdPrice(direction, totalSigUSD);

		//---------------------------------
		const totalErg = new BigNumber(totalErgoRequired.toString()).dividedBy('1000000000').toFixed(9);
		const finalPrice = new BigNumber(10000000).multipliedBy(rateTotal).toFixed(2);
		const totalFee = new BigNumber(feeTotal.toString()).dividedBy('1000000000').toFixed(2);
		return { totalErg, finalPrice, totalFee };
	} else {
		const { rateSCERG, feeContract, totalErgoRequired, feeTotal, rateTotal } =
			calculateInputsUsdPrice(direction, new BigNumber(BASE_INPUT_AMOUNT_USD.toString()));
		const totalErg = '';
		const finalPrice = new BigNumber(10000000).multipliedBy(rateTotal).toFixed(2);
		const totalFee = '';
		return { totalErg, finalPrice, totalFee };
	}
}

export function calculateInputsUsdPrice(direction: bigint, buyTotal: BigNumber): any {
	const totalSC = BigInt(buyTotal.toString());

	let uiFeeErg: bigint;
	let totalErgoRequired: bigint;

	const {
		rateSCERG,
		fee: feeContract,
		bcDeltaExpectedWithFee: contractErgoRequired
	} = calculateBankRateUSDInputUSD(
		get(bankBoxInErg),
		get(bankBoxInCircSigUsd),
		get(oraclePriceSigUsd),
		totalSC,
		direction
	);
	if (direction === 1n) {
		//f2
		({ inputERG: totalErgoRequired, uiSwapFee: uiFeeErg } = reverseFee(contractErgoRequired));
	} else {
		//f3
		////console.log('f3.price');
		////console.log(contractErgoRequired, ' contract ERG');
		({ userERG: totalErgoRequired, uiSwapFee: uiFeeErg } = reverseFeeSell(contractErgoRequired));
	}
	const feeTotal = feeContract + get(fee_mining) + uiFeeErg;
	//console.log(contractErgoRequired - get(fee_mining) - uiFeeErg, ' final ERG');

	//console.log();
	//console.log();

	const rateTotal = new BigNumber(totalSC.toString()).dividedBy(totalErgoRequired.toString());
	return { rateSCERG, feeContract, totalErgoRequired, feeTotal, rateTotal };
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
	const interactionId = addPreparedInteraction(unsignedTx, ownAddressList);
	try {
		const signed = await ergo.sign_tx(unsignedTx);
		addSignedInteraction(signed, interactionId, ownAddressList);
		//console.log({ signed });

		updateBestBankBoxLocal(
			get(confirmed_interactions),
			get(mempool_interactions),
			get(prepared_interactions)
		);

		// const txId = await ergo.submit_tx(signed);
		// //console.log({ txId });
	} catch (e) {
		//console.log(e);
		cancelPreparedInteractionById(interactionId);
	}
}

// (f1)
export async function buyUSDInputERG(inputErg: bigint = 1_000_000_000n) {
	const { me, utxos, height } = await getWeb3WalletData();

	const direction = 1n;
	const tx = await buyUSDInputERGTx(inputErg, me, SIGUSD_BANK_ADDRESS, utxos, height, direction);
	await createInteractionAndSubmitTx(tx, [me]);
}

export async function buyUSDInputERGTx(
	inputErg: bigint,
	holderBase58PK: string,
	bankBase58PK: string,
	utxos: Array<any>,
	height: number,
	direction: bigint
): any {
	//Part 0 - use Fee
	let uiSwapFee;

	const { uiSwapFee: abc, contractERG: contractErg } = applyFee(inputErg);
	uiSwapFee = abc;

	//Part 1 - Get Oracle
	const {
		inErg,
		inSigUSD,
		inSigRSV,
		inCircSigUSD,
		inCircSigRSV,
		oraclePrice,
		bankBox,
		oracleBox
	}: OracleBoxesData = await extractBoxesData(get(oracle_box), get(bank_box));

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
		outCircSigRSV
	);

	//console.log(unsignedMintTransaction);
	return unsignedMintTransaction;
}

// (f2)
export async function buyUSDInputUSD(inputUSD: bigint = 1_00n) {
	const { me, utxos, height } = await getWeb3WalletData();

	const direction = 1n;
	const tx = await buyUSDInputUSDTx(inputUSD, me, SIGUSD_BANK_ADDRESS, utxos, height, direction);
	await createInteractionAndSubmitTx(tx, [me]);
}

export async function buyUSDInputUSDTx(
	inputUSD: bigint,
	holderBase58PK: string,
	bankBase58PK: string,
	utxos: Array<any>,
	height: number,
	direction: bigint
): any {
	const myAddr = ErgoAddress.fromBase58(holderBase58PK);
	const bankAddr = ErgoAddress.fromBase58(bankBase58PK);
	const uiAddr = ErgoAddress.fromBase58(UI_FEE_ADDRESS);

	const contractUSD = inputUSD;

	//Part 1 - Get Oracle
	const {
		inErg,
		inSigUSD,
		inSigRSV,
		inCircSigUSD,
		inCircSigRSV,
		oraclePrice,
		bankBox,
		oracleBox
	}: OracleBoxesData = await extractBoxesData(get(oracle_box), get(bank_box));

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
	const { inputERG, uiSwapFee } = reverseFee(contractErg);

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
		outCircSigRSV
	); //UserErg is not important?

	//console.log(unsignedMintTransaction);
	return unsignedMintTransaction;
}

// (f3)
export async function sellUSDInputUSD(inputUSD: bigint = 1_00n) {
	const { me, utxos, height } = await getWeb3WalletData();

	const direction = -1n;
	const tx = await sellUSDInputUSDTx(inputUSD, me, SIGUSD_BANK_ADDRESS, utxos, height, direction);
	await createInteractionAndSubmitTx(tx, [me]);
}

export async function sellUSDInputUSDTx(
	inputUSD: bigint,
	holderBase58PK: string,
	bankBase58PK: string,
	utxos: Array<any>,
	height: number,
	direction: bigint
): any {
	const myAddr = ErgoAddress.fromBase58(holderBase58PK);
	const bankAddr = ErgoAddress.fromBase58(bankBase58PK);
	const uiAddr = ErgoAddress.fromBase58(UI_FEE_ADDRESS);

	const contractUSD = inputUSD;

	//Part 1 - Get Oracle
	const {
		inErg,
		inSigUSD,
		inSigRSV,
		inCircSigUSD,
		inCircSigRSV,
		oraclePrice,
		bankBox,
		oracleBox
	}: OracleBoxesData = await extractBoxesData(get(oracle_box), get(bank_box));

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
	const { userERG, uiSwapFee } = reverseFeeSell(contractERG);
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
		outCircSigRSV
	);

	//console.log(unsignedMintTransaction);
	return unsignedMintTransaction;
}

// (f4)
export async function sellUSDInputERG(inputErg: bigint = 1_000_000_000n) {
	const { me, utxos, height } = await getWeb3WalletData();

	const direction = -1n;
	const tx = await sellUSDInputERGTx(inputErg, me, SIGUSD_BANK_ADDRESS, utxos, height, direction);
	await createInteractionAndSubmitTx(tx, [me]);
}

export async function sellUSDInputERGTx(
	inputErg: bigint,
	holderBase58PK: string,
	bankBase58PK: string,
	utxos: Array<any>,
	height: number,
	direction: bigint
): any {
	//Part 0 - use Fee
	let uiSwapFee;
	const { uiSwapFee: abc, contractERG: contractErg } = applyFeeSell(inputErg);
	uiSwapFee = abc;

	//Part 1 - Get Oracle
	const {
		inErg,
		inSigUSD,
		inSigRSV,
		inCircSigUSD,
		inCircSigRSV,
		oraclePrice,
		bankBox,
		oracleBox
	}: OracleBoxesData = await extractBoxesData(get(oracle_box), get(bank_box));

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
		outCircSigRSV
	);

	//console.log(unsignedMintTransaction);
	return unsignedMintTransaction;
}

// TOOL:
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
	outCircSigRSV: bigint
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
		.payFee(get(fee_mining))
		.build()
		.toEIP12Object();

	unsignedMintTransaction.dataInputs = [oracleBox];

	return unsignedMintTransaction;
}

// Reserve Rate
export function calculateReserveRateAndBorders(
	inErg: bigint,
	inCircSigUSD: bigint,
	oraclePrice: bigint
): any {
	// //console.log(inErg, 'inErg');
	// //console.log(oraclePrice, 'oraclePrice');

	const oraclePriceErgCents = BigNumber(10 ** 9).dividedBy(oraclePrice.toString());
	const reserveRateOld = Number(
		BigNumber(inErg.toString()) // nanoergi
			.multipliedBy(oraclePriceErgCents)
			.dividedBy(inCircSigUSD.toString())
			.dividedBy(10 ** 9)
			.multipliedBy(100)
			.toFixed(0)
	);

	const leftBoarderValue = 400;
	let leftBoarderDelta;
	const rightBoarderValue = 800;
	let rightBoarderDelta;
	// Clear convert
	const bankERG = BigNumber(inErg.toString()).dividedBy(10 ** 9); //convert to ERG
	const bankUSD = BigNumber(inCircSigUSD.toString()).dividedBy(100); //convert to USD
	const price = BigNumber(10 ** 9)
		.dividedBy(BigNumber(oraclePrice.toString()))
		.dividedBy(100); //convert to ERG / USD price

	const reserveRate = Number(
		bankERG.multipliedBy(price).dividedBy(bankUSD).multipliedBy(100).toFixed(0)
	); // as function

	const leftBorder = 4;
	const rightBorder = 8;

	function calculateBoarder(
		boarder: number,
		bankUSD: BigNumber,
		bankERG: BigNumber,
		price: BigNumber
	) {
		const a_Left = BigNumber(bankERG).multipliedBy(price);
		const b_Left = BigNumber(bankUSD).multipliedBy(boarder);
		const delta_a_b_Left = a_Left.minus(b_Left);
		const boarderUSD = delta_a_b_Left.dividedBy(boarder - 1);
		return boarderUSD;
	}

	const leftUSD = Number(calculateBoarder(leftBorder, bankUSD, bankERG, price).toFixed(0));
	const rightUSD = Number(calculateBoarder(rightBorder, bankUSD, bankERG, price).toFixed(0));
	const leftERG = Number(BigNumber(leftUSD).dividedBy(price).toFixed(0));
	const rightERG = Number(BigNumber(rightUSD).dividedBy(price).toFixed(0));

	return { reserveRate, leftUSD, rightUSD, leftERG, rightERG };
}

export function calculateIntractionsERGUSD(interactions: Interaction[]) {
	const ergAdd: bigint = BigInt(
		(interactions.reduce((a, e) => a + e.ergAmount, 0) * 10 ** 9).toFixed()
	);
	const usdAdd: bigint = BigInt(
		(interactions.reduce((a, e) => a + e.amount, 0) * 10 ** 2).toFixed()
	);
	return { ergAdd, usdAdd };
}

export async function updateUnconfirmedBank() {
	const { ergAdd: ergAddMem, usdAdd: usdAddMem } = calculateIntractionsERGUSD(
		get(mempool_interactions)
	);
	const { ergAdd: ergAddPrep, usdAdd: usdAddPrep } = calculateIntractionsERGUSD(
		get(prepared_interactions)
	);

	const newBankErg = get(bankBoxInErg) + ergAddMem + ergAddPrep;
	const newBankUsd = get(bankBoxInCircSigUsd) + usdAddMem + usdAddPrep;

	const { reserveRate, leftUSD, rightUSD, leftERG, rightERG } = calculateReserveRateAndBorders(
		newBankErg,
		newBankUsd,
		get(oraclePriceSigUsd)
	);
	unconfirmed_bank_erg.set(newBankErg);
	unconfrimed_bank_usd.set(newBankUsd);
	unconfrimed_reserve_boarder_left_USD.set(leftUSD);
	unconfrimed_bank_reserve_rate.set(reserveRate);
}
