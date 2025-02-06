import { directionBuy, directionSell, UI_FEE_ADDRESS } from '$lib/api/ergoNode';
import {
	vitestTokenIds,
	vitestErgoTrees,
	vitestContractConfig,
	DEXY_GOLD
} from '$lib/dexygold/dexyConstants';
import {
	calculateBankMintInputDexy,
	calculateBankMintInputErg,
	calculateResetAndAmountMint,
	dexyGoldBankArbitrageInputDexyTx,
	dexyGoldBankArbitrageInputErgTx,
	dexyGoldBankFreeInputDexyTx,
	dexyGoldBankFreeInputErgTx,
	lpSwapInputDexy,
	lpSwapInputErg,
	type DexyGoldArbitrageInputs,
	type DexyGoldLpSwapInputs
} from '$lib/dexygold/dexyGold';
import { signTx } from '$lib/dexygold/signing';
import { BOB_MNEMONIC } from '$lib/private/mnemonics';
import {
	applyFee,
	applyFeeSell,
	reverseFee,
	reverseFeeSell,
	type Direction
} from '$lib/sigmausd/sigmaUSDAndDexy';
import type { NodeBox } from '$lib/stores/bank.types';
import {
	parseBankArbitrageMintBox,
	parseBankBox,
	parseBankFreeMintBox,
	parseBuybackBox,
	parseDexyGoldOracleBox,
	parseLpBox,
	parseLpSwapBox,
	parseTrackingBox
} from '$lib/stores/dexyGoldParser';
import {
	dexygold_bank_arbitrage_mint_box,
	dexygold_bank_box,
	dexygold_bank_free_mint_box,
	dexygold_buyback_box,
	dexygold_lp_box,
	dexygold_lp_swap_box,
	dexygold_tracking101_box,
	fakeUserWithDexyBox,
	initTestBoxes,
	oracle_erg_xau_box
} from '$lib/stores/dexyGoldStore';
import {
	ErgoUnsignedInput,
	OutputBuilder,
	RECOMMENDED_MIN_FEE_VALUE,
	SInt,
	SLong,
	TransactionBuilder
} from '@fleet-sdk/core';
import { get } from 'svelte/store';
import { beforeAll, describe, expect, it } from 'vitest';
import type { EIP12UnsignedTransaction } from '@fleet-sdk/common';

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
//--- --- --- --- --- --- --- --- --- ---

// calculateResetAndAmountFreeMint
// dexyGoldBankFreeInputDexyTx

