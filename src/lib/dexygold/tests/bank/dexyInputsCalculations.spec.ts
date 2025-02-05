import { directionBuy, directionSell, UI_FEE_ADDRESS } from '$lib/api/ergoNode';
import { debugArbmint, debugFreemint, debugRedeem } from '$lib/dexygold/debugContracts';
import {
	vitestTokenIds,
	vitestErgoTrees,
	realMintedTestBoxes,
	vitestContractConfig
} from '$lib/dexygold/dexyConstants';
import {
	bankMint,
	bankMintInpuErg,
	calculateLpRedeemInputDexy,
	calculateLpRedeemInputErg,
	calculateLpRedeemInputSharesUnlocked,
	lpSwapInputDexy,
	lpSwapInputErg
} from '$lib/dexygold/dexyGold';
import { signTx } from '$lib/dexygold/signing';
import { BOB_MNEMONIC } from '$lib/private/mnemonics';
import { applyFee, applyFeeSell, reverseFee, reverseFeeSell } from '$lib/sigmausd/sigmaUSDAndDexy';
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
import { beforeAll, describe, expect, it } from 'vitest';

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
	dexyTokenId
} = vitestTokenIds;

const { initialDexyTokens, initialLp, feeNumLp, feeDenomLp } = vitestContractConfig;

// -------------------------------------------------------------------------------------

// fabric:

