import {
	realMintedTestBoxes,
	vitestContractConfig,
	vitestErgoTrees,
	vitestTokenIds
} from '$lib/dexygold/dexyConstants';
import { signTx } from '$lib/dexygold/signing';
import { BOB_MNEMONIC } from '$lib/private/mnemonics';
import { OutputBuilder, RECOMMENDED_MIN_FEE_VALUE, TransactionBuilder } from '@fleet-sdk/core';
import { SBool, SInt, SLong } from '@fleet-sdk/serializer';
import { writable } from 'svelte/store';

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

export async function initTestBoxes() {
	const signedTx = await mintInitialOutputs();

	console.log('');
	//dexygold_lp_box.set(outputBoxes.lp);
	dexygold_lp_box.set(signedTx.outputs[13]);
	dexygold_lp_swap_box.set(signedTx.outputs[9]);
	dexygold_lp_mint_box.set(signedTx.outputs[10]);
	dexygold_lp_redeem_box.set(signedTx.outputs[11]);
	oracle_erg_xau_box.set(signedTx.outputs[14]);

	dexygold_bank_free_mint_box.set(signedTx.outputs[0]); //[0]
	dexygold_bank_arbitrage_mint_box.set(signedTx.outputs[1]); //[1]
	dexygold_tracking95_box.set(signedTx.outputs[2]); // [2]
	dexygold_tracking98_box.set(signedTx.outputs[3]); // [3]
	dexygold_tracking101_box.set(signedTx.outputs[4]); //[4]
	dexygold_bank_box.set(signedTx.outputs[5]); //[5]
	dexygold_buyback_box.set(signedTx.outputs[6]); //[6]

	//---------------------------------------

	//dexygold_tracking95_box.set(outputBoxes.tracking95); // [2]
	//dexygold_tracking98_box.set(outputBoxes.tracking98); // [3]
	//dexygold_tracking101_box.set(outputBoxes.tracking101); //[4]

	//dexygold_bank_box.set(outputBoxes.bank); //[5]
	//dexygold_bank_free_mint_box.set(outputBoxes.freeMint); //[0]
	//dexygold_bank_arbitrage_mint_box.set(outputBoxes.arbitrageMint); //[1]
	dexygold_bank_intervention_box.set(outputBoxes.intervention);
	dexygold_bank_payout_box.set(outputBoxes.payout);

	//dexygold_buyback_box.set(outputBoxes.buyback); //[6]

	//dexygold_lp_mint_box.set(outputBoxes.lpMint);
	//dexygold_lp_redeem_box.set(outputBoxes.lpRedeem);
	dexygold_lp_extract_box.set(outputBoxes.lpExtract);
	//dexygold_lp_swap_box.set(outputBoxes.lpSwap);

	//dexygold_lp_proxy_swap_buy_box.set(outputBoxes.lpSwapBuyV1);
	//dexygold_lp_proxy_swap_sell_box.set(outputBoxes.lpSwapSellV1);
	//dexygold_ballot_box.set(outputBoxes.ballot);
	//dexygold_update_box.set(outputBoxes.update);
}