describe('Arb mint preparation', async () => {
	//let height = 1449119 + 11;
	let height = 1449119;

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

	let uiFeeAddress = '9eaX1P6KkckoZa2cc8Cn2iL3tjsUL5MN9CQCTPCE1GbcaZwcqns';

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

		//------------------------------------------------------------
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

		// //------------------------------------------------------------

		// dexyInput = 3000n - 1n;

		// //data process:
		// lpRate = lpXData / lpYData; //<===
		// oracleRate = oracleRateData / 1_000_000n;

		// // FEE ------------------------------
		// const dexyContract = dexyInput; //<===

		// ({ contractErg, bankErgsAdded, buybackErgsAdded, bankRate, buybackRate } = calculateBankMintInputDexy(
		// 	oracleRate,
		// 	1n,
		// 	bankFeeNum,
		// 	buybackFeeNum,
		// 	feeDenom,
		// 	dexyContract
		// ));
		// oracleRateWithFee = bankRate + buybackRate;

		// // FEE  ------------------------------
		// dexyMinted = dexyContract; //<===

		// remainingDexyIn = R5AvailableAmount;
		// maxAllowedIfReset = (lpXData - oracleRateWithFee * lpYData) / oracleRateWithFee; //arb
		// //maxAllowedIfReset = lpYData / 100n; //free

		// remainingDexyOut = maxAllowedIfReset - dexyMinted;

		// bankXOut = bankXIn + bankErgsAdded;
		// bankYOut = bankYIn - dexyMinted;
		// buybackXOut = buybackXIn + buybackErgsAdded;

		// //freeMintXOut = freeMintXIn;
		// arbMintXOut = arbMintXIn;

		// resetHeightIn = R4ResetHeight; //--- --- --- --- --- --- --- ---

		// ({ isCounterReset, resetHeightOut, remainingDexyOut } = calculateResetAndAmountMint(
		// 	height,
		// 	R4ResetHeight,
		// 	R5AvailableAmount,
		// 	dexyMinted,
		// 	maxAllowedIfReset,
		// 	T_arb,
		// 	T_buffer
		// ));
	});

	it('Arbitrage No Fee			: Input Dexy', async () => {
		dexyInput = 3000n - 1n;

		//data process:
		lpRate = lpXData / lpYData; //<===
		oracleRate = oracleRateData / 1_000_000n;

		// FEE ------------------------------
		const dexyContract = dexyInput; //<===

		({ contractErg, bankErgsAdded, buybackErgsAdded, bankRate, buybackRate } =
			calculateBankMintInputDexy(
				oracleRate,
				1n,
				bankFeeNum,
				buybackFeeNum,
				feeDenom,
				dexyContract
			));
		oracleRateWithFee = bankRate + buybackRate;

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

		({ isCounterReset, resetHeightOut, remainingDexyOut } = calculateResetAndAmountMint(
			height,
			R4ResetHeight,
			R5AvailableAmount,
			dexyMinted,
			maxAllowedIfReset,
			T_arb,
			T_buffer
		));

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

	it('Arbitrage With Fee		: Input Dexy', async () => {
		//CALC
		dexyInput = 3000n - 1n;

		//data process:
		lpRate = lpXData / lpYData; //<===
		oracleRate = oracleRateData / 1_000_000n;

		// FEE ------------------------------
		const dexyContract = dexyInput; //<===

		({ contractErg, bankErgsAdded, buybackErgsAdded, bankRate, buybackRate } =
			calculateBankMintInputDexy(
				oracleRate,
				1n,
				bankFeeNum,
				buybackFeeNum,
				feeDenom,
				dexyContract
			));
		oracleRateWithFee = bankRate + buybackRate;

		// FEE  ------------------------------
		//Part 0 - use Fee Reversed
		const { inputErg, uiSwapFee } = reverseFee(contractErg, feeMining);

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

		({ isCounterReset, resetHeightOut, remainingDexyOut } = calculateResetAndAmountMint(
			height,
			R4ResetHeight,
			R5AvailableAmount,
			dexyMinted,
			maxAllowedIfReset,
			T_arb,
			T_buffer
		));

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

		const swapFeeBox = new OutputBuilder(uiSwapFee, uiFeeAddress);

		const unsignedTx = new TransactionBuilder(height)
			.from([arbMintIn, bankIn, buybackBoxIn, ...userUtxos], {
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

		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC, height);
		expect(signedTx).toBeTruthy();
	});
	it('Arbitrage With Fee oneFunction 	: Input Dexy', async () => {
		//CALC
		dexyInput = 3000n - 1n;
		const unsignedTx = dexyGoldBankArbitrageInputDexyTx(
			dexyInput,
			userAddress,
			height,
			feeMining,
			[fakeUserWithDexyBox],
			{ arbMintIn, bankIn, buybankIn, lpIn, goldOracle, tracking101: tracking }
		);
		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC, height);
		expect(signedTx).toBeTruthy();
	});
	it('Arbitrage With Fee oneFunction 	: Input Erg', async () => {
		const inputErg = 1_000_000_000n;
		const unsignedTx = dexyGoldBankArbitrageInputErgTx(
			inputErg,
			userAddress,
			height,
			feeMining,
			[fakeUserWithDexyBox],
			{ arbMintIn, bankIn, buybankIn, lpIn, goldOracle, tracking101: tracking }
		);
		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC, height);
		expect(signedTx).toBeTruthy();
	});
});