describe('Bank Mint with any input should work', async () => {
	let height = 1449119 + 11;
	//MAIN DECLARATION:
	//let freeMintIn,freeMintXIn,freeMintXOut, freeMintNFT, R4ResetHeight, R5AvailableAmount;
	let arbMintIn, arbMintXIn, arbMintXOut, arbitrageMintNFT, R4ResetHeight, R5AvailableAmount;
	let bankIn, bankXIn, bankNFT, bankYIn;
	let buybankIn, buybackXIn, buybackNFT, gortAmount;

	let lpIn, lpYData, lpXData, lpTokenAmount;
	let goldOracle, oraclePoolNFT, oracleRateData;

	let tracking, trackingNFT, R4Target, R5Denom, R6IsBelow, R7TriggeredHeight;

	let feeMining, userAddress, userChangeAddress;

	let dataInputs;
	let userUtxos;

	let ergoInput, dexyInput;
	let dexyMinted;

	const T_arb = 30n,
		T_free = 360n,
		T_buffer = 5n;
	const bankFeeNum = 3n,
		buybackFeeNum = 2n,
		feeDenom = 1000n;

	const thresholdPercent = 101n;

	let lpRate, oracleRate, oracleRateWithFee;

	let contractErg, bankErgsAdded, buybackErgsAdded, bankRate, buybackRate;
	let maxAllowedIfReset, remainingDexyIn, remainingDexyOut;
	let bankXOut, bankYOut, buybackXOut;
	let isCounterReset;

	let availableToMint;
	let resetHeightIn;
	let resetHeightOut;

	let buybackBoxIn; //with Var[0]
	let bankOut, freeMintOut, buybackOut;
	// ------ MockChain DECLARATION ------
	beforeAll(async () => {
		await initTestBoxes();

		dexyInput = 3000n - 1n;

		//load boxes ARB mint:
		{
			arbMintIn = get(dexygold_bank_arbitrage_mint_box);
			({
				value: arbMintXIn,
				arbitrageMintNFT,
				R4ResetHeight,
				R5AvailableAmount
			} = parseBankArbitrageMintBox(arbMintIn));

			bankIn = get(dexygold_bank_box);
			({ value: bankXIn, bankNFT, dexyAmount: bankYIn } = parseBankBox(bankIn));

			buybankIn = get(dexygold_buyback_box);
			({ value: buybackXIn, buybackNFT, gortAmount } = parseBuybackBox(buybankIn));

			lpIn = get(dexygold_lp_box);
			({ dexyAmount: lpYData, value: lpXData, lpTokenAmount } = parseLpBox(lpIn));

			goldOracle = get(oracle_erg_xau_box);
			({ oraclePoolNFT, R4Rate: oracleRateData } = parseDexyGoldOracleBox(goldOracle));

			tracking = get(dexygold_tracking101_box);
			({ trackingNFT, R4Target, R5Denom, R6IsBelow, R7TriggeredHeight } =
				parseTrackingBox(tracking));

			dataInputs = [goldOracle, lpIn, tracking];
			userUtxos = [fakeUserWithDexyBox];

			feeMining = RECOMMENDED_MIN_FEE_VALUE;
			userAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';
			userChangeAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';
		}
		//load boxes FREE mint: {}

		//calculate:
		// add Variable to data input
		buybackBoxIn = new ErgoUnsignedInput(buybankIn);
		buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });

		const dexyContract = dexyInput; //<===
		// FEE ------------------------------

		//data process:
		lpRate = lpXData / lpYData; //<===
		oracleRate = oracleRateData / 1_000_000n;

		({ contractErg, bankErgsAdded, buybackErgsAdded, bankRate, buybackRate } = bankMint(
			oracleRate,
			1n,
			bankFeeNum,
			buybackFeeNum,
			feeDenom,
			dexyContract
		));

		oracleRateWithFee = bankRate + buybackRate;

		//
		// FEE  ------------------------------
		dexyMinted = dexyContract; //<===

		remainingDexyIn = R5AvailableAmount;
		maxAllowedIfReset = (lpXData - oracleRateWithFee * lpYData) / oracleRateWithFee; //arb
		//maxAllowedIfReset = lpYData / 100n; //free

		remainingDexyOut = maxAllowedIfReset - dexyMinted;

		bankXOut = bankXIn + bankErgsAdded;
		bankYOut = bankYIn - dexyMinted;
		buybackXOut = buybackXIn + buybackErgsAdded;

		//freeMintXOut = freeMintXIn;
		arbMintXOut = arbMintXIn;

		resetHeightIn = R4ResetHeight; //--- --- --- --- --- --- --- ---

		({ isCounterReset } = calculateResetAndAmount(
			height,
			R4ResetHeight,
			R5AvailableAmount,
			dexyMinted,
			maxAllowedIfReset
		));

		function calculateResetAndAmount(
			height: number,
			resetHeight: bigint,
			availableAmount: bigint,
			dexyMinted: bigint,
			maxAllowedIfReset: bigint
		) {
			isCounterReset = BigInt(height) > resetHeight;

			if (isCounterReset) {
				console.log('Reset +');
				resetHeightOut = height + Number(T_arb + T_buffer - 1n); //<== //360 => 365
				availableToMint = maxAllowedIfReset;
				console.log('availableToMint ', availableToMint);
				remainingDexyOut = availableToMint - dexyMinted;
			} else {
				console.log('---NOT RESETED---');
				resetHeightOut = resetHeight; //
				availableToMint = availableAmount; //
				if (availableAmount < dexyMinted) {
					console.log('Not reset | Not enough Dexy');
				}
				remainingDexyOut = availableToMint - dexyMinted;
			}

			return { isCounterReset };
		}

		isCounterReset = height > R4ResetHeight;

		if (isCounterReset) {
			console.log('Reset +');
			resetHeightOut = height + Number(T_arb + T_buffer - 1n); //<== //360 => 365
			availableToMint = maxAllowedIfReset;
			console.log('availableToMint ', availableToMint);
			remainingDexyOut = availableToMint - dexyMinted;
		} else {
			console.log('---NOT RESETED---');
			resetHeightOut = R4ResetHeight; //
			availableToMint = R5AvailableAmount; //
			if (R5AvailableAmount < dexyMinted) {
				console.log('Not reset | Not enough Dexy');
			}
			remainingDexyOut = availableToMint - dexyMinted;
		}
	});

	it('Arbitrage	: Not reset : Input Dexy', async () => {
		//user Inputs
		//------------------------------
		const bankOut = new OutputBuilder(bankXOut, bankErgoTree).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyTokenId, amount: bankYOut }
		]);

		const arbMintOut = new OutputBuilder(arbMintXOut, arbitrageMintErgoTree)
			.addTokens([{ tokenId: arbitrageMintNFT, amount: 1n }])
			.setAdditionalRegisters({
				R4: SInt(Number(resetHeightOut)).toHex(),
				R5: SLong(BigInt(remainingDexyOut)).toHex()
			});

		const buybackOut = new OutputBuilder(buybackXOut, buybackErgoTree).addTokens([
			{ tokenId: buybackNFT, amount: 1n },
			{ tokenId: gort, amount: gortAmount }
		]);

		const unsignedTx = new TransactionBuilder(height)
			.from([arbMintIn, bankIn, buybackBoxIn, ...userUtxos], {
				ensureInclusion: true
			})
			.withDataFrom(dataInputs)
			.to(arbMintOut)
			.to(bankOut)
			.to(buybackOut)
			.payFee(feeMining)
			.sendChangeTo(userChangeAddress)
			.build()
			.toEIP12Object();

		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC, height);
		expect(signedTx).toBeTruthy();
	});

	it.skip('Arbitrage Fee	: Not reset : Input ERG', async () => {
		//------------------------- CONTENT -------------------------
		//----------------- Arb Mint -------------------
		const arbMintIn = get(dexygold_bank_arbitrage_mint_box);
		const {
			value: arbMintXIn,
			arbitrageMintNFT,
			R4ResetHeight,
			R5AvailableAmount
		} = parseBankArbitrageMintBox(arbMintIn);

		//----------------- Check Bank -------------------
		const bankIn = get(dexygold_bank_box);
		const { value: bankXIn, bankNFT, dexyAmount: bankYIn } = parseBankBox(bankIn);

		//------------------- Buyback --------------------
		const buybankIn = get(dexygold_buyback_box);
		const { value: buybackXIn, buybackNFT, gortAmount } = parseBuybackBox(buybankIn);

		//------------------ Oracle --------------------
		const goldOracle = get(oracle_erg_xau_box);
		const { oraclePoolNFT, R4Rate: oracleRateData } = parseDexyGoldOracleBox(goldOracle);

		//------------------ LP --------------------
		const lpIn = get(dexygold_lp_box);
		const { dexyAmount: lpYData, value: lpXData, lpTokenAmount } = parseLpBox(lpIn);

		//------------------ Tracking --------------------
		const tracking = get(dexygold_tracking101_box);
		const { value, trackingNFT, R4Target, R5Denom, R6IsBelow, R7TriggeredHeight } =
			parseTrackingBox(tracking);

		const dataInputs = [goldOracle, lpIn, tracking];
		const userUtxos = [fakeUserWithDexyBox];

		//UI Inputs
		const height = 1449119; //1449119 + 1000
		const feeMining = RECOMMENDED_MIN_FEE_VALUE;
		const userAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';
		const userChangeAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';
		const uiFeeAddress = UI_FEE_ADDRESS;

		//USER Inputs
		const ergoInput = 117_289_806_000n; //117289806000n
		//------------------------- CONTENT -------------------------

		//constants v2
		//const T_free = 360n;
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

		// FEE PART:
		let uiSwapFee;
		const { uiSwapFee: abc, contractERG: contractErg } = applyFee(ergoInput, feeMining);
		uiSwapFee = abc;

		const {
			contractDexy: dexyMinted,
			bankErgsAdded,
			buybackErgsAdded,
			bankRate,
			buybackRate
		} = bankMintInpuErg(oracleRate, 1n, bankFeeNum, buybackFeeNum, feeDenom, contractErg);

		//console.log(ergoInput, ' UserInput');
		//console.log(contractErg, 'contractErg');
		//console.log(uiSwapFee, 'uiSwapFee');

		const oracleRateWithFee = bankRate + buybackRate; // bigint
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
		//console.log(maxAllowedIfResetFree, 'refreshAmount FreeMint');

		//ARB MINT :
		const maxAllowedIfResetArb = (lpXData - oracleRateWithFee * lpYData) / oracleRateWithFee;
		//console.log(maxAllowedIfResetArb, 'refreshAmount ArbMint');

		//Free/Arb remaining:
		const remainingDexyIn = R5AvailableAmount;

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
			resetHeightOut = height + Number(T_arb + T_buffer - 1n); //<== //360 => 365
			availableToMint = maxAllowedIfResetArb;
			//console.log('availableToMint ', availableToMint);
			remainingDexyOut = availableToMint - dexyMinted;
		} else {
			console.log('---NOT RESETED---');
			resetHeightOut = R4ResetHeight; //
			availableToMint = R5AvailableAmount; //
			if (remainingDexyIn < dexyMinted) {
				console.log('Not reset | Not enough Dexy');
			}
			remainingDexyOut = availableToMint - dexyMinted;
		}
		expect(remainingDexyOut).toBeGreaterThanOrEqual(0);

		console.log(resetHeightOut, ' resetHeightOut');
		console.log(remainingDexyOut, ' remainingDexyOut');

		//bankErgsAdded, buybackErgsAdded
		const bankXOut = bankXIn + bankErgsAdded; // ?
		const bankYOut = bankYIn - dexyMinted; // ?
		const buybackXOut = buybackXIn + buybackErgsAdded; // RECALCULATE

		const arbMintXOut = arbMintXIn;

		const buybackBoxIn = new ErgoUnsignedInput(buybankIn);
		buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });

		//------------------------------
		const bankOut = new OutputBuilder(bankXOut, bankErgoTree).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyTokenId, amount: bankYOut }
		]);

		const arbMintOut = new OutputBuilder(arbMintXOut, arbitrageMintErgoTree)
			.addTokens([{ tokenId: arbitrageMintNFT, amount: 1n }])
			.setAdditionalRegisters({
				R4: SInt(Number(resetHeightOut)).toHex(),
				R5: SLong(BigInt(remainingDexyOut)).toHex()
			});

		const buybackOut = new OutputBuilder(buybackXOut, buybackErgoTree).addTokens([
			{ tokenId: buybackNFT, amount: 1n },
			{ tokenId: gort, amount: gortAmount }
		]);

		const unsignedTx = new TransactionBuilder(height)
			.from([arbMintIn, bankIn, buybackBoxIn, ...userUtxos], {
				ensureInclusion: true
			})
			.withDataFrom(dataInputs)
			.to(arbMintOut)
			.to(bankOut)
			.to(buybackOut)
			.to(new OutputBuilder(uiSwapFee, uiFeeAddress))
			.payFee(feeMining)
			.sendChangeTo(userChangeAddress)
			.build()
			.toEIP12Object();

		//console.dir(unsignedTx, { depth: null });
		debugArbmint(unsignedTx);
		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC, height);
		expect(signedTx).toBeTruthy();
	});
});
