import {
	realMintedTestBoxes,
	vitestContractConfig,
	vitestErgoTrees,
	vitestTokenIds
} from '$lib/dexygold/dexyConstants';
import { SBool, SInt, SLong } from '@fleet-sdk/serializer';
import { writable } from 'svelte/store';
import { V } from 'vitest/dist/chunks/reporters.D7Jzd9GS.js';

export const dexygold_lp_box = writable<any>();
export const oracle_erg_xau_box = writable<any>();

export const dexygold_tracking95_box = writable<any>();
export const dexygold_tracking98_box = writable<any>();
export const dexygold_tracking101_box = writable<any>();
export const dexygold_bank_box = writable<any>();
export const dexygold_bank_free_mint_box = writable<any>();
export const dexygold_bank_arbitrage_mint_box = writable<any>();
export const dexygold_bank_intervention_box = writable<any>();
export const dexygold_bank_payout_box = writable<any>();
export const dexygold_buyback_box = writable<any>();
export const dexygold_lp_mint_box = writable<any>();
export const dexygold_lp_redeem_box = writable<any>();
export const dexygold_lp_extract_box = writable<any>();
export const dexygold_lp_swap_box = writable<any>();
// export const dexygold_lp_proxy_swap_buy_box = writable<any>();
// export const dexygold_lp_proxy_swap_sell_box = writable<any>();
// export const dexygold_ballot_box = writable<any>();
// export const dexygold_update_box = writable<any>();

const lpIn = {
	value: 1_000_000_000_000n, //1_000_000_000_000n
	assets: [
		{ tokenId: vitestTokenIds.lpNFT, amount: 1n },
		{ tokenId: vitestTokenIds.lpToken, amount: 100_000_000n }, //lpBalance //100_000_000n
		{ tokenId: vitestTokenIds.dexyUSD, amount: 100_000_000n } //100_000_000n
	]
};

export function initTestBoxes() {
	dexygold_lp_box.set(outputBoxes.lp);

	dexygold_tracking95_box.set(outputBoxes.tracking95);
	dexygold_tracking98_box.set(outputBoxes.tracking98);
	dexygold_tracking101_box.set(outputBoxes.tracking101);

	dexygold_bank_box.set(outputBoxes.bank);
	dexygold_bank_free_mint_box.set(outputBoxes.freeMint);
	dexygold_bank_arbitrage_mint_box.set(outputBoxes.arbitrageMint);
	dexygold_bank_intervention_box.set(outputBoxes.intervention);
	dexygold_bank_payout_box.set(outputBoxes.payout);

	dexygold_buyback_box.set(outputBoxes.buyback);

	dexygold_lp_mint_box.set(outputBoxes.lpMint);
	dexygold_lp_redeem_box.set(outputBoxes.lpRedeem);
	dexygold_lp_extract_box.set(outputBoxes.lpExtract);
	dexygold_lp_swap_box.set(outputBoxes.lpSwap);

	//dexygold_lp_proxy_swap_buy_box.set(outputBoxes.lpSwapBuyV1);
	//dexygold_lp_proxy_swap_sell_box.set(outputBoxes.lpSwapSellV1);
	//dexygold_ballot_box.set(outputBoxes.ballot);
	//dexygold_update_box.set(outputBoxes.update);
}

const {
	initialDexyTokens,
	feeNumLp,
	feeDenomLp,
	initialLp,
	intMax,
	epochLength,
	intZero,
	longZero
} = vitestContractConfig;

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

const {
	gort: gortInitialBox,
	gortId: gortIdInitialBox,
	oracleTokenId: oracleTokenIdInitialBox,
	oraclePoolNFT: oraclePoolNFTInitialBox,
	oracleNFT: oracleNFTInitialBox,
	gortDevEmissionNFT: gortDevEmissionNFTInitialBox,
	gortLpNFT: gortLpNFTInitialBox,
	buybackNFT: buybackNFTInitialBox,
	lpNFT: lpNFTInitialBox,
	lpSwapNFT: lpSwapNFTInitialBox,
	lpMintNFT: lpMintNFTInitialBox,
	lpRedeemNFT: lpRedeemNFTInitialBox,
	lpTokenId: lpTokenIdInitialBox,
	lpToken: lpTokenInitialBox,
	tracking95NFT: tracking95NFTInitialBox,
	tracking98NFT: tracking98NFTInitialBox,
	tracking101NFT: tracking101NFTInitialBox,
	bankNFT: bankNFTInitialBox,
	updateNFT: updateNFTInitialBox,
	ballotTokenId: ballotTokenIdInitialBox,
	interventionNFT: interventionNFTInitialBox,
	extractionNFT: extractionNFTInitialBox,
	arbitrageMintNFT: arbitrageMintNFTInitialBox,
	freeMintNFT: freeMintNFTInitialBox,
	payoutNFT: payoutNFTInitialBox,
	dexyTokenId: dexyTokenIdInitialBox,
	dexyUSD: dexyUSDInitialBox
} = realMintedTestBoxes;

export const realUserBox = {
	boxId: '807e715029f3efba60ccf3a0f998ba025de1c22463c26db53287849ae4e31d3b',
	value: 602310307,
	ergoTree: '0008cd0233e9a9935c8bbb8ae09b2c944c1d060492a8832252665e043b0732bdf593bf2c',
	assets: [],
	creationHeight: 1443463,
	additionalRegisters: {},
	transactionId: '180a362bee63b7a36aad554493df07fe9abe59dc53e1a6266f6584e49e470e3c',
	index: 0
};
// 1_000_000_000_000_000
export const fakeUserBox = {
	boxId: 'c027ccb7deafc45d68f7b41e583aa8f6ab260ca922d90fb85c330385e2cb0f20',
	value: 1000000000000000,
	ergoTree: '0008cd0233e9a9935c8bbb8ae09b2c944c1d060492a8832252665e043b0732bdf593bf2c',
	assets: [],
	creationHeight: 1443463,
	additionalRegisters: {},
	transactionId: '180a362bee63b7a36aad554493df07fe9abe59dc53e1a6266f6584e49e470e3c',
	index: 0
};

