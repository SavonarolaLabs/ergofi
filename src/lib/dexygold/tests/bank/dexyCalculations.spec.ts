import { DIRECTION_BUY, DIRECTION_SELL, UI_FEE_ADDRESS } from '$lib/api/ergoNode';
import { debugArbmint, debugFreemint, debugRedeem } from '$lib/dexygold/debugContracts';
import {
	vitestTokenIds,
	vitestErgoTrees,
	realMintedTestBoxes,
	vitestContractConfig
} from '$lib/dexygold/dexyConstants';
import {
	calculateBankMintInputDexy,
	calculateBankMintInputErg,
	calculateLpMintInputDexy,
	calculateLpMintInputErg,
	calculateLpMintInputSharesUnlocked,
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
	oracle_erg_xau_box
} from '$lib/stores/dexyGoldStore';
import {
	fakeUserBox,
	fakeUserWithDexyBox,
	initTestBoxes,
	mintInitialOutputs
} from '$lib/stores/dexyGoldStoreTestData';
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

describe('LP swap with any input should work', async () => {
	beforeAll(() => {
		initTestBoxes();
	});
	it('Initial Test	: Sell ERG : Input ERG', async () => {
		//input BOXES
		const lpIn = get(dexygold_lp_box);
		const { value: lpXIn, lpTokenAmount: lpTokensIn, dexyAmount: lpYIn } = parseLpBox(lpIn);
		const swapIn = get(dexygold_lp_swap_box);

		const { value: swapInValue, lpSwapNFT } = parseLpSwapBox(swapIn);

		const userUtxos = [fakeUserBox];

		//user Inputs
		const height = 1449119;
		const ergInput = 1_000_000_000n;
		const direction = DIRECTION_SELL;

		//const direction = DIRECTION_BUY;
		const feeMining = RECOMMENDED_MIN_FEE_VALUE;
		const userChangeAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';

		//constants:
		const feeNumLp = 997n;
		const feeDenomLp = 1000n;

		//Direct conversion
		let { amountDexy, amountErg, rate } = lpSwapInputErg(
			direction,
			ergInput,
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
			.from([lpIn, swapIn, ...userUtxos], {
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
			.payFee(feeMining)
			.sendChangeTo(userChangeAddress)
			.build()
			.toEIP12Object();

		//add sign
		//console.dir(unsignedTx, { depth: null });
		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC);
		expect(signedTx).toBeTruthy();
	});
	it('With FEE 	: Sell ERG : Input ERG', async () => {
		//input BOXES
		const lpIn = get(dexygold_lp_box);
		const { value: lpXIn, lpTokenAmount: lpTokensIn, dexyAmount: lpYIn } = parseLpBox(lpIn);
		const swapIn = get(dexygold_lp_swap_box);

		const { value: swapInValue, lpSwapNFT } = parseLpSwapBox(swapIn);

		const userUtxos = [fakeUserBox];

		//user Inputs
		const height = 1449119;
		const inputErg = 1_000_000_000n;
		const direction = DIRECTION_SELL;

		//const direction = DIRECTION_BUY;
		const feeMining = RECOMMENDED_MIN_FEE_VALUE;
		const userChangeAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';
		const uiFeeAddress = UI_FEE_ADDRESS;
		let uiSwapFee;

		//constants:
		const feeNumLp = 997n;
		const feeDenomLp = 1000n;

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
			.from([lpIn, swapIn, ...userUtxos], {
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
	it('Initial Test	: Buy  ERG : Input ERG', async () => {
		//input BOXES
		const lpIn = get(dexygold_lp_box);
		const { value: lpXIn, lpTokenAmount: lpTokensIn, dexyAmount: lpYIn } = parseLpBox(lpIn);
		const swapIn = get(dexygold_lp_swap_box);

		const { value: swapInValue, lpSwapNFT } = parseLpSwapBox(swapIn);

		const userUtxos = [fakeUserWithDexyBox];

		//user Inputs
		const height = 1449119;
		const ergInput = 1_000_000_000n;
		const direction = DIRECTION_BUY; //<==

		//const direction = DIRECTION_BUY;
		const feeMining = RECOMMENDED_MIN_FEE_VALUE;
		const userChangeAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';

		//constants:
		const feeNumLp = 997n;
		const feeDenomLp = 1000n;

		//Direct conversion
		let { amountDexy, amountErg, rate } = lpSwapInputErg(
			direction,
			ergInput,
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
			.from([lpIn, swapIn, ...userUtxos], {
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
			.payFee(feeMining)
			.sendChangeTo(userChangeAddress)
			.build()
			.toEIP12Object();

		//add sign
		//console.dir(unsignedTx, { depth: null });
		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC);
		expect(signedTx).toBeTruthy();
	});
	it('With FEE 	: Buy  ERG : Input ERG', async () => {
		//input BOXES
		const lpIn = get(dexygold_lp_box);
		const { value: lpXIn, lpTokenAmount: lpTokensIn, dexyAmount: lpYIn } = parseLpBox(lpIn);
		const swapIn = get(dexygold_lp_swap_box);

		const { value: swapInValue, lpSwapNFT } = parseLpSwapBox(swapIn);

		const userUtxos = [fakeUserWithDexyBox];

		//user Inputs
		const height = 1449119;
		const inputErg = 1_000_000_000n;
		const direction = DIRECTION_BUY; //<==

		const feeMining = RECOMMENDED_MIN_FEE_VALUE;
		const userChangeAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';
		const uiFeeAddress = UI_FEE_ADDRESS;
		let uiSwapFee;

		//constants:
		const feeNumLp = 997n;
		const feeDenomLp = 1000n;

		// FEE PART:
		const { uiSwapFee: abc, contractErg } = applyFeeSell(inputErg, feeMining);
		uiSwapFee = abc;

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
			.from([lpIn, swapIn, ...userUtxos], {
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

	it('Initial Test	: Sell ERG : Input Dexy', async () => {
		//input BOXES
		const lpIn = get(dexygold_lp_box);
		const { value: lpXIn, lpTokenAmount: lpTokensIn, dexyAmount: lpYIn } = parseLpBox(lpIn);
		const swapIn = get(dexygold_lp_swap_box);
		const { value: swapInValue, lpSwapNFT } = parseLpSwapBox(swapIn);

		const userUtxos = [fakeUserWithDexyBox];

		//user Inputs
		const height = 1449119;
		const dexyInput = 100_000n;
		const direction = DIRECTION_SELL;

		//const direction = DIRECTION_BUY;
		const feeMining = RECOMMENDED_MIN_FEE_VALUE;
		const userChangeAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';

		//constants:
		const feeNumLp = 997n;
		const feeDenomLp = 1000n;

		//Reverse conversion

		// lpSwapInputDexy
		let { amountDexy, amountErg, rate } = lpSwapInputDexy(
			direction,
			dexyInput,
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
			.from([lpIn, swapIn, ...userUtxos], {
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
			.payFee(feeMining)
			.sendChangeTo(userChangeAddress)
			.build()
			.toEIP12Object();

		//add sign
		//console.dir(unsignedTx, { depth: null });
		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC);
		expect(signedTx).toBeTruthy();
	});
	it('With FEE 	: Sell ERG : Input Dexy', async () => {
		//input BOXES
		const lpIn = get(dexygold_lp_box);
		const { value: lpXIn, lpTokenAmount: lpTokensIn, dexyAmount: lpYIn } = parseLpBox(lpIn);
		const swapIn = get(dexygold_lp_swap_box);
		const { value: swapInValue, lpSwapNFT } = parseLpSwapBox(swapIn);

		const userUtxos = [fakeUserWithDexyBox];

		//user Inputs
		const height = 1449119;
		const dexyInput = 100_000n;
		const direction = DIRECTION_SELL;

		//const direction = DIRECTION_BUY;
		const feeMining = RECOMMENDED_MIN_FEE_VALUE;
		const userChangeAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';
		const uiFeeAddress = UI_FEE_ADDRESS;

		//constants:
		const feeNumLp = 997n;
		const feeDenomLp = 1000n;

		// lpSwapInputDexy
		let {
			amountDexy,
			amountErg: contractERG,
			rate
		} = lpSwapInputDexy(direction, dexyInput, lpXIn, lpYIn, feeNumLp, feeDenomLp);

		// FEE PART:
		const { userErg: amountErg, uiSwapFee } = reverseFeeSell(contractERG, feeMining);

		const swapOutValue = swapInValue;
		const lpXOut = lpXIn - direction * contractERG;
		const lpYOut = lpYIn + direction * amountDexy;

		// Build Tx
		const unsignedTx = new TransactionBuilder(height)
			.from([lpIn, swapIn, ...userUtxos], {
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
	it('Initial Test	: Buy  ERG : Input Dexy', async () => {
		//input BOXES
		const lpIn = get(dexygold_lp_box);
		const { value: lpXIn, lpTokenAmount: lpTokensIn, dexyAmount: lpYIn } = parseLpBox(lpIn);
		const swapIn = get(dexygold_lp_swap_box);
		const { value: swapInValue, lpSwapNFT } = parseLpSwapBox(swapIn);

		const userUtxos = [fakeUserWithDexyBox];

		//user Inputs
		const height = 1449119;
		const dexyInput = 100_000n;
		const direction = DIRECTION_BUY;

		//const direction = DIRECTION_BUY;
		const feeMining = RECOMMENDED_MIN_FEE_VALUE;
		const userChangeAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';

		//constants:
		const feeNumLp = 997n;
		const feeDenomLp = 1000n;

		//Reverse conversion

		// lpSwapInputDexy
		let { amountDexy, amountErg, rate } = lpSwapInputDexy(
			direction,
			dexyInput,
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
			.from([lpIn, swapIn, ...userUtxos], {
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
			.payFee(feeMining)
			.sendChangeTo(userChangeAddress)
			.build()
			.toEIP12Object();

		//add sign
		//console.dir(unsignedTx, { depth: null });
		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC);
		expect(signedTx).toBeTruthy();
	});
	it('With FEE 	: Buy  ERG : Input Dexy', async () => {
		//input BOXES
		const lpIn = get(dexygold_lp_box);
		const { value: lpXIn, lpTokenAmount: lpTokensIn, dexyAmount: lpYIn } = parseLpBox(lpIn);
		const swapIn = get(dexygold_lp_swap_box);
		const { value: swapInValue, lpSwapNFT } = parseLpSwapBox(swapIn);

		const userUtxos = [fakeUserWithDexyBox];

		//user Inputs
		const height = 1449119;
		const dexyInput = 100_000n;
		const direction = DIRECTION_BUY;

		//const direction = DIRECTION_BUY;
		const feeMining = RECOMMENDED_MIN_FEE_VALUE;
		const userChangeAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';
		const uiFeeAddress = UI_FEE_ADDRESS;

		//constants:
		const feeNumLp = 997n;
		const feeDenomLp = 1000n;

		//Reverse conversion

		// lpSwapInputDexy
		let {
			amountDexy,
			amountErg: contractERG,
			rate
		} = lpSwapInputDexy(direction, dexyInput, lpXIn, lpYIn, feeNumLp, feeDenomLp);

		// FEE PART:
		const { inputERG: amountErg, uiSwapFee } = reverseFee(contractERG, feeMining);

		const swapOutValue = swapInValue;
		const lpXOut = lpXIn - direction * contractERG;
		const lpYOut = lpYIn + direction * amountDexy;

		// Build Tx
		const unsignedTx = new TransactionBuilder(height)
			.from([lpIn, swapIn, ...userUtxos], {
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
});

describe('LP Mint with any input should work', async () => {
	beforeAll(() => {
		initTestBoxes();
	});

	it('Initial Test	: Mint LP  : Input ERG & DEXY', async () => {
		//input BOXES
		const lpIn = get(dexygold_lp_box); // Mint Less in pool and Check
		const { value: lpXIn, lpTokenAmount: lpTokensIn, dexyAmount: lpYIn } = parseLpBox(lpIn);
		//const swapIn = get(dexygold_lp_swap_box);
		//const { value: swapInValue, lpSwapNFT } = parseLpSwapBox(swapIn);
		const lpMintIn = get(dexygold_lp_mint_box);
		const { value: lpMintInValue, lpMintNFT } = parseLpMintBox(lpMintIn);

		const userUtxos = [fakeUserWithDexyBox];
		//user Inputs
		const height = 1449119;
		const dexyInput = 10_000n;
		const ergoInput = 500_000n;

		//constants
		const feeMining = RECOMMENDED_MIN_FEE_VALUE;
		const userChangeAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';

		const lpMintOutValue = lpMintInValue;
		const lpXOut = lpXIn + ergoInput;
		const lpYOut = lpYIn + dexyInput;
		const supplyLpIn = initialLp - lpTokensIn; //initialLp - lpBalanceIn; Crit:100000000000 (all in)

		const sharesUnlockedX = (ergoInput * supplyLpIn) / lpXIn;
		const sharesUnlockedY = (dexyInput * supplyLpIn) / lpYIn;
		const sharesUnlocked = sharesUnlockedX < sharesUnlockedY ? sharesUnlockedX : sharesUnlockedY;

		// console.log(sharesUnlockedX, 'sharesUnlockedX |', 'ergoInput', ergoInput, ' lpXIn', lpXIn);
		// console.log(sharesUnlockedY, 'sharesUnlockedY |', 'dexyInput', dexyInput, ' lpYIn', lpYIn);
		// console.log(sharesUnlocked, ' sharesUnlocked');

		const lpTokensOut = lpTokensIn - sharesUnlocked;

		const unsignedTx = new TransactionBuilder(height)
			.from([lpIn, lpMintIn, ...userUtxos], {
				ensureInclusion: true
			})
			.to(
				new OutputBuilder(lpXOut, lpErgoTree).addTokens([
					{ tokenId: lpNFT, amount: 1n },
					{ tokenId: lpTokenId, amount: lpTokensOut },
					{ tokenId: dexyTokenId, amount: lpYOut }
				])
			)
			.to(
				new OutputBuilder(lpMintOutValue, lpMintErgoTree).addTokens([
					{ tokenId: lpMintNFT, amount: 1n }
				])
			)
			.payFee(feeMining)
			.sendChangeTo(userChangeAddress)
			.build()
			.toEIP12Object();

		//console.dir(unsignedTx, { depth: null });
		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC);
		expect(signedTx).toBeTruthy();
	});
	it('			: Mint LP  : Input only Erg', async () => {
		//input BOXES
		const lpIn = get(dexygold_lp_box); // Mint Less in pool and Check
		const { value: lpXIn, lpTokenAmount: lpTokensIn, dexyAmount: lpYIn } = parseLpBox(lpIn);
		//const swapIn = get(dexygold_lp_swap_box);
		//const { value: swapInValue, lpSwapNFT } = parseLpSwapBox(swapIn);
		const lpMintIn = get(dexygold_lp_mint_box);
		const { value: lpMintInValue, lpMintNFT } = parseLpMintBox(lpMintIn);

		const userUtxos = [fakeUserWithDexyBox];
		//user Inputs
		const height = 1449119;
		//const dexyInput = 10_000n;
		const ergoInput = 500_000n;

		//constants
		const feeMining = RECOMMENDED_MIN_FEE_VALUE;
		const userChangeAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';

		const supplyLpIn = initialLp - lpTokensIn; //initialLp - lpBalanceIn; Crit:100000000000 (all in)

		// CALCULATION GO GO
		let { contractDexy: dexyInput, contractLpTokens: sharesUnlocked } = calculateLpMintInputErg(
			ergoInput,
			lpXIn,
			lpYIn,
			supplyLpIn
		); //RETURN 0 dexy
		//console.log('dexyInput', dexyInput);
		//console.log('sharesUnlocked', sharesUnlocked);

		const lpMintOutValue = lpMintInValue;
		const lpXOut = lpXIn + ergoInput;
		const lpYOut = lpYIn + dexyInput;

		//const sharesUnlockedX = (ergoInput * supplyLpIn) / lpXIn;
		//const sharesUnlockedY = (dexyInput * supplyLpIn) / lpYIn;
		//const sharesUnlocked = sharesUnlockedX < sharesUnlockedY ? sharesUnlockedX : sharesUnlockedY;

		//console.log(sharesUnlockedX, 'sharesUnlockedX |', 'ergoInput', ergoInput, ' lpXIn', lpXIn);
		//console.log(sharesUnlockedY, 'sharesUnlockedY |', 'dexyInput', dexyInput, ' lpYIn', lpYIn);
		//console.log(sharesUnlocked, ' sharesUnlocked');

		const lpTokensOut = lpTokensIn - sharesUnlocked;

		const unsignedTx = new TransactionBuilder(height)
			.from([lpIn, lpMintIn, ...userUtxos], {
				ensureInclusion: true
			})
			.to(
				new OutputBuilder(lpXOut, lpErgoTree).addTokens([
					{ tokenId: lpNFT, amount: 1n },
					{ tokenId: lpTokenId, amount: lpTokensOut },
					{ tokenId: dexyTokenId, amount: lpYOut }
				])
			)
			.to(
				new OutputBuilder(lpMintOutValue, lpMintErgoTree).addTokens([
					{ tokenId: lpMintNFT, amount: 1n }
				])
			)
			.payFee(feeMining)
			.sendChangeTo(userChangeAddress)
			.build()
			.toEIP12Object();

		//console.dir(unsignedTx, { depth: null });
		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC);
		expect(signedTx).toBeTruthy();
	});
	it('			: Mint LP  : Input only Dexy', async () => {
		//input BOXES
		const lpIn = get(dexygold_lp_box); // Mint Less in pool and Check
		const { value: lpXIn, lpTokenAmount: lpTokensIn, dexyAmount: lpYIn } = parseLpBox(lpIn);
		//const swapIn = get(dexygold_lp_swap_box);
		//const { value: swapInValue, lpSwapNFT } = parseLpSwapBox(swapIn);
		const lpMintIn = get(dexygold_lp_mint_box);
		const { value: lpMintInValue, lpMintNFT } = parseLpMintBox(lpMintIn);

		const userUtxos = [fakeUserWithDexyBox];
		//user Inputs
		const height = 1449119;
		const dexyInput = 10_000n;
		//const ergoInput = 500_000n;

		//constants
		const feeMining = RECOMMENDED_MIN_FEE_VALUE;
		const userChangeAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';

		const supplyLpIn = initialLp - lpTokensIn; //initialLp - lpBalanceIn; Crit:100000000000 (all in)

		// CALCULATION GO GO
		let { contractErg: ergoInput, contractLpTokens: sharesUnlocked } = calculateLpMintInputDexy(
			dexyInput,
			lpXIn,
			lpYIn,
			supplyLpIn
		); //RETURN 0 dexy
		//console.log('dexyInput', dexyInput);
		//console.log('sharesUnlocked', sharesUnlocked);

		const lpMintOutValue = lpMintInValue;
		const lpXOut = lpXIn + ergoInput;
		const lpYOut = lpYIn + dexyInput;

		//const sharesUnlockedX = (ergoInput * supplyLpIn) / lpXIn;
		//const sharesUnlockedY = (dexyInput * supplyLpIn) / lpYIn;
		//const sharesUnlocked = sharesUnlockedX < sharesUnlockedY ? sharesUnlockedX : sharesUnlockedY;

		//console.log(sharesUnlockedX, 'sharesUnlockedX |', 'ergoInput', ergoInput, ' lpXIn', lpXIn);
		//console.log(sharesUnlockedY, 'sharesUnlockedY |', 'dexyInput', dexyInput, ' lpYIn', lpYIn);
		//console.log(sharesUnlocked, ' sharesUnlocked');

		const lpTokensOut = lpTokensIn - sharesUnlocked;

		const unsignedTx = new TransactionBuilder(height)
			.from([lpIn, lpMintIn, ...userUtxos], {
				ensureInclusion: true
			})
			.to(
				new OutputBuilder(lpXOut, lpErgoTree).addTokens([
					{ tokenId: lpNFT, amount: 1n },
					{ tokenId: lpTokenId, amount: lpTokensOut },
					{ tokenId: dexyTokenId, amount: lpYOut }
				])
			)
			.to(
				new OutputBuilder(lpMintOutValue, lpMintErgoTree).addTokens([
					{ tokenId: lpMintNFT, amount: 1n }
				])
			)
			.payFee(feeMining)
			.sendChangeTo(userChangeAddress)
			.build()
			.toEIP12Object();

		//console.dir(unsignedTx, { depth: null });
		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC);
		expect(signedTx).toBeTruthy();
	});
	it('			: Mint LP  : Input only Shares', async () => {
		//input BOXES
		const lpIn = get(dexygold_lp_box); // Mint Less in pool and Check
		const { value: lpXIn, lpTokenAmount: lpTokensIn, dexyAmount: lpYIn } = parseLpBox(lpIn);
		//const swapIn = get(dexygold_lp_swap_box);
		//const { value: swapInValue, lpSwapNFT } = parseLpSwapBox(swapIn);
		const lpMintIn = get(dexygold_lp_mint_box);
		const { value: lpMintInValue, lpMintNFT } = parseLpMintBox(lpMintIn);

		const userUtxos = [fakeUserWithDexyBox];
		//user Inputs
		const height = 1449119;
		const sharesUnlocked = 64000000n;

		//constants
		const feeMining = RECOMMENDED_MIN_FEE_VALUE;
		const userChangeAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';

		const supplyLpIn = initialLp - lpTokensIn;
		//initialLp - lpBalanceIn; Crit:100000000000 (all in)

		// CALCULATION GO GO
		let { contractErg: ergoInput, contractDexy: dexyInput } = calculateLpMintInputSharesUnlocked(
			sharesUnlocked,
			lpXIn,
			lpYIn,
			supplyLpIn
		); //RETURN 0 dexy
		//console.log('dexyInput', dexyInput);
		//console.log('sharesUnlocked', sharesUnlocked);

		const lpMintOutValue = lpMintInValue;
		const lpXOut = lpXIn + ergoInput;
		const lpYOut = lpYIn + dexyInput;

		//const sharesUnlockedX = (ergoInput * supplyLpIn) / lpXIn;
		//const sharesUnlockedY = (dexyInput * supplyLpIn) / lpYIn;
		//const sharesUnlocked = sharesUnlockedX < sharesUnlockedY ? sharesUnlockedX : sharesUnlockedY;

		//console.log(sharesUnlockedX, 'sharesUnlockedX |', 'ergoInput', ergoInput, ' lpXIn', lpXIn);
		//console.log(sharesUnlockedY, 'sharesUnlockedY |', 'dexyInput', dexyInput, ' lpYIn', lpYIn);
		//console.log(sharesUnlocked, ' sharesUnlocked');

		const lpTokensOut = lpTokensIn - sharesUnlocked;

		const unsignedTx = new TransactionBuilder(height)
			.from([lpIn, lpMintIn, ...userUtxos], {
				ensureInclusion: true
			})
			.to(
				new OutputBuilder(lpXOut, lpErgoTree).addTokens([
					{ tokenId: lpNFT, amount: 1n },
					{ tokenId: lpTokenId, amount: lpTokensOut },
					{ tokenId: dexyTokenId, amount: lpYOut }
				])
			)
			.to(
				new OutputBuilder(lpMintOutValue, lpMintErgoTree).addTokens([
					{ tokenId: lpMintNFT, amount: 1n }
				])
			)
			.payFee(feeMining)
			.sendChangeTo(userChangeAddress)
			.build()
			.toEIP12Object();

		//console.dir(unsignedTx, { depth: null });
		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC);
		expect(signedTx).toBeTruthy();
	});
	it.skip('With FEE (TODO)', () => {
		expect('TODO').toBe('done');
	});
});

// -------------------------------------------------------------------------------------
describe('LP Redeem with any input should work', async () => {
	beforeAll(() => {
		initTestBoxes();
	});

	it(': Redeem LP : Input only Shares', async () => {
		//input BOXES
		const lpIn = get(dexygold_lp_box); // Mint Less in pool and Check
		const { value: lpXIn, lpTokenAmount: lpTokensIn, dexyAmount: lpYIn } = parseLpBox(lpIn);

		const lpRedeemIn = get(dexygold_lp_redeem_box);
		const { value: lpRedeemInValue, lpRedeemNFT } = parseLpRedeemBox(lpRedeemIn);

		const goldOracle = get(oracle_erg_xau_box);

		const userUtxos = [fakeUserWithDexyBox];

		//user Inputs
		const height = 1449119;
		const sharesUnlocked = 64000000n;

		//constants
		const feeMining = RECOMMENDED_MIN_FEE_VALUE;
		const userAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';
		const userChangeAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';

		//calculations
		const supplyLpIn = initialLp - lpTokensIn;

		let { contractErg: ergoInput, contractDexy: dexyInput } = calculateLpRedeemInputSharesUnlocked(
			sharesUnlocked,
			lpXIn,
			lpYIn,
			supplyLpIn
		);

		const lpRedeemOutValue = lpRedeemInValue;

		const lpXOut = lpXIn - ergoInput;
		const lpYOut = lpYIn - dexyInput;
		const lpTokensOut = lpTokensIn + sharesUnlocked;

		const unsignedTx = new TransactionBuilder(height)
			.from([lpIn, lpRedeemIn, ...userUtxos], {
				ensureInclusion: true
			})
			.withDataFrom([goldOracle])
			.to(
				new OutputBuilder(lpXOut, lpErgoTree).addTokens([
					{ tokenId: lpNFT, amount: 1n },
					{ tokenId: lpTokenId, amount: lpTokensOut },
					{ tokenId: dexyTokenId, amount: lpYOut }
				])
			)
			.to(
				new OutputBuilder(lpRedeemOutValue, lpRedeemErgoTree).addTokens([
					{ tokenId: lpRedeemNFT, amount: 1n }
				])
			)
			.payFee(feeMining)
			.sendChangeTo(userChangeAddress)
			.build()
			.toEIP12Object();

		//console.dir(unsignedTx, { depth: null });
		//debugRedeem(unsignedTx);
		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC);
		expect(signedTx).toBeTruthy();
	});
	it('			: Redeem LP : Input only ERG', async () => {
		//input BOXES
		const lpIn = get(dexygold_lp_box); // Mint Less in pool and Check
		const { value: lpXIn, lpTokenAmount: lpTokensIn, dexyAmount: lpYIn } = parseLpBox(lpIn);

		const lpRedeemIn = get(dexygold_lp_redeem_box);
		const { value: lpRedeemInValue, lpRedeemNFT } = parseLpRedeemBox(lpRedeemIn);

		const goldOracle = get(oracle_erg_xau_box);

		const userUtxos = [fakeUserWithDexyBox];

		//user Inputs
		const height = 1449119;
		//const sharesUnlocked = 64000000n;
		const ergoInput = 1_000_000_000n;

		//constants
		const feeMining = RECOMMENDED_MIN_FEE_VALUE;
		const userAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';
		const userChangeAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';

		//calculations
		const supplyLpIn = initialLp - lpTokensIn;

		let { contractLpTokens: sharesUnlocked, contractDexy: dexyInput } = calculateLpRedeemInputErg(
			ergoInput,
			lpXIn,
			lpYIn,
			supplyLpIn
		);

		const lpRedeemOutValue = lpRedeemInValue;
		const lpXOut = lpXIn - ergoInput;
		const lpYOut = lpYIn - dexyInput;
		const lpTokensOut = lpTokensIn + sharesUnlocked;

		const unsignedTx = new TransactionBuilder(height)
			.from([lpIn, lpRedeemIn, ...userUtxos], {
				ensureInclusion: true
			})
			.withDataFrom([goldOracle])
			.to(
				new OutputBuilder(lpXOut, lpErgoTree).addTokens([
					{ tokenId: lpNFT, amount: 1n },
					{ tokenId: lpTokenId, amount: lpTokensOut },
					{ tokenId: dexyTokenId, amount: lpYOut }
				])
			)
			.to(
				new OutputBuilder(lpRedeemOutValue, lpRedeemErgoTree).addTokens([
					{ tokenId: lpRedeemNFT, amount: 1n }
				])
			)
			.payFee(feeMining)
			.sendChangeTo(userChangeAddress)
			.build()
			.toEIP12Object();

		//console.dir(unsignedTx, { depth: null });
		//debugRedeem(unsignedTx);
		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC);
		expect(signedTx).toBeTruthy();
	});
	it('			: Redeem LP : Input only Dexy', async () => {
		//input BOXES
		const lpIn = get(dexygold_lp_box); // Mint Less in pool and Check
		const { value: lpXIn, lpTokenAmount: lpTokensIn, dexyAmount: lpYIn } = parseLpBox(lpIn);

		const lpRedeemIn = get(dexygold_lp_redeem_box);
		const { value: lpRedeemInValue, lpRedeemNFT } = parseLpRedeemBox(lpRedeemIn);

		const goldOracle = get(oracle_erg_xau_box);

		const userUtxos = [fakeUserWithDexyBox];

		//user Inputs
		const height = 1449119;
		//const sharesUnlocked = 64000000n;
		//const ergoInput = 1_000_000_000n;
		const dexyInput = 10_000n; //

		//constants
		const feeMining = RECOMMENDED_MIN_FEE_VALUE;
		const userAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';
		const userChangeAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';

		//calculations
		const supplyLpIn = initialLp - lpTokensIn;

		let { contractLpTokens: sharesUnlocked, contractErg: ergoInput } = calculateLpRedeemInputDexy(
			dexyInput,
			lpXIn,
			lpYIn,
			supplyLpIn
		);

		const lpRedeemOutValue = lpRedeemInValue;
		const lpXOut = lpXIn - ergoInput;
		const lpYOut = lpYIn - dexyInput;
		const lpTokensOut = lpTokensIn + sharesUnlocked;

		const unsignedTx = new TransactionBuilder(height)
			.from([lpIn, lpRedeemIn, ...userUtxos], {
				ensureInclusion: true
			})
			.withDataFrom([goldOracle])
			.to(
				new OutputBuilder(lpXOut, lpErgoTree).addTokens([
					{ tokenId: lpNFT, amount: 1n },
					{ tokenId: lpTokenId, amount: lpTokensOut },
					{ tokenId: dexyTokenId, amount: lpYOut }
				])
			)
			.to(
				new OutputBuilder(lpRedeemOutValue, lpRedeemErgoTree).addTokens([
					{ tokenId: lpRedeemNFT, amount: 1n }
				])
			)
			.payFee(feeMining)
			.sendChangeTo(userChangeAddress)
			.build()
			.toEIP12Object();

		//console.dir(unsignedTx, { depth: null });
		//debugRedeem(unsignedTx);
		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC);
		expect(signedTx).toBeTruthy();
	});
	it.skip('With FEE (TODO)', () => {
		expect('TODO').toBe('done');
	});
});

describe('Bank Mint with any input should work', async () => {
	beforeAll(() => {
		initTestBoxes();
	});
	it('Arbitrage	: Not reset : Input Dexy', async () => {
		//input BOXES

		//const lpRedeemIn = get(dexygold_lp_redeem_box);
		//----------------- Arb Mint -------------------
		const arbMintIn = get(dexygold_bank_arbitrage_mint_box);
		const {
			value: arbMintXIn,
			arbitrageMintNFT,
			R4ResetHeight,
			R5AvailableAmount
		} = parseBankArbitrageMintBox(arbMintIn);
		//console.log(' ');
		//console.log('----------------- Arb Mint -------------------');
		//console.dir(arbMintIn, { depth: null });
		//console.log('arbMintIn', arbMintXIn, arbitrageMintNFT, R4ResetHeight, R5AvailableAmount);
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

		const dataInputs = [goldOracle, lpIn, tracking];
		const userUtxos = [fakeUserWithDexyBox];

		//user Inputs
		const height = 1449119; //1449119 + 1000
		const ergoInput = 1_000_000_000n;

		//constants
		const feeMining = RECOMMENDED_MIN_FEE_VALUE;
		const userAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';
		const userChangeAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';

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

		const dexyMinted = 3000n; // same in TEST

		const { contractErg, bankErgsAdded, buybackErgsAdded, bankRate, buybackRate } =
			calculateBankMintInputDexy(oracleRate, 1n, bankFeeNum, buybackFeeNum, feeDenom, dexyMinted);

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
			console.log('availableToMint ', availableToMint);
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

		// const isReset = height > R4ResetHeight; //  val isCounterReset = HEIGHT > selfInR4	//R4ResetHeight
		// const remainingDexyIn = R5AvailableAmount;
		// let remainingDexyOut;

		// let dexyMinted = contractDexy; //''
		// let availableToMint;
		// let resetHeightOut;

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
			.payFee(feeMining)
			.sendChangeTo(userChangeAddress)
			.build()
			.toEIP12Object();

		//console.dir(unsignedTx, { depth: null });
		debugArbmint(unsignedTx);
		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC, height);
		expect(signedTx).toBeTruthy();
	});

	it('Free		: Not reset : Input Dexy', async () => {
		//input BOXES

		//const lpRedeemIn = get(dexygold_lp_redeem_box);
		//----------------- Arb Mint -------------------
		const freeMintIn = get(dexygold_bank_free_mint_box);
		const {
			value: freeMintXIn,
			freeMintNFT,
			R4ResetHeight,
			R5AvailableAmount
		} = parseBankFreeMintBox(freeMintIn);

		//----------------- Check Bank -------------------
		const bankIn = get(dexygold_bank_box);
		const { value: bankXIn, bankNFT, dexyAmount: bankYIn } = parseBankBox(bankIn);

		//------------------- Buyback --------------------
		const buybankIn = get(dexygold_buyback_box);
		const { value: buybackXIn, buybackNFT, gortAmount } = parseBuybackBox(buybankIn);

		//------------------ Tracking --------------------
		const tracking = get(dexygold_tracking101_box);
		const { value, trackingNFT, R4Target, R5Denom, R6IsBelow, R7TriggeredHeight } =
			parseTrackingBox(tracking);

		//------------------ LP --------------------
		const lpIn = get(dexygold_lp_box);
		const { dexyAmount: lpYData, value: lpXData, lpTokenAmount } = parseLpBox(lpIn);

		//------------------ Oracle --------------------
		const goldOracle = get(oracle_erg_xau_box);
		const { oraclePoolNFT, R4Rate: oracleRateData } = parseDexyGoldOracleBox(goldOracle);

		const dataInputs = [goldOracle, lpIn]; //, tracking];
		const userUtxos = [fakeUserWithDexyBox];

		//user Inputs
		const height = 1449119 + 10; //+10 = Reseted
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

		const { contractErg, bankErgsAdded, buybackErgsAdded, bankRate, buybackRate } =
			calculateBankMintInputDexy(oracleRate, 1n, bankFeeNum, buybackFeeNum, feeDenom, dexyMinted);

		console.log(
			contractErg,
			bankErgsAdded,
			buybackErgsAdded,
			contractErg == bankErgsAdded + buybackErgsAdded,
			bankRate,
			buybackRate
		);

		const oracleRateWithFee = bankRate + buybackRate; // bigint
		//console.log(oracleRateWithFee, oracleRateWithFee - (oracleRate * 100_500n) / 100_000n);
		console.log('oracleRateWithFee', oracleRateWithFee);
		//Treshhold: (Oracle x 99% => Free Valid and Arb not Valid)
		//FreeMint (98 * oracleRate)
		//const validRateFreeMint = lpRate * 100n > oracleRate * 98n; //BigInt
		const validRateFreeMint = lpRateNum * 100 > oracleRateNum * 98; //Num
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
			resetHeightOut = height + Number(T_free + T_buffer - 1n); //<== //360 => 365
			availableToMint = maxAllowedIfResetFree;
			console.log('availableToMint ', availableToMint);
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

		// const isReset = height > R4ResetHeight; //  val isCounterReset = HEIGHT > selfInR4	//R4ResetHeight
		// const remainingDexyIn = R5AvailableAmount;
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
		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC, height);
		expect(signedTx).toBeTruthy();
	});

	it('Arbitrage	: RESET	: Input Dexy', async () => {
		//input BOXES

		//const lpRedeemIn = get(dexygold_lp_redeem_box);
		//----------------- Arb Mint -------------------
		const arbMintIn = get(dexygold_bank_arbitrage_mint_box);
		const {
			value: arbMintXIn,
			arbitrageMintNFT,
			R4ResetHeight,
			R5AvailableAmount
		} = parseBankArbitrageMintBox(arbMintIn);
		//console.log(' ');
		//console.log('----------------- Arb Mint -------------------');
		//console.dir(arbMintIn, { depth: null });
		//console.log('arbMintIn', arbMintXIn, arbitrageMintNFT, R4ResetHeight, R5AvailableAmount);
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

		const dataInputs = [goldOracle, lpIn, tracking];
		const userUtxos = [fakeUserWithDexyBox];

		//user Inputs
		const height = 1449119 + 10; //1449119 + 1000
		const ergoInput = 1_000_000_000n;

		//constants
		const feeMining = RECOMMENDED_MIN_FEE_VALUE;
		const userAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';
		const userChangeAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';

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

		const dexyMinted = 3000n; // same in TEST

		const { contractErg, bankErgsAdded, buybackErgsAdded, bankRate, buybackRate } =
			calculateBankMintInputDexy(oracleRate, 1n, bankFeeNum, buybackFeeNum, feeDenom, dexyMinted);

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
			console.log('availableToMint ', availableToMint);
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

		// const isReset = height > R4ResetHeight; //  val isCounterReset = HEIGHT > selfInR4	//R4ResetHeight
		// const remainingDexyIn = R5AvailableAmount;
		// let remainingDexyOut;

		// let dexyMinted = contractDexy; //''
		// let availableToMint;
		// let resetHeightOut;

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
			.payFee(feeMining)
			.sendChangeTo(userChangeAddress)
			.build()
			.toEIP12Object();

		//console.dir(unsignedTx, { depth: null });
		debugArbmint(unsignedTx);
		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC, height);
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
			R5AvailableAmount
		} = parseBankFreeMintBox(freeMintIn);
		//console.log(' ');
		//console.log('----------------- Arb Mint -------------------');
		//console.dir(arbMintIn, { depth: null });
		//console.log('arbMintIn', arbMintXIn, arbitrageMintNFT, R4ResetHeight, R5AvailableAmount);
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

		const dexyMinted = 3000n; // same in TEST

		const { contractErg, bankErgsAdded, buybackErgsAdded, bankRate, buybackRate } =
			calculateBankMintInputDexy(oracleRate, 1n, bankFeeNum, buybackFeeNum, feeDenom, dexyMinted);

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
			resetHeightOut = height + Number(T_free + T_buffer - 1n); //<== //360 => 365
			availableToMint = maxAllowedIfResetFree;
			console.log('availableToMint ', availableToMint);
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

		// const isReset = height > R4ResetHeight; //  val isCounterReset = HEIGHT > selfInR4	//R4ResetHeight
		// const remainingDexyIn = R5AvailableAmount;
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
		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC, height);
		expect(signedTx).toBeTruthy();
	});

	it('Arbitrage	: Not reset : Input ERG', async () => {
		//input BOXES

		//const lpRedeemIn = get(dexygold_lp_redeem_box);
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

		//------------------ Tracking --------------------
		const tracking = get(dexygold_tracking101_box);
		const { value, trackingNFT, R4Target, R5Denom, R6IsBelow, R7TriggeredHeight } =
			parseTrackingBox(tracking);

		//------------------ LP --------------------
		const lpIn = get(dexygold_lp_box);
		const { dexyAmount: lpYData, value: lpXData, lpTokenAmount } = parseLpBox(lpIn);

		//------------------ Oracle --------------------
		const goldOracle = get(oracle_erg_xau_box);
		const { oraclePoolNFT, R4Rate: oracleRateData } = parseDexyGoldOracleBox(goldOracle);

		const dataInputs = [goldOracle, lpIn, tracking];
		const userUtxos = [fakeUserWithDexyBox];

		//user Inputs
		const height = 1449119; //1449119 + 1000
		const ergoInput = 117_289_806_000n; //117289806000n

		//constants
		const feeMining = RECOMMENDED_MIN_FEE_VALUE;
		const userAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';
		const userChangeAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';

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

		//const dexyMinted = 3000n; // same in TEST
		//const dexyMinted = 3000n; // same in TEST
		const contractErg = ergoInput;

		const {
			contractDexy: dexyMinted,
			bankErgsAdded,
			buybackErgsAdded,
			bankRate,
			buybackRate
		} = calculateBankMintInputErg(oracleRate, 1n, bankFeeNum, buybackFeeNum, feeDenom, contractErg);
		//contractErg

		// const { contractErg, bankErgsAdded, buybackErgsAdded, bankRate, buybackRate } = calculateBankMintInputDexy(
		// 	oracleRate,
		// 	1n,
		// 	bankFeeNum,
		// 	buybackFeeNum,
		// 	feeDenom,
		// 	dexyMinted
		// );

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
			console.log('availableToMint ', availableToMint);
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
