import { directionBuy, directionSell } from '$lib/api/ergoNode';
import {
	realMintedTestBoxes,
	vitestTokenIds,
	vitestErgoTrees,
	vitestContractConfig
} from '$lib/dexygold/dexyConstants';
import { lpSwapInputDexy, lpSwapInputErg } from '$lib/dexygold/dexyGold';
import { parseLpBox } from '$lib/stores/dexyGoldParser';
import { dexygold_lp_box } from '$lib/stores/dexyGoldStore';
import {
	OutputBuilder,
	RECOMMENDED_MIN_FEE_VALUE,
	SBool,
	SInt,
	SLong,
	TransactionBuilder
} from '@fleet-sdk/core';
import { get } from 'svelte/store';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe.skip('FreeMintSpec - Full Translation', () => {
	//let mockChain: MockChain;
	const bankFeeNum = 3n; // => 0.5% fee part
	const buybackFeeNum = 2n; // => 0.5% fee part
	//const { feeNumLp, feeDenomLp } = vitestContractConfig;
	const reservesXIn = 1_000_000_000_000n;
	const reservesYIn = 100_000_000n;
	const feeNumLp = 997n;
	const feeDenomLp = 1000n;

	it('lpSwap works sell ERG => buy Dexy', () => {
		const ergInput = 10_000_000n;
		//Direct conversion
		const { amountErg: step1Erg, amountDexy: step1Dexy } = lpSwapInputErg(
			directionSell,
			ergInput,
			reservesXIn,
			reservesYIn,
			feeNumLp,
			feeDenomLp
		);
		//Reversed conversion
		const { amountErg: step2Erg, amountDexy: step2Dexy } = lpSwapInputDexy(
			directionSell,
			step1Dexy, // &
			reservesXIn,
			reservesYIn,
			feeNumLp,
			feeDenomLp
		);

		console.log(ergInput, 'initial');
		console.log(step1Erg, ' erg ', step1Dexy, ' dexy', 'step 1');
		console.log(step2Erg, ' erg ', step2Dexy, ' dexy', 'step 2');
		expect(1).toBe(1);
	});

	it('lpSwap works buy ERG => sell Dexy', () => {
		const ergInput = 10_000_000n;
		//Direct conversion
		const { amountErg: step1Erg, amountDexy: step1Dexy } = lpSwapInputErg(
			directionBuy,
			ergInput,
			reservesXIn,
			reservesYIn,
			feeNumLp,
			feeDenomLp
		);
		//Reversed conversion
		const { amountErg: step2Erg, amountDexy: step2Dexy } = lpSwapInputDexy(
			directionBuy,
			step1Dexy, // &
			reservesXIn,
			reservesYIn,
			feeNumLp,
			feeDenomLp
		);

		console.log(ergInput, 'initial');
		console.log(step1Erg, ' erg ', step1Dexy, ' dexy', 'step 1');
		console.log(step2Erg, ' erg ', step2Dexy, ' dexy', 'step 2');
		expect(1).toBe(1);
	});
});

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

const dexyUSD = dexyTokenId;
const lpToken = lpTokenId;
// Box which Pay for Tx

function buildFirstTx() {
	const userAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';
	const height = 1_000_000;

	// const lpSwapOutput = new OutputBuilder(1_000_000_000n, swapErgoTree).addTokens({
	// 	tokenId: lpSwapNFT,
	// 	amount: 1n
	// });

	const outputs = [...];

	const unsignedTx = new TransactionBuilder(height)
		.from(initialUserBoxes)
		.to(outputs)
		.payFee(RECOMMENDED_MIN_FEE_VALUE)
		.sendChangeTo(userAddress)
		.build()
		.toEIP12Object();
	return unsignedTx;
}

describe('asd', () => {
	beforeEach(() => {
		const unsignedTx = buildFirstTx();
		console.dir(unsignedTx, { depth: null });
		expect(1).toBe(0);
	});

	it.skip('Swap (sell Ergs) should work - w. simple input', () => {
		//input BOXES

		const lpIn = get(dexygold_lp_box)
		const {
		value: reservesXIn,
		lpTokenAmount: reservesYIn,
		dexyUSDAmount: lpTokensIn
		} = parseLpBox(lpIn);

		const userUtxos = [{}, {}];
		const swapIn = {};

		//user Inputs
		const height = 1000000;
		const ergInput = 10_000_000n;
		const direction = directionSell;
		const userChangeAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';

		//constants:
		const feeNumLp = 997n;
		const feeDenomLp = 1000n;

		//---------------
		//Add Fee (v1)
		// Input => InputErg - MinerFee - UIfee = contractErg => contractDexy 
		//---------------

		// // FROM BOX
		// const reservesXIn = lpIn.value;
		// const reservesYIn = lpIn.assets[2].amount; // from box
		// const lpTokensIn = lpIn.assets[1].amount; // lp

		//Direct conversion
		const { amountDexy, amountErg, rate } = lpSwapInputErg(
			direction,
			ergInput,
			reservesXIn,
			reservesYIn,
			feeNumLp,
			feeDenomLp
		);

		//---------------
		//Build Outputs 
		//---------------
		const reservesXOut = reservesXIn - direction * amountErg;
		const reservesYOut = reservesYIn + direction * amountDexy;

		// Build Tx
		const tx = new TransactionBuilder(height)
			.from([lpIn, swapIn, ...userUtxos], {
				ensureInclusion: true
			})
			// LP box out
			.to(
				new OutputBuilder(reservesXOut, lpErgoTree).addTokens([
					{ tokenId: lpNFT, amount: 1n },
					{ tokenId: lpToken, amount: lpTokensIn },
					{ tokenId: dexyUSD, amount: reservesYOut }
				])
			)
			// Swap box out
			.to(
				new OutputBuilder(swapIn.value, swapErgoTree).addTokens([
					{ tokenId: lpSwapNFT, amount: 1n }
				])
			)
			.payFee(RECOMMENDED_MIN_FEE_VALUE)
			.sendChangeTo(userChangeAddress)
			.build();

		// Execute
		expect(executed).toBe(true);
	});
});