describe('ARB mint One function', async () => {
	//MAIN DECLARATION:
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

	let uiFeeAddress = '9eaX1P6KkckoZa2cc8Cn2iL3tjsUL5MN9CQCTPCE1GbcaZwcqns';

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
		//calculate:
		// add Variable to data input
		buybackBoxIn = new ErgoUnsignedInput(buybankIn);
		buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });
	});
	//let height = 1449119;
	it('Arbitrage With Fee oneFunction 	:Not	:Input Dexy', async () => {
		let height = 1449119; //Reset
		dexyInput = 3000n - 1n;
		const unsignedTx = dexyGoldBankArbitrageInputDexyTx(
			dexyInput,
			userAddress,
			height,
			feeMining,
			[fakeUserWithDexyBox],
			{ arbMintIn, bankIn, buybankIn, lpIn, goldOracle, tracking101: tracking }
		);
		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC, height);
		expect(signedTx).toBeTruthy();
	});
	it('Arbitrage With Fee oneFunction 	:Not	:Input Erg', async () => {
		let height = 1449119; //Reset
		const inputErg = 1_000_000_000n;
		const unsignedTx = dexyGoldBankArbitrageInputErgTx(
			inputErg,
			userAddress,
			height,
			feeMining,
			[fakeUserWithDexyBox],
			{ arbMintIn, bankIn, buybankIn, lpIn, goldOracle, tracking101: tracking }
		);
		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC, height);
		expect(signedTx).toBeTruthy();
	});

	it('Arbitrage With Fee oneFunction 	:Reset	:Input Dexy', async () => {
		let height = 1449119 + 11; //Reset
		dexyInput = 3000n - 1n;
		const unsignedTx = dexyGoldBankArbitrageInputDexyTx(
			dexyInput,
			userAddress,
			height,
			feeMining,
			[fakeUserWithDexyBox],
			{ arbMintIn, bankIn, buybankIn, lpIn, goldOracle, tracking101: tracking }
		);
		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC, height);
		expect(signedTx).toBeTruthy();
	});
	it('Arbitrage With Fee oneFunction 	:Reset	:Input Erg', async () => {
		let height = 1449119 + 11; //Reset
		const inputErg = 1_000_000_000n;
		const unsignedTx = dexyGoldBankArbitrageInputErgTx(
			inputErg,
			userAddress,
			height,
			feeMining,
			[fakeUserWithDexyBox],
			{ arbMintIn, bankIn, buybankIn, lpIn, goldOracle, tracking101: tracking }
		);
		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC, height);
		expect(signedTx).toBeTruthy();
	});
});

describe('Free mint One function', async () => {
	//MAIN DECLARATION:
	let freeMintIn, freeMintXIn, freeMintXOut, freeMintNFT, R4ResetHeight, R5AvailableAmount;
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

	let uiFeeAddress = '9eaX1P6KkckoZa2cc8Cn2iL3tjsUL5MN9CQCTPCE1GbcaZwcqns';

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

		//------------------------------------------------------------
		//load boxes ARB mint:
		{
			freeMintIn = get(dexygold_bank_free_mint_box);
			({
				value: freeMintXIn,
				freeMintNFT,
				R4ResetHeight,
				R5AvailableAmount
			} = parseBankFreeMintBox(freeMintIn));

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
	});

	it('Free With Fee oneFunction  	:Not	:Input Dexy', async () => {
		let height = 1449119;
		const inputDexy = 3_000n;
		const unsignedTx = dexyGoldBankFreeInputDexyTx(
			inputDexy,
			userAddress,
			height,
			feeMining,
			[fakeUserWithDexyBox],
			{ freeMintIn, bankIn, buybankIn, lpIn, goldOracle }
		);
		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC, height);
		expect(signedTx).toBeTruthy();
	});
	it('Free With Fee oneFunction  	:Not	:Input Erg', async () => {
		let height = 1449119;
		const inputErg = 1_000_000_000n;
		const unsignedTx = dexyGoldBankFreeInputErgTx(
			inputErg,
			userAddress,
			height,
			feeMining,
			[fakeUserWithDexyBox],
			{ freeMintIn, bankIn, buybankIn, lpIn, goldOracle }
		);
		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC, height);
		expect(signedTx).toBeTruthy();
	});
	it('Free With Fee oneFunction  	:Reset	:Input Dexy', async () => {
		let height = 1449119 + 11;
		const inputDexy = 3_000n;
		const unsignedTx = dexyGoldBankFreeInputDexyTx(
			inputDexy,
			userAddress,
			height,
			feeMining,
			[fakeUserWithDexyBox],
			{ freeMintIn, bankIn, buybankIn, lpIn, goldOracle }
		);
		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC, height);
		expect(signedTx).toBeTruthy();
	});
	it('Free With Fee oneFunction  	:Reset	:Input Erg', async () => {
		let height = 1449119 + 11;
		const inputErg = 1_000_000_000n;
		const unsignedTx = dexyGoldBankFreeInputErgTx(
			inputErg,
			userAddress,
			height,
			feeMining,
			[fakeUserWithDexyBox],
			{ freeMintIn, bankIn, buybankIn, lpIn, goldOracle }
		);
		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC, height);
		expect(signedTx).toBeTruthy();
	});
});

