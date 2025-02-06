import { UI_FEE_ADDRESS } from '../api/ergoNode';
import {
	applyFee,
	applyFeeSell,
	reverseFee,
	reverseFeeSell,
	type Direction
} from './sigmaUSDAndDexy';

import type { LastUserInput, NodeBox, UiInputAsset } from '../stores/bank.types';
import { parseErgUsdOracleBox, parseSigUsdBankBox } from './sigmaUSDParser';
import { buildTx_SIGUSD_ERG_USD, buildTx_SIGUSD_ERG_RSV } from './sigmaUSDBuilder';
import {
	calculateBankRateUSDInputERG,
	calculateBankRateUSDInputUSD,
	calculateBankRateRSVInputERG,
	calculateBankRateRSVInputRSV
} from './sigmaUSDMath';

function calculateBankOutUsd(
	inErg: bigint,
	inSigUSD: bigint,
	inSigRSV: bigint,
	inCircSigUSD: bigint,
	inCircSigRSV: bigint,
	requestSC: bigint,
	requestErg: bigint,
	direction: Direction
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
function calculateBankOutRsv(
	inErg: bigint,
	inSigUSD: bigint,
	inSigRSV: bigint,
	inCircSigUSD: bigint,
	inCircSigRSV: bigint,
	requestRSV: bigint,
	requestErg: bigint,
	direction: Direction
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

// (f1)
export function buyUSDInputERGTx(
	inputErg: bigint,
	holderBase58PK: string,
	bankBase58PK: string,
	utxos: Array<any>,
	height: number,
	bankBox: NodeBox,
	oracleBox: NodeBox,
	feeMining: bigint
): any {
	//Part 0 - use Fee
	const direction: Direction = 1n;

	let { uiSwapFee, contractErg } = applyFee(inputErg, feeMining);

	//Part 1 - Get Oracle
	const { inErg, inSigUSD, inSigRSV, inCircSigUSD, inCircSigRSV } = parseSigUsdBankBox(bankBox);
	const { oraclePrice } = parseErgUsdOracleBox(oracleBox);

	//Part 2 - Calculate Price
	const { requestSC: contractUSD } = calculateBankRateUSDInputERG(
		inErg,
		inCircSigUSD,
		oraclePrice,
		contractErg,
		direction
	);

	//---- DEBUG Price Calculation ----
	//Part 2 - Calculate Price ()
	const { bcDeltaExpectedWithFee: contractErgCompare } = calculateBankRateUSDInputUSD(
		inErg,
		inCircSigUSD,
		oraclePrice,
		contractUSD,
		direction
	);

	//Adjust fee
	if (contractErg > contractErgCompare) uiSwapFee = uiSwapFee + (-contractErgCompare + contractErg);
	// //DEBUG RESULT: Need to Fix:   ----------------------

	//Part 3 - Calculate BankBox
	const { outErg, outSigUSD, outSigRSV, outCircSigUSD, outCircSigRSV } = calculateBankOutUsd(
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
		UI_FEE_ADDRESS,
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
export function buyUSDInputUSDTx(
	inputUSD: bigint,
	holderBase58PK: string,
	bankBase58PK: string,
	utxos: Array<any>,
	height: number,
	bankBox: NodeBox,
	oracleBox: NodeBox,
	feeMining: bigint
): any {
	const direction: Direction = 1n;
	const contractUSD = inputUSD;

	//Part 1 - Get Oracle
	const { inErg, inSigUSD, inSigRSV, inCircSigUSD, inCircSigRSV } = parseSigUsdBankBox(bankBox);
	const { oraclePrice } = parseErgUsdOracleBox(oracleBox);

	//Part 2 - Calculate Price
	const { bcDeltaExpectedWithFee: contractErg } = calculateBankRateUSDInputUSD(
		inErg,
		inCircSigUSD,
		oraclePrice,
		contractUSD,
		direction
	);

	//Part 3 - Calculate BankBox
	const { outErg, outSigUSD, outSigRSV, outCircSigUSD, outCircSigRSV } = calculateBankOutUsd(
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
	const { inputErg, uiSwapFee } = reverseFee(contractErg, feeMining);

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
		UI_FEE_ADDRESS,
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
export function sellUSDInputUSDTx(
	inputUSD: bigint,
	holderBase58PK: string,
	bankBase58PK: string,
	utxos: Array<any>,
	height: number,
	bankBox: NodeBox,
	oracleBox: NodeBox,
	feeMining: bigint
): any {
	const direction: Direction = -1n;
	const contractUSD = inputUSD;

	//Part 1 - Get Oracle
	const { inErg, inSigUSD, inSigRSV, inCircSigUSD, inCircSigRSV } = parseSigUsdBankBox(bankBox);
	const { oraclePrice } = parseErgUsdOracleBox(oracleBox);

	//Part 2 - Calculate Price
	const { bcDeltaExpectedWithFee: contractErg } = calculateBankRateUSDInputUSD(
		inErg,
		inCircSigUSD,
		oraclePrice,
		contractUSD,
		direction
	);

	//Part 3 - Calculate BankBox
	const { outErg, outSigUSD, outSigRSV, outCircSigUSD, outCircSigRSV } = calculateBankOutUsd(
		inErg,
		inSigUSD,
		inSigRSV,
		inCircSigUSD,
		inCircSigRSV,
		contractUSD,
		contractErg,
		direction
	);

	// PART X
	const { userErg, uiSwapFee } = reverseFeeSell(contractErg, feeMining);
	//console.log(contractUSD, 'USD -> ERG ', userErg);

	// PART X - Build
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
		UI_FEE_ADDRESS,
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
export function sellUSDInputERGTx(
	inputErg: bigint,
	holderBase58PK: string,
	bankBase58PK: string,
	utxos: Array<any>,
	height: number,
	bankBox: NodeBox,
	oracleBox: NodeBox,
	feeMining: bigint
): any {
	const direction: Direction = -1n;
	//Part 0 - use Fee

	let uiSwapFee;
	const { uiSwapFee: abc, contractErg } = applyFeeSell(inputErg, feeMining);
	uiSwapFee = abc;

	//Part 1 - Get Oracle
	const { inErg, inSigUSD, inSigRSV, inCircSigUSD, inCircSigRSV } = parseSigUsdBankBox(bankBox);
	const { oraclePrice } = parseErgUsdOracleBox(oracleBox);

	//Part 2.1 - Calculate Price
	let { requestSC: contractUSD } = calculateBankRateUSDInputERG(
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

	const { bcDeltaExpectedWithFee: contractErgCompare } = calculateBankRateUSDInputUSD(
		inErg,
		inCircSigUSD,
		oraclePrice,
		contractUSD,
		direction
	);

	if (contractErg < contractErgCompare) {
		uiSwapFee = uiSwapFee + (contractErgCompare - contractErg);
		//console.log('real sell - fee adjusted');
	}

	//Part 3 - Calculate BankBox
	const { outErg, outSigUSD, outSigRSV, outCircSigUSD, outCircSigRSV } = calculateBankOutUsd(
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
		UI_FEE_ADDRESS,
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
export function buyRSVInputERGTx(
	inputErg: bigint,
	holderBase58PK: string,
	bankBase58PK: string,
	utxos: Array<any>,
	height: number,
	bankBox: NodeBox,
	oracleBox: NodeBox,
	feeMining: bigint
): any {
	const direction: Direction = 1n;
	//Part 0 - use Fee
	let uiSwapFee;

	const { uiSwapFee: abc, contractErg } = applyFee(inputErg, feeMining);
	uiSwapFee = abc;

	// if buy RSV Input ERG -> Clear Fee (f1 + f4)
	// ---------------------------------

	//Part 1 - Get Oracle
	const { inErg, inSigUSD, inSigRSV, inCircSigUSD, inCircSigRSV } = parseSigUsdBankBox(bankBox);
	const { oraclePrice } = parseErgUsdOracleBox(oracleBox);

	// ----------------- REWORK? ----------------
	//Part 2 - Calculate Price (REVERSED)
	const { requestRSV: contractRSV } = calculateBankRateRSVInputERG(
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
	const { bcDeltaExpectedWithFee: contractErgCompare } = calculateBankRateRSVInputRSV(
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

	const { outErg, outSigUSD, outSigRSV, outCircSigUSD, outCircSigRSV } = calculateBankOutRsv(
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
		UI_FEE_ADDRESS,
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
export function buyRSVInputRSVTx(
	requestRSV: bigint,
	holderBase58PK: string,
	bankBase58PK: string,
	utxos: Array<any>,
	height: number,
	bankBox: NodeBox,
	oracleBox: NodeBox,
	feeMining: bigint
): any {
	const direction: Direction = 1n;
	//direction = 1n; // 1n or -1n

	const contractRSV = requestRSV;

	// if buy RSV Input ERG -> Clear Fee (f1 + f4)
	// ---------------------------------

	//Part 1 - Get Oracle
	const { inErg, inSigUSD, inSigRSV, inCircSigUSD, inCircSigRSV } = parseSigUsdBankBox(bankBox);
	const { oraclePrice } = parseErgUsdOracleBox(oracleBox);

	// ----------------- REWORK? ----------------
	//Part 2 - Calculate Price
	const { bcDeltaExpectedWithFee: contractErg } = calculateBankRateRSVInputRSV(
		inErg,
		inCircSigUSD,
		inCircSigRSV,
		oraclePrice,
		requestRSV,
		direction
	);

	const { outErg, outSigUSD, outSigRSV, outCircSigUSD, outCircSigRSV } = calculateBankOutRsv(
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
	const { inputErg, uiSwapFee } = reverseFee(contractErg, feeMining);
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
		UI_FEE_ADDRESS,
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
export function sellRSVInputRSVTx(
	requestRSV: bigint,
	holderBase58PK: string,
	bankBase58PK: string,
	utxos: Array<any>,
	height: number,
	bankBox: NodeBox,
	oracleBox: NodeBox,
	feeMining: bigint
): any {
	const direction: Direction = -1n;
	const contractRSV = requestRSV; // ?

	//Part 1 - Get Oracle
	const { inErg, inSigUSD, inSigRSV, inCircSigUSD, inCircSigRSV } = parseSigUsdBankBox(bankBox);
	const { oraclePrice } = parseErgUsdOracleBox(oracleBox);

	//Part 2 - Calculate Price
	const { bcDeltaExpectedWithFee: contractErg } = calculateBankRateRSVInputRSV(
		inErg,
		inCircSigUSD,
		inCircSigRSV,
		oraclePrice,
		requestRSV,
		direction
	);

	const { outErg, outSigUSD, outSigRSV, outCircSigUSD, outCircSigRSV } = calculateBankOutRsv(
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
	const { userErg, uiSwapFee } = reverseFeeSell(contractErg, feeMining);

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
		UI_FEE_ADDRESS,
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
export function sellRSVInputERGTx(
	inputErg: bigint,
	holderBase58PK: string,
	bankBase58PK: string,
	utxos: Array<any>,
	height: number,
	bankBox: NodeBox,
	oracleBox: NodeBox,
	feeMining: bigint
): any {
	const direction: Direction = -1n;

	let { uiSwapFee, contractErg } = applyFeeSell(inputErg, feeMining);

	const { inErg, inSigUSD, inSigRSV, inCircSigUSD, inCircSigRSV } = parseSigUsdBankBox(bankBox);
	const { oraclePrice } = parseErgUsdOracleBox(oracleBox);

	let { requestRSV: contractRSV } = calculateBankRateRSVInputERG(
		inErg,
		inCircSigUSD,
		inCircSigRSV,
		oraclePrice,
		contractErg,
		direction
	);

	//Part 2 - Calculate Price ()
	if (direction == -1n) {
		contractRSV = contractRSV + 1n;
	}

	const { bcDeltaExpectedWithFee: contractErgCompare } = calculateBankRateRSVInputRSV(
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

	const { outErg, outSigUSD, outSigRSV, outCircSigUSD, outCircSigRSV } = calculateBankOutRsv(
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
		UI_FEE_ADDRESS,
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

// ui
//prettier-ignore
export function buildSwapSigmaUsdTx(fromAsset:UiInputAsset, toAsset:UiInputAsset, lastInput:LastUserInput, me:string, bankAddress:string, utxos:NodeBox[], height:number, bankBox:NodeBox, oracleBox:NodeBox, feeMining:bigint){
		let swapPairLastInput = `${fromAsset.token}/${toAsset.token}_${lastInput == 'From' ? fromAsset.token : toAsset.token}`;
		
		const amount = lastInput == 'From' ? fromAsset.amount : toAsset.amount;
		
		let unsignedTx;
		switch (swapPairLastInput.toLocaleUpperCase()) {
			case 'ERG/SIGUSD_ERG':      unsignedTx = buyUSDInputERGTx (amount!, me, bankAddress, utxos, height, bankBox, oracleBox, feeMining); break;
			case 'ERG/SIGUSD_SIGUSD':   unsignedTx = buyUSDInputUSDTx (amount!, me, bankAddress, utxos, height, bankBox, oracleBox, feeMining); break;
			case 'SIGUSD/ERG_ERG':      unsignedTx = sellUSDInputERGTx(amount!, me, bankAddress, utxos, height, bankBox, oracleBox, feeMining); break;
			case 'SIGUSD/ERG_SIGUSD':   unsignedTx = sellUSDInputUSDTx(amount!, me, bankAddress, utxos, height, bankBox, oracleBox, feeMining); break;
			case 'ERG/SIGRSV_ERG':      unsignedTx = buyRSVInputERGTx (amount!, me, bankAddress, utxos, height, bankBox, oracleBox, feeMining); break;
			case 'ERG/SIGRSV_SIGRSV':   unsignedTx = buyRSVInputRSVTx (amount!, me, bankAddress, utxos, height, bankBox, oracleBox, feeMining); break;
			case 'SIGRSV/ERG_ERG':      unsignedTx = sellRSVInputERGTx(amount!, me, bankAddress, utxos, height, bankBox, oracleBox, feeMining); break;
			case 'SIGRSV/ERG_SIGRSV':   unsignedTx = sellRSVInputRSVTx(amount!, me, bankAddress, utxos, height, bankBox, oracleBox, feeMining); break;
			default:
				throw new Error(`Unsupported swapPair and lastInput combination: ${swapPairLastInput}`);
		}
		return unsignedTx;
	}
