import { DIRECTION_SELL } from '$lib/api/ergoNode';
import { vitestContractConfig, vitestErgoTrees, vitestTokenIds } from '$lib/dexygold/dexyConstants';
import {
	lpSwapInputErg,
	dexyGoldLpSwapInputErgTx,
	dexyGoldLpSwapInputDexyTx,
	dexyGoldLpSwapInputErgPrice,
	dexyGoldLpSwapInputDexyPrice
} from '$lib/dexygold/dexyGold';
import { signTx } from '$lib/dexygold/signing';
import { BOB_MNEMONIC } from '$lib/private/mnemonics';
import { applyFee } from '$lib/sigmausd/sigmaUSDAndDexy';
import { parseLpSwapBox, parseLpBox } from '$lib/stores/dexyGoldParser';
import { dexygold_lp_swap_box, dexygold_lp_box } from '$lib/stores/dexyGoldStore';
import { initJsonTestBoxes } from '$lib/stores/dexyGoldStoreJsonTestData';
import { fakeUserWithDexyBox } from '$lib/stores/dexyGoldStoreTestData';
import { RECOMMENDED_MIN_FEE_VALUE, TransactionBuilder, OutputBuilder } from '@fleet-sdk/core';
import { get } from 'svelte/store';
import { beforeAll, describe, expect, it } from 'vitest';

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
		initJsonTestBoxes();

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

	it('With FEE 	: Sell ERG : Input ERG', async () => {
		const height = 1449119;
		const direction = DIRECTION_SELL;
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
		let DIRECTION_BUY = 1n;
		const inputErg = 1_000_000_000n;

		const {
			amountErg: step1Erg,
			amountDexy: step1Dexy,
			contractErg: step1ContractErg
		} = dexyGoldLpSwapInputErgPrice(inputErg, DIRECTION_BUY, feeMining, { lpIn, lpSwapIn });

		const { amountErg: step2Erg, amountDexy: step2Dexy } = dexyGoldLpSwapInputDexyPrice(
			step1Dexy,
			DIRECTION_BUY,
			feeMining,
			{ lpIn, lpSwapIn }
		);
		expect(step2Erg).toBe(inputErg);
	});
});
