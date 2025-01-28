import { directionBuy, directionSell, UI_FEE_ADDRESS } from '$lib/api/ergoNode';
import { vitestTokenIds, vitestErgoTrees, realMintedTestBoxes } from '$lib/dexygold/dexyConstants';
import { lpSwapInputDexy, lpSwapInputErg } from '$lib/dexygold/dexyGold';
import { signTx } from '$lib/dexygold/signing';
import { BOB_MNEMONIC } from '$lib/private/mnemonics';
import { applyFee, applyFeeSell } from '$lib/sigmaUSDAndDexy';
import { parseLpBox, parseLpSwapBox } from '$lib/stores/dexyGoldParser';
import {
	dexygold_lp_box,
	dexygold_lp_swap_box,
	fakeUserBox,
	fakeUserWithDexyBox,
	initTestBoxes,
	mintInitialOutputs
} from '$lib/stores/dexyGoldStore';
import { nanoErgToErg } from '$lib/TransactionUtils';
import { OutputBuilder, RECOMMENDED_MIN_FEE_VALUE, TransactionBuilder } from '@fleet-sdk/core';
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

// const dexyUSD = dexyTokenId;
// const lpToken = lpTokenId;

describe('asd', async () => {
	beforeAll(() => {
		initTestBoxes();
	});
	it.only('Initial Test	: Sell ERG : Input ERG', async () => {
		//input BOXES
		const lpIn = get(dexygold_lp_box);
		const { value: lpXIn, lpTokenAmount: lpTokensIn, dexyAmount: lpYIn } = parseLpBox(lpIn);
		const swapIn = get(dexygold_lp_swap_box);

		const { value: swapInValue, lpSwapNFT } = parseLpSwapBox(swapIn);

		const userUtxos = [fakeUserBox];

		//user Inputs
		const height = 1449119;
		const ergInput = 1_000_000_000n;
		const direction = directionSell;

		//const direction = directionBuy;
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

		console.log(amountDexy, ' amountDexy');
		console.log(amountErg, ' amountErg');
		console.log(rate, ' rate');

		amountDexy = amountDexy; // - 20n; //"ENSURE WE TAKE LESS"
		console.log(amountDexy, ' corrected Dexy for test');

		const swapOutValue = swapInValue;
		const lpXOut = lpXIn - direction * amountErg;
		const lpYOut = lpYIn + direction * amountDexy;

		// console.log(lpXIn, ' => ', lpXOut, ' delta =', lpXOut - lpXIn);
		// console.log(lpYIn, ' => ', lpYOut, ' delta =', lpYOut - lpYIn);

		// console.log(lpXOut);
		// console.log(lpYOut);

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
	it.only('With FEE 	: Sell ERG : Input ERG', async () => {
		//input BOXES
		const lpIn = get(dexygold_lp_box);
		const { value: lpXIn, lpTokenAmount: lpTokensIn, dexyAmount: lpYIn } = parseLpBox(lpIn);
		const swapIn = get(dexygold_lp_swap_box);

		const { value: swapInValue, lpSwapNFT } = parseLpSwapBox(swapIn);

		const userUtxos = [fakeUserBox];

		//user Inputs
		const height = 1449119;
		const inputErg = 1_000_000_000n;
		const direction = directionSell;

		//const direction = directionBuy;
		const feeMining = RECOMMENDED_MIN_FEE_VALUE;
		const userChangeAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';
		const uiFeeAddress = UI_FEE_ADDRESS;
		let uiSwapFee;

		//constants:
		const feeNumLp = 997n;
		const feeDenomLp = 1000n;

		// FEE PART:
		const { uiSwapFee: abc, contractERG: contractErg } = applyFee(inputErg, feeMining);
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
		console.log(inputErg, ' inputErg');
		console.log(amountErg, ' amountErg');
		console.log(amountDexy, ' amountDexy');
		console.log(rate, ' rate');

		amountDexy = amountDexy; // - 20n; //"ENSURE WE TAKE LESS"
		//console.log(amountDexy, ' corrected Dexy for test');

		const swapOutValue = swapInValue;
		const lpXOut = lpXIn - direction * amountErg;
		const lpYOut = lpYIn + direction * amountDexy;

		// console.log(lpXIn, ' => ', lpXOut, ' delta =', lpXOut - lpXIn);
		// console.log(lpYIn, ' => ', lpYOut, ' delta =', lpYOut - lpYIn);
		// console.log(lpXOut);
		// console.log(lpYOut);

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

	it.only('Initial Test	: Buy  ERG : Input ERG', async () => {
		//input BOXES
		const lpIn = get(dexygold_lp_box);
		const { value: lpXIn, lpTokenAmount: lpTokensIn, dexyAmount: lpYIn } = parseLpBox(lpIn);
		const swapIn = get(dexygold_lp_swap_box);

		const { value: swapInValue, lpSwapNFT } = parseLpSwapBox(swapIn);

		const userUtxos = [fakeUserWithDexyBox];

		//user Inputs
		const height = 1449119;
		const ergInput = 1_000_000_000n;
		const direction = directionBuy; //<==

		//const direction = directionBuy;
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

		console.log(amountDexy, ' amountDexy');
		console.log(amountErg, ' amountErg');
		console.log(rate, ' rate');

		amountDexy = amountDexy; //+ 20n; //"ENSURE WE TAKE LESS" //<== CHECK CALCULATIONS
		console.log(amountDexy, ' corrected Dexy for test');

		const swapOutValue = swapInValue;
		const lpXOut = lpXIn - direction * amountErg;
		const lpYOut = lpYIn + direction * amountDexy;

		// console.log(lpXIn, ' => ', lpXOut, ' delta =', lpXOut - lpXIn);
		// console.log(lpYIn, ' => ', lpYOut, ' delta =', lpYOut - lpYIn);

		// console.log(lpXOut);
		// console.log(lpYOut);

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
	it.only('With FEE 	: Buy  ERG : Input ERG', async () => {
		//input BOXES
		const lpIn = get(dexygold_lp_box);
		const { value: lpXIn, lpTokenAmount: lpTokensIn, dexyAmount: lpYIn } = parseLpBox(lpIn);
		const swapIn = get(dexygold_lp_swap_box);

		const { value: swapInValue, lpSwapNFT } = parseLpSwapBox(swapIn);

		const userUtxos = [fakeUserWithDexyBox];

		//user Inputs
		const height = 1449119;
		const inputErg = 1_000_000_000n;
		const direction = directionBuy; //<==

		const feeMining = RECOMMENDED_MIN_FEE_VALUE;
		const userChangeAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';
		const uiFeeAddress = UI_FEE_ADDRESS;
		let uiSwapFee;

		//constants:
		const feeNumLp = 997n;
		const feeDenomLp = 1000n;

		// FEE PART:
		const { uiSwapFee: abc, contractERG: contractErg } = applyFeeSell(inputErg, feeMining);
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
		console.log('BUY ERG (input ERG)');
		console.log(inputErg, ' inputErg');
		console.log(amountErg, ' amountErg');
		console.log(amountDexy, ' amountDexy');
		console.log(rate, ' rate');

		amountDexy = amountDexy; // - 20n; //"ENSURE WE TAKE LESS"
		//console.log(amountDexy, ' corrected Dexy for test');

		const swapOutValue = swapInValue;
		const lpXOut = lpXIn - direction * amountErg;
		const lpYOut = lpYIn + direction * amountDexy;

		// console.log(lpXIn, ' => ', lpXOut, ' delta =', lpXOut - lpXIn);
		// console.log(lpYIn, ' => ', lpYOut, ' delta =', lpYOut - lpYIn);
		// console.log(lpXOut);
		// console.log(lpYOut);

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

	//reverseFee(contractERG: bigint, feeMining: bigint)
	//applyFeeSell(inputERG: bigint, feeMining: bigint)
	// REWORK Input Dexy
	it.skip('TOCHANGE Initial Test	: Buy  ERG : Input Dexy', async () => {
		//input BOXES
		const lpIn = get(dexygold_lp_box);
		const { value: lpXIn, lpTokenAmount: lpTokensIn, dexyAmount: lpYIn } = parseLpBox(lpIn);
		const swapIn = get(dexygold_lp_swap_box);
		const { value: swapInValue, lpSwapNFT } = parseLpSwapBox(swapIn);

		const userUtxos = [fakeUserWithDexyBox];

		//user Inputs
		const height = 1449119;
		//const ergInput = 1_000_000_000n;
		const dexyInput = 1_000n;
		const direction = directionBuy;

		//const direction = directionBuy;
		const feeMining = RECOMMENDED_MIN_FEE_VALUE;
		const userChangeAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';

		//constants:
		const feeNumLp = 997n;
		const feeDenomLp = 1000n;

		//Reverse conversion

		// lpSwapInputDexy
		let { amountDexy, amountErg, rate } = lpSwapInputDexy(
			direction,
			dexyInput - 1n, //<== Reduce input -1n
			lpXIn,
			lpYIn,
			feeNumLp,
			feeDenomLp
		);
		console.log('----User Input---- ');
		console.log(dexyInput, ' dexy');
		console.log('----Step1---- ');
		console.log(amountErg, ' amountErg');
		console.log(amountDexy, ' amountDexy');
		console.log(rate, ' rate');

		// ADJUST VOLUME //
		if (direction == directionBuy) {
		} else {
		}

		//Direct conversion
		let {
			amountDexy: dexyStep2,
			amountErg: ergStep2,
			rate: rateStep2
		} = lpSwapInputErg(direction, amountErg, lpXIn, lpYIn, feeNumLp, feeDenomLp);

		console.log('----Step2---- ');
		console.log(ergStep2, ' ergStep2');
		console.log(dexyStep2, ' dexyStep2');

		console.log('---------------');
		console.log(rateStep2, ' rateStep2');
		// REVERSE CALCULATION //

		amountDexy = amountDexy; //- 1n; //"ENSURE WE TAKE LESS"
		amountErg = amountErg; //- 1_000_000_000n; //; //"ENSURE WE TAKE LESS"
		//console.log(amountErg, ' corrected ERG for test');

		const swapOutValue = swapInValue;
		const lpXOut = lpXIn - direction * amountErg;
		const lpYOut = lpYIn + direction * dexyStep2;

		console.log(' ERG:', lpXIn, ' => ', lpXOut, ' delta =', lpXOut - lpXIn);
		console.log('DEXY:', lpYIn, ' => ', lpYOut, ' delta =', lpYOut - lpYIn);

		// console.log(lpXOut);
		// console.log(lpYOut);

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

	it.only('TOCHANGE Initial Test	: Sell  ERG : Input Dexy', async () => {
		//input BOXES
		const lpIn = get(dexygold_lp_box);
		const { value: lpXIn, lpTokenAmount: lpTokensIn, dexyAmount: lpYIn } = parseLpBox(lpIn);
		const swapIn = get(dexygold_lp_swap_box);
		const { value: swapInValue, lpSwapNFT } = parseLpSwapBox(swapIn);

		const userUtxos = [fakeUserWithDexyBox];

		//user Inputs
		const height = 1449119;
		const dexyInput = 100_000n;
		const direction = directionBuy;

		//const direction = directionBuy;
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
		console.log('----User Input---- ');
		console.log(dexyInput, ' dexy');
		console.log('----Step1---- ');
		console.log(amountErg, ' amountErg');
		console.log(amountDexy, ' amountDexy');
		console.log(rate, ' rate');

		amountDexy = amountDexy; //- 1n; //"ENSURE WE TAKE LESS"
		amountErg = amountErg; //- 1_000_000_000n; //; //"ENSURE WE TAKE LESS"
		//console.log(amountErg, ' corrected ERG for test');

		// REWORK FROM HERE ========================
		let realDexyInput;
		// directionSell
		// Sell ERG => Buy Dexy
		let realAmountErg;

		if (direction == directionSell) {
			realDexyInput = 1000n;
			realAmountErg = (realDexyInput * lpXIn * 1000n) / (lpYIn * 997n - realDexyInput * 997n) + 1n; // cause >=?
		} else {
			realDexyInput = 1000n;
			realAmountErg = (lpXIn * realDexyInput * 997n) / (lpYIn * 1000n + realDexyInput * 997n) - 1n; // cause <=
		}

		const swapOutValue = swapInValue;
		const lpXOut = lpXIn - direction * amountErg;
		const lpYOut = lpYIn + direction * amountDexy;

		console.log(' ERG:', lpXIn, ' => ', lpXOut, ' delta =', lpXOut - lpXIn);
		console.log('DEXY:', lpYIn, ' => ', lpYOut, ' delta =', lpYOut - lpYIn);

		// ==========================================

		if (direction == directionSell) {
			const lft = lpYIn * realAmountErg * 997n;
			console.log('lft ', lft);
			const rht = realDexyInput * (lpXIn * 1000n + realAmountErg * 997n);
			console.log('rht ', rht);
			console.log('left>=right', lft >= rht);
			//lpYIn* amountErg * 997n = amountDexy * (lpXIn * 1000n + amountErg * 997n)
			//amountDexy =< lpYIn* amountErg * 997n / (lpXIn * 1000n + amountErg * 997n)	//<== TAKE FORMULA + CHECK
			//

			//
			//lpYIn* amountErg * 997n = amountDexy * (lpXIn * 1000n + amountErg * 997n)
			//lpYIn* amountErg * 997n = amountDexy * lpXIn * 1000n + amountDexy *amountErg * 997n)
			//lpYIn* amountErg * 997n -amountDexy *amountErg * 997n = amountDexy * lpXIn * 1000n
			//amountErg (lpYIn* 997n - amountDexy  * 997n ) = amountDexy * lpXIn * 1000n
			//amountErg  = amountDexy * lpXIn * 1000n / (lpYIn* 997n - amountDexy  * 997n )
		}
		//reservesYIn.toBigInt * deltaReservesX * feeNum >= -deltaReservesY * (reservesXIn.toBigInt * feeDenom + deltaReservesX * feeNum)
		else {
			const lft = lpXIn * realDexyInput * 997n;
			console.log('lft ', lft);
			const rht = realAmountErg * (lpYIn * 1000n + realDexyInput * 997n);
			console.log('rht ', rht);
			console.log('left>=right', lft >= rht);

			//reservesXIn.toBigInt * deltaReservesY * feeNum >= -deltaReservesX * (reservesYIn.toBigInt * feeDenom + deltaReservesY * feeNum)
			//lpXIn * realDexyInput * 997n >= realAmountErg * (lpYIn * 1000n + realDexyInput * 997n)
			//lpXIn * realDexyInput * 997n >= realAmountErg * (lpYIn * 1000n + realDexyInput * 997n)
			//lpXIn * realDexyInput * 997n >= realAmountErg * lpYIn * 1000n + realAmountErg * realDexyInput * 997n;
			//lpXIn * realDexyInput * 997n - realAmountErg * realDexyInput * 997n >= realAmountErg * lpYIn * 1000n;
			//realDexyInput >= realAmountErg * lpYIn * 1000n;
			//realDexyInput >= realAmountErg * lpYIn * 1000n / (lpXIn * 997n - realAmountErg * 997n)

			//lpXIn * realDexyInput * 997n >= realAmountErg * (lpYIn * 1000n + realDexyInput * 997n)
			//lpXIn * realDexyInput * 997n >= realAmountErg * (lpYIn * 1000n + realDexyInput * 997n)
			//lpXIn * realDexyInput * 997n/ (lpYIn * 1000n + realDexyInput * 997n) > = realAmountErg
		}

		//reservesXIn.toBigInt * deltaReservesY * feeNum >= -deltaReservesX * (reservesYIn.toBigInt * feeDenom + deltaReservesY * feeNum)

		// console.log(lpXOut);
		// console.log(lpYOut);

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

	it.only('TOCHANGE SELL Initial Test	: Sell  ERG : Input Dexy', async () => {
		//input BOXES
		const lpIn = get(dexygold_lp_box);
		const { value: lpXIn, lpTokenAmount: lpTokensIn, dexyAmount: lpYIn } = parseLpBox(lpIn);
		const swapIn = get(dexygold_lp_swap_box);
		const { value: swapInValue, lpSwapNFT } = parseLpSwapBox(swapIn);

		const userUtxos = [fakeUserWithDexyBox];

		//user Inputs
		const height = 1449119;
		const dexyInput = 100_000n;
		const direction = directionBuy;

		//const direction = directionBuy;
		const feeMining = RECOMMENDED_MIN_FEE_VALUE;
		const userChangeAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';

		//constants:
		const feeNumLp = 997n;
		const feeDenomLp = 1000n;

		// lpSwapInputDexy
		let { amountDexy, amountErg } = lpSwapInputDexy(
			direction,
			dexyInput,
			lpXIn,
			lpYIn,
			feeNumLp,
			feeDenomLp
		);
		// REWORK FROM HERE ========================

		const swapOutValue = swapInValue;
		const lpXOut = lpXIn - direction * amountErg;
		const lpYOut = lpYIn + direction * amountDexy;
		//console.log(' ERG:', lpXIn, ' => ', lpXOut, ' delta =', lpXOut - lpXIn);
		//console.log('DEXY:', lpYIn, ' => ', lpYOut, ' delta =', lpYOut - lpYIn);

		// ==============---Expect---===============
		let lft;
		let rht;
		if (direction == directionSell) {
			lft = lpYIn * amountErg * 997n;
			rht = dexyInput * (lpXIn * 1000n + amountErg * 997n);
		} else {
			lft = lpXIn * dexyInput * 997n;
			rht = amountErg * (lpYIn * 1000n + dexyInput * 997n);
		}
		console.log('lft ', lft);
		console.log('rht ', rht);
		console.log('left>=right', lft >= rht);
		// ==========================================

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
	//-----

	it.skip('sfs', async () => {
		const signedTx = await mintInitialOutputs();
		console.log(signedTx);
		expect(signedTx).toBeTruthy();
	});
});
