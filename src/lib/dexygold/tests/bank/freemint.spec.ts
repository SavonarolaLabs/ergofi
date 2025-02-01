import { directionBuy, directionSell, UI_FEE_ADDRESS } from '$lib/api/ergoNode';
import { debugArbmint, debugFreemint, debugRedeem } from '$lib/dexygold/debugContracts';
import { MockChain } from '@fleet-sdk/mock-chain';

import {
	vitestTokenIds,
	vitestErgoTrees,
	realMintedTestBoxes,
	vitestContractConfig
} from '$lib/dexygold/dexyConstants';
import { bankMint, bankMintInpuErg, lpSwapInputDexy, lpSwapInputErg } from '$lib/dexygold/dexyGold';
import { signTx } from '$lib/dexygold/signing';
import { BOB_MNEMONIC } from '$lib/private/mnemonics';
import { applyFee, applyFeeSell, reverseFee, reverseFeeSell } from '$lib/sigmaUSDAndDexy';
import {
	parseBankArbitrageMintBox,
	parseBankBox,
	parseBankFreeMintBox,
	parseBuybackBox,
	parseDexyGoldOracleBox,
	parseLpBox,
	parseLpMintBox,
	parseLpRedeemBox,
	parseLpSwapBox,
	parseTrackingBox
} from '$lib/stores/dexyGoldParser';
import {
	dexygold_bank_arbitrage_mint_box,
	dexygold_bank_box,
	dexygold_bank_free_mint_box,
	dexygold_buyback_box,
	dexygold_lp_box,
	dexygold_lp_mint_box,
	dexygold_lp_redeem_box,
	dexygold_lp_swap_box,
	dexygold_tracking101_box,
	fakeUserBox,
	fakeUserWithDexyBox,
	initTestBoxes,
	mintInitialOutputs,
	oracle_erg_xau_box
} from '$lib/stores/dexyGoldStore';
import { nanoErgToErg } from '$lib/TransactionUtils';
import {
	ErgoUnsignedInput,
	OutputBuilder,
	RECOMMENDED_MIN_FEE_VALUE,
	SInt,
	SLong,
	TransactionBuilder
} from '@fleet-sdk/core';
import { before } from 'node:test';
import { get } from 'svelte/store';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

// take input from

const {
	trackingErgoTree,
	bankUpdateErgoTree,
	ballotErgoTree,
	interventionErgoTree,
	interventionUpdateErgoTree,
	buybackErgoTree,
	payoutErgoTree,
	freeMintErgoTree,
	bankErgoTree,
	arbitrageMintErgoTree,
	lpErgoTree,
	lpMintErgoTree,
	lpRedeemErgoTree,
	extractScriptErgoTree: extractErgoTree,
	extractUpdateErgoTree,
	swapErgoTree: lpSwapErgoTree,
	lpSwapBuyV1ErgoTree,
	lpSwapSellV1ErgoTree,
	oracleErgoTree,
	fakeScriptErgoTree
} = vitestErgoTrees;

const {
	gort,
	gortId,
	oracleTokenId,
	oraclePoolNFT,
	oracleNFT,
	gortDevEmissionNFT,
	gortLpNFT,
	buybackNFT,
	lpNFT,
	lpSwapNFT,
	lpMintNFT,
	lpRedeemNFT,
	lpTokenId,
	tracking95NFT,
	tracking98NFT,
	tracking101NFT,
	bankNFT,
	updateNFT,
	ballotTokenId,
	interventionNFT,
	extractionNFT,
	arbitrageMintNFT,
	freeMintNFT,
	payoutNFT,
	dexyTokenId,
	dexyUSD,
	lpToken
} = vitestTokenIds;

const { initialDexyTokens, initialLp, feeNumLp, feeDenomLp } = vitestContractConfig;
const dummyTokenId = '0000005aa0d95f5d54a7bc89c46730d9662397067250aa18a0039631c0f5b801';

// Constants from Scala code:
const fakeNanoErgs = 10_000_000_000_000n; // large funding
const dummyNanoErgs = 100_000n;
const minStorageRent = 1_000_000n;
const fee = 1_000_000n;