describe('Lp Swap preparation', async () => {
	//MAIN DECLARATION:

	let lpIn, lpYIn, lpXIn, lpTokensIn;

	let lpSwapIn, swapInValue, swapOutValue, lpSwapNFT;

	let feeMining, userAddress, userChangeAddress;

	let userUtxos;

	const feeNumLp = 997n;
	const feeDenomLp = 1000n;

	let uiFeeAddress = '9eaX1P6KkckoZa2cc8Cn2iL3tjsUL5MN9CQCTPCE1GbcaZwcqns';

	// ------ MockChain DECLARATION ------
	beforeAll(async () => {
		await initTestBoxes();

		{
			lpSwapIn = get(dexygold_lp_swap_box);
			({ value: swapInValue, lpSwapNFT } = parseLpSwapBox(lpSwapIn));

			lpIn = get(dexygold_lp_box);
			({ dexyAmount: lpYIn, value: lpXIn, lpTokenAmount: lpTokensIn } = parseLpBox(lpIn));

			userUtxos = [fakeUserWithDexyBox];

			feeMining = RECOMMENDED_MIN_FEE_VALUE;
			userAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';
			userChangeAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';
		}
	});

	it.only('With FEE 	: Sell ERG : Input ERG', async () => {
		const height = 1449119;
		const direction = directionSell;
		const inputErg = 1_000_000_000n;

		let uiSwapFee;

		// FEE PART:
		const { uiSwapFee: abc, contractErg } = applyFee(inputErg, feeMining);
		uiSwapFee = abc;
		//uiSwapFee = 11_000_000n; // CHANGE

		//Direct conversion
		let { amountDexy, amountErg, rate } = lpSwapInputErg(
			direction,
			contractErg,
			lpXIn,
			lpYIn,
			feeNumLp,
			feeDenomLp
		);

		const swapOutValue = swapInValue;
		const lpXOut = lpXIn - direction * amountErg;
		const lpYOut = lpYIn + direction * amountDexy;

		// Build Tx
		const unsignedTx = new TransactionBuilder(height)
			.from([lpIn, lpSwapIn, ...userUtxos], {
				ensureInclusion: true
			})
			.to(
				new OutputBuilder(lpXOut, lpErgoTree).addTokens([
					{ tokenId: lpNFT, amount: 1n },
					{ tokenId: lpTokenId, amount: lpTokensIn },
					{ tokenId: dexyTokenId, amount: lpYOut }
				])
			)
			.to(
				new OutputBuilder(swapOutValue, lpSwapErgoTree).addTokens([
					{ tokenId: lpSwapNFT, amount: 1n }
				])
			)
			.to(new OutputBuilder(uiSwapFee, uiFeeAddress))
			.payFee(feeMining)
			.sendChangeTo(userChangeAddress)
			.build()
			.toEIP12Object();

		//add sign
		//console.dir(unsignedTx, { depth: null });
		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC);
		expect(signedTx).toBeTruthy();
	});

	it.only('Lp Swap With Fee oneFunction  	:Buy	:Input Erg', async () => {
		let height = 1449119;
		let directionBuy = 1n;
		const inputErg = 1_000_000_000n;
		const unsignedTx = dexyGoldLpSwapInputErgTx(
			inputErg,
			directionBuy,
			userAddress,
			height,
			feeMining,
			[fakeUserWithDexyBox],
			{ lpIn, lpSwapIn }
		);
		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC, height);
		expect(signedTx).toBeTruthy();
	});
	it.only('Lp Swap With Fee oneFunction  	:Sell	:Input Erg', async () => {
		let height = 1449119;
		let directionSell = -1n;
		const inputErg = 1_000_000_000n;
		const unsignedTx = dexyGoldLpSwapInputErgTx(
			inputErg,
			directionSell,
			userAddress,
			height,
			feeMining,
			[fakeUserWithDexyBox],
			{ lpIn, lpSwapIn }
		);
		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC, height);
		expect(signedTx).toBeTruthy();
	});

	it.only('Lp Swap With Fee oneFunction  	:Buy	:Input Dexy', async () => {
		let height = 1449119;
		let directionBuy = 1n;
		const inputDexy = 20n;
		const unsignedTx = dexyGoldLpSwapInputDexyTx(
			inputDexy,
			directionBuy,
			userAddress,
			height,
			feeMining,
			[fakeUserWithDexyBox],
			{ lpIn, lpSwapIn }
		);
		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC, height);
		expect(signedTx).toBeTruthy();
	});
	it.only('Lp Swap With Fee oneFunction  	:Sell	:Input Dexy', async () => {
		let height = 1449119;
		let directionSell = -1n;
		const inputDexy = 20n;
		const unsignedTx = dexyGoldLpSwapInputDexyTx(
			inputDexy,
			directionSell,
			userAddress,
			height,
			feeMining,
			[fakeUserWithDexyBox],
			{ lpIn, lpSwapIn }
		);
		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC, height);
		expect(signedTx).toBeTruthy();
	});
});
