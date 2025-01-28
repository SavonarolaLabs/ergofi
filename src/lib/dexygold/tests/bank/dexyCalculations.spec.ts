import { directionBuy, directionSell } from '$lib/api/ergoNode';
import { vitestTokenIds, vitestErgoTrees, realMintedTestBoxes } from '$lib/dexygold/dexyConstants';
import { lpSwapInputDexy, lpSwapInputErg } from '$lib/dexygold/dexyGold';
import { signTx } from '$lib/dexygold/signing';
import { BOB_MNEMONIC } from '$lib/private/mnemonics';
import { parseLpBox, parseLpSwapBox } from '$lib/stores/dexyGoldParser';
import {
	dexygold_lp_box,
	dexygold_lp_swap_box,
	fakeUserBox,
	initTestBoxes,
	mintInitialOutputs
} from '$lib/stores/dexyGoldStore';
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
	it('Swap (sell Ergs) should work - w. simple input', async () => {
		//input BOXES
		const lpIn = get(dexygold_lp_box);
		const { value: lpXIn, lpTokenAmount: lpTokensIn, dexyAmount: abcd } = parseLpBox(lpIn);
		const lpYIn = BigInt(abcd);
		const swapIn = get(dexygold_lp_swap_box);
		const { value: swapInValue, lpSwapNFT } = parseLpSwapBox(swapIn);

		const userUtxos = [fakeUserBox];

		//user Inputs //TODO: Get inputs
		const height = 1000000;
		const ergInput = 1_000_000_000n;
		const direction = directionSell;
		//const direction = directionBuy;
		const feeMining = RECOMMENDED_MIN_FEE_VALUE;
		const userChangeAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';

		//constants:
		const feeNumLp = 997n;
		const feeDenomLp = 1000n;

		//Direct conversion
		const { amountDexy, amountErg, rate } = lpSwapInputErg(
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

		//---------------
		//Build Outputs
		//---------------
		const swapOutValue = swapInValue;
		const lpXOut = BigInt(BigInt(lpXIn) - BigInt(direction) * BigInt(amountErg));
		const lpYOut = BigInt(BigInt(lpYIn) + BigInt(direction) * BigInt(amountDexy));

		console.log(lpXIn, ' => ', lpXOut, ' delta =', lpXOut - lpXIn);
		console.log(lpYIn, ' => ', lpYOut, ' delta =', lpYOut - lpYIn);

		console.log(lpXOut);
		console.log(lpYOut);

		//const swapin2 = realMintedTestBoxes.lpSwapNFT;
		//const lpin2 = realMintedTestBoxes.lpNFT;
		//console.dir([lpIn, swapIn, ...userUtxos], { depth: null });

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
		console.dir(unsignedTx, { depth: null });
		//const signedTx = await signTx(unsignedTx, BOB_MNEMONIC);
		//expect(signedTx).toBeTruthy();
	});
	it.skip('sfs', async () => {
		const signedTx = await mintInitialOutputs();
		console.log(signedTx);
		expect(signedTx).toBeTruthy();
		//9 //13
	});
});