// If you want to replicate the Scala "changeAddress" as "fakeScript":
const changeAddress = fakeScriptErgoTree;
// const dexyUSD = dexyTokenId;
// const lpToken = lpTokenId;
export function calculateLpMintInputErg(
	contractErg: bigint,
	lpXIn: bigint,
	lpYIn: bigint,
	supplyLpIn: bigint
) {
	const contractLpTokens: bigint = (contractErg * supplyLpIn) / lpXIn;
	const contractDexy = (contractErg * (lpYIn * supplyLpIn)) / (supplyLpIn * lpXIn) + 1n; //roundUp bigInt + low values
	// console.log('contractErg', contractErg);
	// console.log('lpYIn * supplyLpIn', lpYIn * supplyLpIn);
	// console.log('contractErg*lpYIn * supplyLpIn', contractErg * lpYIn * supplyLpIn);
	// console.log(
	// 	'contractErg*lpYIn * supplyLpIn/supplyLpIn',
	// 	(contractErg * lpYIn * supplyLpIn) / supplyLpIn
	// );
	// console.log(
	// 	'contractErg*lpYIn * supplyLpIn/supplyLpIn/lpXIn',
	// 	(contractErg * lpYIn * supplyLpIn) / supplyLpIn / lpXIn
	// );

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
function calculateLpRedeemInputErg(
	contractErg: bigint,
	lpXIn: bigint,
	lpYIn: bigint,
	supplyLpIn: bigint
) {
	let contractLpTokens = (100n * supplyLpIn * contractErg) / (98n * lpXIn);
	const contractDexy = (98n * contractLpTokens * lpYIn) / (100n * supplyLpIn); //- 1n;
	// const contractDexy =
	// 	(98n * (100n * supplyLpIn * contractErg) * lpYIn) / (100n * supplyLpIn * 98n * lpXIn //- 1n;
	contractLpTokens = contractLpTokens + 1n; // add after calc
	return { contractDexy, contractErg, contractLpTokens };
}
function calculateLpRedeemInputDexy(
	contractDexy: bigint,
	lpXIn: bigint,
	lpYIn: bigint,
	supplyLpIn: bigint
) {
	let contractLpTokens = (100n * supplyLpIn * contractDexy) / (98n * lpYIn);
	const contractErg = (98n * contractLpTokens * lpXIn) / (100n * supplyLpIn); //- 1n;
	//const contractDexy = (98n * contractLpTokens * lpYIn) / (100n * supplyLpIn); //- 1n;
	//const contractErg  = (98n * contractLpTokens * lpXIn) / (100n * supplyLpIn); //- 1n;
	contractLpTokens = contractLpTokens + 1n; // add after calc
	return { contractDexy, contractErg, contractLpTokens };
}

describe('Bank Mint with any input should work', async () => {
	beforeAll(() => {
		initTestBoxes();
	});

	let mockChain: MockChain;

	beforeEach(() => {
		// Start each test with a fresh chain at height ~1M
		mockChain = new MockChain({ height: 1_000_000 });
	});

	afterEach(() => {
		mockChain.reset();
	});

	it('🍒 Free		: Not reset : Input Dexy', async () => {
		//input BOXES

		//const lpRedeemIn = get(dexygold_lp_redeem_box);
		//----------------- Arb Mint -------------------
		const freeMintIn = get(dexygold_bank_free_mint_box);
		const {
			value: freeMintXIn,
			freeMintNFT,
			R4ResetHeight,
			R5AwailableAmount
		} = parseBankFreeMintBox(freeMintIn);
		//console.log(' ');
		//console.log('----------------- Arb Mint -------------------');
		//console.dir(arbMintIn, { depth: null });
		//console.log('arbMintIn', arbMintXIn, arbitrageMintNFT, R4ResetHeight, R5AwailableAmount);
		//------------------------------------------------

		//----------------- Check Bank -------------------
		const bankIn = get(dexygold_bank_box);
		const { value: bankXIn, bankNFT, dexyAmount: bankYIn } = parseBankBox(bankIn);
		//console.log(' ');
		//console.log('----------------- Check Bank -------------------');
		//console.dir(bankIn, { depth: null });
		//console.log('bankIn', bankXIn, bankNFT, bankYIn);
		//------------------------------------------------

		//------------------- Buyback --------------------
		const buybankIn = get(dexygold_buyback_box);
		const { value: buybackXIn, buybackNFT, gortAmount } = parseBuybackBox(buybankIn);
		//console.log(' ');
		//console.log('------------------- Buyback --------------------');
		//console.dir(buybankIn, { depth: null });
		//console.log('buybankIn', buybackXIn, buybackNFT, gortAmount);
		//------------------------------------------------

		//------------------ Tracking --------------------
		const tracking = get(dexygold_tracking101_box);
		const { value, trackingNFT, R4Target, R5Denom, R6IsBelow, R7TriggeredHeight } =
			parseTrackingBox(tracking);
		//console.log(' ');
		//console.log('------------------ Tracking --------------------');
		//console.dir(tracking, { depth: null });
		//console.log('tracking:', value, trackingNFT, R4Target, R5Denom, R6IsBelow, R7TriggeredHeight);
		//------------------------------------------------

		//------------------ LP --------------------
		const lpIn = get(dexygold_lp_box);
		const { dexyAmount: lpYData, value: lpXData, lpTokenAmount } = parseLpBox(lpIn);
		//console.log(' ');
		//console.log('------------------ LP --------------------');
		//console.dir(lpIn, { depth: null });
		//console.log('lpIn:', lpXData, lpYData, lpTokenAmount);
		//------------------------------------------------

		//------------------ Oracle --------------------
		const goldOracle = get(oracle_erg_xau_box);
		const { oraclePoolNFT, R4Rate: oracleRateData } = parseDexyGoldOracleBox(goldOracle);
		//console.log(' ');
		//console.log('------------------ Oracle --------------------');
		//console.dir(goldOracle, { depth: null });
		//console.log('goldOracle:', oraclePoolNFT, oracleRateData);
		//------------------------------------------------

		const dataInputs = [goldOracle, lpIn]; //, tracking];
		const userUtxos = [fakeUserWithDexyBox];

		//user Inputs
		const height = 1449119; // + 10; //+10 = Reseted
		const ergoInput = 1_000_000_000n;

		//constants
		const feeMining = RECOMMENDED_MIN_FEE_VALUE;
		const userAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';
		const userChangeAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';

		//constants v2
		const T_free = 360n;
		const T_arb = 30n;
		const thresholdPercent = 101n;
		const T_buffer = 5n;
		const bankFeeNum = 3n;
		const buybackFeeNum = 2n;
		const feeDenom = 1000n;

		//Check result in contract
		const lpRate = lpXData / lpYData; //bigint?
		const lpRateNum = Number(lpXData) / Number(lpYData); //or number?
		console.log('lpRate ', lpRate, ' vs ', lpRateNum, '	bigint vs num');

		// val oracleRate = oracleBox.R4[Long].get / 1000000L
		const oracleRate = oracleRateData / 1_000_000n;
		const oracleRateNum = Number(oracleRateData) / 1_000_000;
		console.log('Oracle ', oracleRate, ' vs ', oracleRateNum, '	bigint vs num');

		const dexyMinted = 3000n; // same in TEST

		const { contractErg, bankErgsAdded, buybackErgsAdded, bankRate, buybackRate } = bankMint(
			oracleRate,
			1n,
			bankFeeNum,
			buybackFeeNum,
			feeDenom,
			dexyMinted
		);

		console.log(
			contractErg,
			bankErgsAdded,
			buybackErgsAdded,
			contractErg == bankErgsAdded + buybackErgsAdded,
			bankRate,
			buybackRate
		);

		const oracleRateWithFee = bankRate + buybackRate; // bigint
		console.log(oracleRateWithFee, oracleRateWithFee - (oracleRate * 100_500n) / 100_000n);
		console.log('oracleRateWithFee', oracleRateWithFee);
		//Treshhold: (Oracle x 99% => Free Valid and Arb not Valid)
		//FreeMint (98 * oracleRate)
		const validRateFreeMint = lpRate * 100n > oracleRate * 98n;
		console.log(validRateFreeMint, 'validRate FreeMint');
		//Arb mint (101,505 * oracleRate)
		const validThreshold = lpRate * 100n > thresholdPercent * oracleRateWithFee;
		console.log(validThreshold, 'validRate ArbMint');

		// Refresh Amount:
		//Free MINT:
		const maxAllowedIfResetFree = lpYData / 100n; // max 1% of LP dexy reserves to free-mint per period
		console.log(maxAllowedIfResetFree, 'refreshAmount FreeMint');
		//ARB MINT :
		const maxAllowedIfResetArb = (lpXData - oracleRateWithFee * lpYData) / oracleRateWithFee;
		console.log(maxAllowedIfResetArb, 'refreshAmount ArbMint');

		//Free/Arb remaining:
		const remainingDexyIn = R5AwailableAmount;

		// // HEIGHT ?
		//isCounterReset = HEIGHT > selfInR4
		let isCounterReset = height > R4ResetHeight;
		console.log(height > R4ResetHeight, height, ' vs ', R4ResetHeight);

		// HEIGHT ?
		let remainingDexyOut;

		//let dexyMinted = contractDexy; //''
		let availableToMint;
		let resetHeightOut;

		//isCounterReset = false; //for test
		if (isCounterReset) {
			console.log('Reset +');
			resetHeightOut = height + Number(T_free + T_buffer - 1n); //<== //360 => 365
			availableToMint = maxAllowedIfResetFree;
			console.log('availableToMint ', availableToMint);
			remainingDexyOut = availableToMint - dexyMinted;
		} else {
			console.log('---NOT RESETED---');
			resetHeightOut = R4ResetHeight; //
			availableToMint = R5AwailableAmount; //
			if (remainingDexyIn < dexyMinted) {
				console.log('Not reset | Not enough Dexy');
			}
			remainingDexyOut = availableToMint - dexyMinted;
		}
		expect(remainingDexyOut).toBeGreaterThanOrEqual(0);

		console.log(resetHeightOut, ' resetHeightOut');
		console.log(remainingDexyOut, ' remainingDexyOut');

		// const isReset = height > R4ResetHeight; //  val isCounterReset = HEIGHT > selfInR4	//R4ResetHeight
		// const remainingDexyIn = R5AwailableAmount;
		// let remainingDexyOut;

		// let dexyMinted = contractDexy; //''
		// let availableToMint;
		// let resetHeightOut;

		//bankErgsAdded, buybackErgsAdded
		const bankXOut = bankXIn + bankErgsAdded; // ?
		const bankYOut = bankYIn - dexyMinted; // ?
		const buybackXOut = buybackXIn + buybackErgsAdded; // RECALCULATE

		const freeMintXOut = freeMintXIn;

		const buybackBoxIn = new ErgoUnsignedInput(buybankIn);
		buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });

		//------------------------------
		const bankOut = new OutputBuilder(bankXOut, bankErgoTree).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyTokenId, amount: bankYOut }
		]);

		const freeMintOut = new OutputBuilder(freeMintXOut, freeMintErgoTree)
			.addTokens([{ tokenId: freeMintNFT, amount: 1n }])
			.setAdditionalRegisters({
				R4: SInt(Number(resetHeightOut)).toHex(),
				R5: SLong(BigInt(remainingDexyOut)).toHex()
			});

		const buybackOut = new OutputBuilder(buybackXOut, buybackErgoTree).addTokens([
			{ tokenId: buybackNFT, amount: 1n },
			{ tokenId: gort, amount: gortAmount }
		]);

		const unsignedTx = new TransactionBuilder(height)
			.from([freeMintIn, bankIn, buybackBoxIn, ...userUtxos], {
				ensureInclusion: true
			})
			.withDataFrom(dataInputs)
			.to(freeMintOut)
			.to(bankOut)
			.to(buybackOut)
			.payFee(feeMining)
			.sendChangeTo(userChangeAddress)
			.build()
			.toEIP12Object();

		debugFreemint(unsignedTx);

		//console.dir(unsignedTx, { depth: null });
		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC);
		expect(signedTx).toBeTruthy();
	});

	it('Free		: RESET	: Input Dexy', async () => {
		//input BOXES

		//const lpRedeemIn = get(dexygold_lp_redeem_box);
		//----------------- Arb Mint -------------------
		const freeMintIn = get(dexygold_bank_free_mint_box);
		const {
			value: freeMintXIn,
			freeMintNFT,
			R4ResetHeight,
			R5AwailableAmount
		} = parseBankFreeMintBox(freeMintIn);
		//console.log(' ');
		//console.log('----------------- Arb Mint -------------------');
		//console.dir(arbMintIn, { depth: null });
		//console.log('arbMintIn', arbMintXIn, arbitrageMintNFT, R4ResetHeight, R5AwailableAmount);
		//------------------------------------------------

		//----------------- Check Bank -------------------
		const bankIn = get(dexygold_bank_box);
		const { value: bankXIn, bankNFT, dexyAmount: bankYIn } = parseBankBox(bankIn);
		//console.log(' ');
		//console.log('----------------- Check Bank -------------------');
		//console.dir(bankIn, { depth: null });
		//console.log('bankIn', bankXIn, bankNFT, bankYIn);
		//------------------------------------------------

		//------------------- Buyback --------------------
		const buybankIn = get(dexygold_buyback_box);
		const { value: buybackXIn, buybackNFT, gortAmount } = parseBuybackBox(buybankIn);
		//console.log(' ');
		//console.log('------------------- Buyback --------------------');
		//console.dir(buybankIn, { depth: null });
		//console.log('buybankIn', buybackXIn, buybackNFT, gortAmount);
		//------------------------------------------------

		//------------------ Tracking --------------------
		const tracking = get(dexygold_tracking101_box);
		const { value, trackingNFT, R4Target, R5Denom, R6IsBelow, R7TriggeredHeight } =
			parseTrackingBox(tracking);
		//console.log(' ');
		//console.log('------------------ Tracking --------------------');
		//console.dir(tracking, { depth: null });
		//console.log('tracking:', value, trackingNFT, R4Target, R5Denom, R6IsBelow, R7TriggeredHeight);
		//------------------------------------------------

		//------------------ LP --------------------
		const lpIn = get(dexygold_lp_box);
		const { dexyAmount: lpYData, value: lpXData, lpTokenAmount } = parseLpBox(lpIn);
		//console.log(' ');
		//console.log('------------------ LP --------------------');
		//console.dir(lpIn, { depth: null });
		//console.log('lpIn:', lpXData, lpYData, lpTokenAmount);
		//------------------------------------------------

		//------------------ Oracle --------------------
		const goldOracle = get(oracle_erg_xau_box);
		const { oraclePoolNFT, R4Rate: oracleRateData } = parseDexyGoldOracleBox(goldOracle);
		//console.log(' ');
		//console.log('------------------ Oracle --------------------');
		//console.dir(goldOracle, { depth: null });
		//console.log('goldOracle:', oraclePoolNFT, oracleRateData);
		//------------------------------------------------

		const dataInputs = [goldOracle, lpIn]; //, tracking];
		const userUtxos = [fakeUserWithDexyBox];

		//user Inputs
		const height = 1449119 + 11; // + 10; //+10 = Reseted
		const ergoInput = 1_000_000_000n;

		//constants
		const feeMining = RECOMMENDED_MIN_FEE_VALUE;
		const userAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';
		const userChangeAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';

		//constants v2
		const T_free = 360n;
		const T_arb = 30n;
		const thresholdPercent = 101n;
		const T_buffer = 5n;
		const bankFeeNum = 3n;
		const buybackFeeNum = 2n;
		const feeDenom = 1000n;

		//Check result in contract
		const lpRate = lpXData / lpYData; //bigint?
		const lpRateNum = Number(lpXData) / Number(lpYData); //or number?
		console.log('lpRate ', lpRate, ' vs ', lpRateNum, '	bigint vs num');

		// val oracleRate = oracleBox.R4[Long].get / 1000000L
		const oracleRate = oracleRateData / 1_000_000n;
		const oracleRateNum = Number(oracleRateData) / 1_000_000;
		console.log('Oracle ', oracleRate, ' vs ', oracleRateNum, '	bigint vs num');

		const dexyMinted = 3000n - 1n; // same in TEST

		const { contractErg, bankErgsAdded, buybackErgsAdded, bankRate, buybackRate } = bankMint(
			oracleRate,
			1n,
			bankFeeNum,
			buybackFeeNum,
			feeDenom,
			dexyMinted
		);

		console.log(
			contractErg,
			bankErgsAdded,
			buybackErgsAdded,
			contractErg == bankErgsAdded + buybackErgsAdded,
			bankRate,
			buybackRate
		);

		const oracleRateWithFee = bankRate + buybackRate; // bigint
		console.log(oracleRateWithFee, oracleRateWithFee - (oracleRate * 100_500n) / 100_000n);
		console.log('oracleRateWithFee', oracleRateWithFee);
		//Treshhold: (Oracle x 99% => Free Valid and Arb not Valid)
		//FreeMint (98 * oracleRate)
		const validRateFreeMint = lpRate * 100n > oracleRate * 98n;
		console.log(validRateFreeMint, 'validRate FreeMint');
		//Arb mint (101,505 * oracleRate)
		const validThreshold = lpRate * 100n > thresholdPercent * oracleRateWithFee;
		console.log(validThreshold, 'validRate ArbMint');

		// Refresh Amount:
		//Free MINT:
		const maxAllowedIfResetFree = lpYData / 100n; // max 1% of LP dexy reserves to free-mint per period
		console.log(maxAllowedIfResetFree, 'refreshAmount FreeMint');
		//ARB MINT :
		const maxAllowedIfResetArb = (lpXData - oracleRateWithFee * lpYData) / oracleRateWithFee;
		console.log(maxAllowedIfResetArb, 'refreshAmount ArbMint');

		//Free/Arb remaining:
		const remainingDexyIn = R5AwailableAmount;

		// // HEIGHT ?
		//isCounterReset = HEIGHT > selfInR4
		let isCounterReset = height > R4ResetHeight;
		console.log(height > R4ResetHeight, height, ' vs ', R4ResetHeight);

		// HEIGHT ?
		let remainingDexyOut;

		//let dexyMinted = contractDexy; //''
		let availableToMint;
		let resetHeightOut;

		//isCounterReset = false; //for test
		if (isCounterReset) {
			console.log('Reset +');
			resetHeightOut = height + Number(T_free + T_buffer - 1n); //<== //360 => 365
			availableToMint = maxAllowedIfResetFree;
			console.log('availableToMint ', availableToMint);
			remainingDexyOut = availableToMint - dexyMinted;
		} else {
			console.log('---NOT RESETED---');
			resetHeightOut = R4ResetHeight; //
			availableToMint = R5AwailableAmount; //
			if (remainingDexyIn < dexyMinted) {
				console.log('Not reset | Not enough Dexy');
			}
			remainingDexyOut = availableToMint - dexyMinted;
		}
		expect(remainingDexyOut).toBeGreaterThanOrEqual(0);

		console.log(resetHeightOut, ' resetHeightOut');
		console.log(remainingDexyOut, ' remainingDexyOut');

		// const isReset = height > R4ResetHeight; //  val isCounterReset = HEIGHT > selfInR4	//R4ResetHeight
		// const remainingDexyIn = R5AwailableAmount;
		// let remainingDexyOut;

		// let dexyMinted = contractDexy; //''
		// let availableToMint;
		// let resetHeightOut;

		//bankErgsAdded, buybackErgsAdded
		const bankXOut = bankXIn + bankErgsAdded; // ?
		const bankYOut = bankYIn - dexyMinted; // ?
		const buybackXOut = buybackXIn + buybackErgsAdded; // RECALCULATE

		const freeMintXOut = freeMintXIn;

		const buybackBoxIn = new ErgoUnsignedInput(buybankIn);
		buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });

		//------------------------------
		const bankOut = new OutputBuilder(bankXOut, bankErgoTree).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyTokenId, amount: bankYOut }
		]);

		const freeMintOut = new OutputBuilder(freeMintXOut, freeMintErgoTree)
			.addTokens([{ tokenId: freeMintNFT, amount: 1n }])
			.setAdditionalRegisters({
				R4: SInt(Number(resetHeightOut)).toHex(),
				R5: SLong(BigInt(remainingDexyOut)).toHex()
			});

		const buybackOut = new OutputBuilder(buybackXOut, buybackErgoTree).addTokens([
			{ tokenId: buybackNFT, amount: 1n },
			{ tokenId: gort, amount: gortAmount }
		]);

		const unsignedTx = new TransactionBuilder(height)
			.from([freeMintIn, bankIn, buybackBoxIn, ...userUtxos], {
				ensureInclusion: true
			})
			.withDataFrom(dataInputs)
			.to(freeMintOut)
			.to(bankOut)
			.to(buybackOut)
			.payFee(feeMining)
			.sendChangeTo(userChangeAddress)
			.build()
			.toEIP12Object();

		//console.dir(unsignedTx, { depth: null });
		debugFreemint(unsignedTx);
		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC);
		expect(signedTx).toBeTruthy();
	});

	it('Free mint - NOT RESET ', () => {
		const oracleRateXy = 10000n * 1000000n; // 10^10
		const bankFeeNum = 3n; // => 0.5% fee part
		const buybackFeeNum = 2n; // => 0.5% fee part
		const feeDenom = 1000n;

		const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / 1000000n; // => 10030
		const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / 1000000n; // => 20

		const lpBalance = 100000000n;
		const lpReservesX = 100000000000000n;
		const lpReservesY = 10000000000n;

		const dexyMinted = 35000n; // positive
		const bankErgsAdded = bankRate * dexyMinted; // 10030 * 35000
		const buybackErgsAdded = buybackRate * dexyMinted; // 20 * 35000

		const bankReservesXIn = 100000000000000n;
		const bankReservesYIn = 90200000100n;
		const bankReservesYOut = bankReservesYIn - dexyMinted;
		const bankReservesXOut = bankReservesXIn + bankErgsAdded;

		// Registers in freeMintBox
		const resetHeightIn = BigInt(mockChain.height + 1);
		const resetHeightOut = resetHeightIn; // not reset
		const remainingDexyIn = 10000000n;
		const remainingDexyOut = remainingDexyIn - dexyMinted;

		// Parties for each box
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		const freeMintParty = mockChain.addParty(freeMintErgoTree, 'FreeMint');
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');

		// Setup inputs
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs
		});
		buybackParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
			},
			{
				R4: SLong(oracleRateXy).toHex()
			}
		);
		lpParty.addBalance({
			nanoergs: lpReservesX,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: lpReservesY }
			]
		});
		freeMintParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: freeMintNFT, amount: 1n }]
			},
			{
				R4: SInt(Number(resetHeightIn)).toHex(),
				R5: SLong(remainingDexyIn).toHex()
			}
		);
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});

		// set context var for buyback
		const buybackBoxIn = new ErgoUnsignedInput(buybackParty.utxos.at(0));
		buybackBoxIn.setContextExtension({
			0: SInt(1).toHex()
		});

		// main + data inputs
		const mainInputs = [
			...freeMintParty.utxos,
			...bankParty.utxos,
			buybackBoxIn,
			...fundingParty.utxos
		];
		const dataInputs = [...oracleParty.utxos, ...lpParty.utxos];

		// Outputs
		const freeMintOut = new OutputBuilder(minStorageRent, freeMintParty.address)
			.addTokens([{ tokenId: freeMintNFT, amount: 1n }])
			.setAdditionalRegisters({
				R4: SInt(Number(resetHeightOut)).toHex(),
				R5: SLong(remainingDexyOut).toHex()
			});

		const bankOut = new OutputBuilder(bankReservesXOut, bankParty.address).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: bankReservesYOut }
		]);

		const buybackOut = new OutputBuilder(
			fakeNanoErgs + buybackErgsAdded,
			buybackParty.address
		).addTokens([{ tokenId: buybackNFT, amount: 1n }]);

		// Build TX
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(freeMintOut)
			.to(bankOut)
			.to(buybackOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		//console.dir(tx.toEIP12Object(), { depth: null });
		// Execute => should pass
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(true);
	});

	it('Free mint - RESET ', () => {
		const oracleRateXy = 10000n * 1000000n; // 10^10
		const bankFeeNum = 3n; // => 0.5% fee part
		const buybackFeeNum = 2n; // => 0.5% fee part
		const feeDenom = 1000n;

		const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / 1000000n; // => 10030
		const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / 1000000n; // => 20

		const lpBalance = 100000000n;
		const lpReservesX = 100000000000000n;
		const lpReservesY = 10000000000n;

		const dexyMinted = 35000n; // positive
		const bankErgsAdded = bankRate * dexyMinted; // 10030 * 35000
		const buybackErgsAdded = buybackRate * dexyMinted; // 20 * 35000

		const bankReservesXIn = 100000000000000n;
		const bankReservesYIn = 90200000100n;
		const bankReservesYOut = bankReservesYIn - dexyMinted;
		const bankReservesXOut = bankReservesXIn + bankErgsAdded;

		// Registers in freeMintBox
		//const resetHeightIn = BigInt(mockChain.height + 1); //
		//const resetHeightOut = resetHeightIn; // not reset

		const t_free = 360n;
		const resetHeightIn = BigInt(mockChain.height) - 1n; //reset
		const resetHeightOut = BigInt(mockChain.height) + t_free + 3n; //buffer = 5

		const maxAllowedIfReset = lpReservesY / 100n;
		const remainingDexyOut = maxAllowedIfReset - dexyMinted;

		const remainingDexyIn = 10000000n;
		//const remainingDexyOut = remainingDexyIn - dexyMinted;

		// Parties for each box
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		const freeMintParty = mockChain.addParty(freeMintErgoTree, 'FreeMint');
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');

		// Setup inputs
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs
		});
		buybackParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
			},
			{
				R4: SLong(oracleRateXy).toHex()
			}
		);
		lpParty.addBalance({
			nanoergs: lpReservesX,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: lpReservesY }
			]
		});
		freeMintParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: freeMintNFT, amount: 1n }]
			},
			{
				R4: SInt(Number(resetHeightIn)).toHex(),
				R5: SLong(remainingDexyIn).toHex()
			}
		);
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});

		// set context var for buyback
		const buybackBoxIn = new ErgoUnsignedInput(buybackParty.utxos.at(0));
		buybackBoxIn.setContextExtension({
			0: SInt(1).toHex()
		});

		// main + data inputs
		const mainInputs = [
			...freeMintParty.utxos,
			...bankParty.utxos,
			buybackBoxIn,
			...fundingParty.utxos
		];
		const dataInputs = [...oracleParty.utxos, ...lpParty.utxos];

		// Outputs
		const freeMintOut = new OutputBuilder(minStorageRent, freeMintParty.address)
			.addTokens([{ tokenId: freeMintNFT, amount: 1n }])
			.setAdditionalRegisters({
				R4: SInt(Number(resetHeightOut)).toHex(),
				R5: SLong(remainingDexyOut).toHex()
			});

		const bankOut = new OutputBuilder(bankReservesXOut, bankParty.address).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: bankReservesYOut }
		]);

		const buybackOut = new OutputBuilder(
			fakeNanoErgs + buybackErgsAdded,
			buybackParty.address
		).addTokens([{ tokenId: buybackNFT, amount: 1n }]);

		// Build TX
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(freeMintOut)
			.to(bankOut)
			.to(buybackOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		//console.dir(tx.toEIP12Object(), { depth: null });
		// Execute => should pass
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(true);
	});
});