export async function mintInitialOutputs() {
	const userChangeAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';
	const height = 1000;
	const inputs = initialUserBoxes.filter((x) => x);
	const outputs = Object.values(outputBoxes).map((o) => {
		const output = new OutputBuilder(o.value, o.ergoTree);
		if (o.assets) {
			output.addTokens(o.assets);
		}
		if (o.additionalRegisters) {
			output.setAdditionalRegisters(o.additionalRegisters);
		}
		return output;
	});

	const unsignedTx = new TransactionBuilder(height)
		.from(inputs, {
			ensureInclusion: true
		})
		.to(outputs)
		.payFee(RECOMMENDED_MIN_FEE_VALUE)
		.sendChangeTo(userChangeAddress)
		.build()
		.toEIP12Object();

	//add sign
	const signedTx = await signTx(unsignedTx, BOB_MNEMONIC);
	return signedTx;
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
export const fakeUserWithDexyBox = {
	boxId: '6feb5a0cc11feb5fec4695b82ad81420e63a8c6cf87b6d2d372b8e7afc090f03',
	value: '1000000000000000',
	ergoTree: '0008cd0233e9a9935c8bbb8ae09b2c944c1d060492a8832252665e043b0732bdf593bf2c',
	assets: [
		{ tokenId: 'f679b3efbcd969c3f9699013e33169966211ac409a250332ca3dcb6694a512ed', amount: 100000 }, // dexyGold
		{
			tokenId: '23b682cde32b4d0e8492caa472b526f8419f7181363534e0cbab92b3c5d452d4',
			amount: 100000000 // lp Tokens
		}
	],
	creationHeight: 1443463,
	additionalRegisters: {},
	transactionId: '180a362bee63b7a36aad554493df07fe9abe59dc53e1a6266f6584e49e470e3c',
	index: 0
};

const initialUserBoxes = [
	fakeUserWithDexyBox,
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
		assets: [{ tokenId: freeMintNFT, amount: 1n }],
		additionalRegisters: {
			R4: SInt(Number(intZero)).toHex(), //"R4": "$intZero", //Reset Height:     selfR4      || HEIGHT + T_free + T_buffer
			R5: SLong(longZero).toHex() //"R5": "$longZero" //Available Amount: R5 - minted || NewAmount
		}
	},
	arbitrageMint: {
		ergoTree: arbitrageMintErgoTree,
		value: 1000000000,
		assets: [{ tokenId: arbitrageMintNFT, amount: 1n }],
		additionalRegisters: {
			R4: SInt(1449119 + 1000).toHex(), //Reset Height:     1449119   // + = not reset / - = reset   || HEIGHT + T_free + T_buffer
			R5: SLong(10000n).toHex() //"R5": "$longZero" //Available Amount: R5 - minted || NewAmount
		}
	},
	tracking95: {
		ergoTree: trackingErgoTree,
		value: 1000000000,
		assets: [{ tokenId: tracking95NFT, amount: 1n }],
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
		assets: [{ tokenId: tracking98NFT, amount: 1n }],
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
		assets: [{ tokenId: tracking101NFT, amount: 1n }],
		additionalRegisters: {
			R4: SInt(Number(101)).toHex(), // constant
			R5: SInt(Number(100)).toHex(), // constant "
			R6: SBool(false).toHex(),
			R7: SInt(Number(0)).toHex() //SInt(Number(intMax)).toHex() oor
		}
	},
	bank: {
		ergoTree: bankErgoTree,
		value: 1000000000,
		assets: [
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyTokenId, amount: initialDexyTokens - 1_000_000n - 1n }
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
		assets: [{ tokenId: interventionNFT, amount: 1n }] //dexyTokenId
	},
	payout: {
		ergoTree: payoutErgoTree,
		value: 10000000000, //10 ERG
		assets: [{ tokenId: payoutNFT, amount: 1n }], //
		additionalRegisters: {
			R4: SInt(intZero).toHex() //  HEIGHT - buffer  // buffer = 5 (delayInPayments = 5040)
		}
	},
	lpSwap: {
		ergoTree: lpSwapErgoTree,
		value: 1000000000,
		assets: [{ tokenId: lpSwapNFT, amount: 1n }] //dexyTokenId
	},
	lpMint: {
		ergoTree: lpMintErgoTree,
		value: 1000000000,
		assets: [{ tokenId: lpMintNFT, amount: 1n }] //dexyTokenId
	},
	lpRedeem: {
		ergoTree: lpRedeemErgoTree,
		value: 1000000000,
		assets: [{ tokenId: lpRedeemNFT, amount: 1n }] //dexyTokenId
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
			{ tokenId: lpTokenId, amount: initialLp - 6_400_000_000n }, //   "amount": ${initialLp - 6_400_000_000L}
			{ tokenId: dexyTokenId, amount: 1_000_000 } //1_000_001
		]
	},
	oracle: {
		ergoTree: '0008cd0233e9a9935c8bbb8ae09b2c944c1d060492a8832252665e043b0732bdf593bf2c',
		value: 1000000000,
		assets: [{ tokenId: oraclePoolNFT, amount: 1n }],
		additionalRegisters: {
			R4: SLong((43224547n * 1_000_000n * 90n) / 100n).toHex() // 105/100 = 105% LP // 90/100 = 90% LP // Valid only Free 99%
		}
	}
};