const initialUserBoxes = [
	fakeUserBox,
	gortInitialBox,
	//gortIdInitialBox,
	oracleTokenIdInitialBox,
	//oraclePoolNFTInitialBox,
	oracleNFTInitialBox,
	gortDevEmissionNFTInitialBox,
	gortLpNFTInitialBox,
	buybackNFTInitialBox,
	lpNFTInitialBox,
	lpSwapNFTInitialBox,
	lpMintNFTInitialBox,
	lpRedeemNFTInitialBox,
	lpTokenIdInitialBox,
	lpTokenInitialBox,
	tracking95NFTInitialBox,
	tracking98NFTInitialBox,
	tracking101NFTInitialBox,
	bankNFTInitialBox,
	updateNFTInitialBox,
	ballotTokenIdInitialBox,
	interventionNFTInitialBox,
	extractionNFTInitialBox,
	arbitrageMintNFTInitialBox,
	freeMintNFTInitialBox,
	payoutNFTInitialBox,
	dexyTokenIdInitialBox,
	dexyUSDInitialBox
];

const outputBoxes = {
	freeMint: {
		ergoTree: freeMintErgoTree,
		value: 1000000000,
		assets: { tokenId: freeMintNFT, amount: 1n },
		additionalRegisters: {
			R4: SInt(Number(intZero)).toHex(), //"R4": "$intZero", //Reset Height:     selfR4      || HEIGHT + T_free + T_buffer
			R5: SLong(longZero).toHex() //"R5": "$longZero" //Available Amount: R5 - minted || NewAmount
		}
	},
	arbitrageMint: {
		ergoTree: arbitrageMintErgoTree,
		value: 1000000000,
		assets: { tokenId: arbitrageMintNFT, amount: 1n },
		additionalRegisters: {
			R4: SInt(intZero).toHex(), //"R4": "$intZero", //Reset Height:     selfR4      || HEIGHT + T_free + T_buffer
			R5: SLong(longZero).toHex() //"R5": "$longZero" //Available Amount: R5 - minted || NewAmount
		}
	},
	tracking95: {
		ergoTree: trackingErgoTree,
		value: 1000000000,
		assets: { tokenId: tracking95NFT, amount: 1n },
		additionalRegisters: {
			R4: SInt(Number(95)).toHex(), // constant
			R5: SInt(100).toHex(), // constant
			R6: SBool(true).toHex(),
			R7: SInt(Number(intMax)).toHex()
		}
	},
	tracking98: {
		ergoTree: trackingErgoTree,
		value: 1000000000,
		assets: { tokenId: tracking98NFT, amount: 1n },
		additionalRegisters: {
			R4: SInt(Number(98)).toHex(), // constant
			R5: SInt(100).toHex(), // constant "
			R6: SBool(true).toHex(),
			R7: SInt(Number(intMax)).toHex()
		}
	},
	tracking101: {
		ergoTree: trackingErgoTree,
		value: 1000000000,
		assets: { tokenId: tracking101NFT, amount: 1n },
		additionalRegisters: {
			R4: SInt(Number(101)).toHex(), // constant
			R5: SInt(Number(100)).toHex(), // constant "
			R6: SBool(false).toHex(),
			R7: SInt(Number(intMax)).toHex()
		}
	},
	bank: {
		ergoTree: bankErgoTree,
		value: 1000000000,
		assets: [
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyTokenId, amount: initialDexyTokens }
		]
	},
	buyback: {
		ergoTree: buybackErgoTree,
		value: 1000000000,
		assets: [
			{ tokenId: buybackNFT, amount: 1n },
			{ tokenId: gort, amount: 1n }
		]
	},
	intervention: {
		ergoTree: interventionErgoTree,
		value: 1000000000,
		assets: { tokenId: interventionNFT, amount: 1n } //dexyTokenId
	},
	payout: {
		ergoTree: payoutErgoTree,
		value: 10000000000, //10 ERG
		assets: { tokenId: payoutNFT, amount: 1n }, //
		additionalRegisters: {
			R4: SInt(intZero).toHex() //  HEIGHT - buffer  // buffer = 5 (delayInPayments = 5040)
		}
	},
	lpSwap: {
		ergoTree: lpSwapErgoTree,
		value: 1000000000,
		assets: { tokenId: lpSwapNFT, amount: 1n } //dexyTokenId
	},
	lpMint: {
		ergoTree: lpMintErgoTree,
		value: 1000000000,
		assets: { tokenId: lpMintNFT, amount: 1n } //dexyTokenId
	},

	lpRedeem: {
		ergoTree: lpRedeemErgoTree,
		value: 1000000000,
		assets: { tokenId: lpRedeemNFT, amount: 1n } //dexyTokenId
	},
	lpExtract: {
		ergoTree: extractErgoTree,
		value: 1000000000,
		assets: [
			{ tokenId: extractionNFT, amount: 1n },
			{ tokenId: dexyTokenId, amount: 1n }
		] //dexyTokenId
	},
	lp: {
		ergoTree: lpErgoTree,
		value: 43224547253880,
		assets: [
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpTokenId, amount: initialLp }, //   "amount": ${initialLp - 6_400_000_000L}
			{ tokenId: dexyTokenId, amount: 1_000_000 }
		]
	}
};
