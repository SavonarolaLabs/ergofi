import { directionBuy, directionSell, UI_FEE_ADDRESS } from '$lib/api/ergoNode';
import {
	vitestTokenIds,
	vitestErgoTrees,
	realMintedTestBoxes,
	vitestContractConfig
} from '$lib/dexygold/dexyConstants';
import { lpSwapInputDexy, lpSwapInputErg } from '$lib/dexygold/dexyGold';
import { signTx } from '$lib/dexygold/signing';
import { BOB_MNEMONIC } from '$lib/private/mnemonics';
import { applyFee, applyFeeSell, reverseFee, reverseFeeSell } from '$lib/sigmaUSDAndDexy';
import { parseLpBox, parseLpMintBox, parseLpSwapBox } from '$lib/stores/dexyGoldParser';
import {
	dexygold_lp_box,
	dexygold_lp_mint_box,
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

const { initialDexyTokens, initialLp, feeNumLp, feeDenomLp } = vitestContractConfig;

// const dexyUSD = dexyTokenId;
// const lpToken = lpTokenId;

describe.skip('LP swap with any input should work', async () => {
	beforeAll(() => {
		initTestBoxes();
	});
	// INPUT ERG
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

	//applyFeeSell(inputERG: bigint, feeMining: bigint)
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
		const direction = directionSell;

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
		const direction = directionSell;

		//const direction = directionBuy;
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
		const { userERG: amountErg, uiSwapFee } = reverseFeeSell(contractERG, feeMining);

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
		const direction = directionBuy;

		//const direction = directionBuy;
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
	it('Initial TEST: Mint Lp (deposit Ergs and Dexy) should work', async () => {
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

	it.only('REWORK Input only Erg', async () => {
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
		const ergoInput = 500000n;

		//constants
		const feeMining = RECOMMENDED_MIN_FEE_VALUE;
		const userChangeAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';

		function calculateLpMintInputErg(
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

		function calculateLpMintInputDexy(
			contractDexy: bigint,
			lpXIn: bigint,
			lpYIn: bigint,
			supplyLpIn: bigint
		) {
			const contractLpTokens: bigint = (contractDexy * supplyLpIn) / lpYIn;
			const contractErg = (contractDexy * supplyLpIn * lpXIn) / (lpYIn * supplyLpIn);
			return { contractDexy, contractErg, contractLpTokens };
		}

		function calculateLpMintInputSharesUnlocked(
			contractLpTokens: bigint,
			lpXIn: bigint,
			lpYIn: bigint,
			supplyLpIn: bigint
		) {
			const contractDexy = (contractLpTokens * lpYIn) / supplyLpIn + 1n; // change to +1n //<==== NEED TO ROUND UP BigNumber.js?
			const contractErg = (contractLpTokens * lpXIn) / supplyLpIn + 1n; // change to +1n //<==== NEED TO ROUND UP BigNumber.js?
			return { contractDexy, contractErg, contractLpTokens };
		}

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
	it('REWORK Input only Dexy', async () => {
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
	it('REWORK Input only LP token', async () => {
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
});

// -------------------------------------------------------------------------------------
describe.skip('LP Redeem with any input should work', async () => {
	beforeAll(() => {
		initTestBoxes();
	});
	it('LP test', () => {
		expect('need to add').toBe('done');
	});
});

describe.skip('Bank FreeMint with any input should work', async () => {
	beforeAll(() => {
		initTestBoxes();
	});
	it('bank test', () => {
		expect('need to add').toBe('done');
	});
});

describe.skip('Bank ArbitrageMint with any input should work', async () => {
	beforeAll(() => {
		initTestBoxes();
	});
	it('bank test', () => {
		expect('need to add').toBe('done');
	});
});
