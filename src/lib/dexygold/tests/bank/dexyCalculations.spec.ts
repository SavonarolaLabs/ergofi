import { directionBuy, directionSell } from '$lib/api/ergoNode';
import { testBoxes, testTokenIds, vitestErgoTrees } from '$lib/dexygold/dexyConstants';
import { lpSwapInputDexy, lpSwapInputErg } from '$lib/dexygold/dexyGold';
import { OutputBuilder, RECOMMENDED_MIN_FEE_VALUE, TransactionBuilder } from '@fleet-sdk/core';
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
} = testBoxes;

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
	extractScriptErgoTree,
	extractUpdateErgoTree,
	swapErgoTree,
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
} = testTokenIds;

const dexyUSD = dexyTokenId;
const lpToken = lpTokenId;

const realBox = {
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
const fakeBox = {
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
	fakeBox,
	gortInitialBox,
	//gortIdInitialBox,
	oracleTokenIdInitialBox,
	//oraclePoolNFTInitialBox,
	oracleNFTInitialBox,
	gortDevEmissionNFTInitialBox,
	gortLpNFTInitialBox,
	buybackNFTInitialBox,
	lpNFTInitialBox,
	lpSwapNFTInitialBox
	//lpMintNFTInitialBox,
	//lpRedeemNFTInitialBox,
	//lpTokenIdInitialBox,
	//lpTokenInitialBox,
	//tracking95NFTInitialBox,
	//tracking98NFTInitialBox,
	//tracking101NFTInitialBox,
	//bankNFTInitialBox,
	//updateNFTInitialBox,
	//ballotTokenIdInitialBox,
	//interventionNFTInitialBox,
	//extractionNFTInitialBox,
	//arbitrageMintNFTInitialBox,
	//freeMintNFTInitialBox,
	//payoutNFTInitialBox,
	//dexyTokenIdInitialBox,
	//dexyUSDInitialBox
];
// Box which Pay for Tx

function buildFirstTx() {
	const userAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';
	const height = 1_000_000;

	const lpSwapOutput = new OutputBuilder(1_000_000_000n, swapErgoTree).addTokens({
		tokenId: lpSwapNFT,
		amount: 1n
	});
	const outputBoxes = {
		freeMint: {
			address: freeMintAddress,
			value: 1000000000,
			assets: { tokenId: freeMintNFT, amount: 1n },
			additionalRegisters: {
				R4: '', //"R4": "$intZero", //Reset Height:     selfR4      || HEIGHT + T_free + T_buffer
				R5: '' //"R5": "$longZero" //Available Amount: R5 - minted || NewAmount
			}
		},
		arbitrageMint: {
			address: arbitrageMintAddress,
			value: 1000000000,
			assets: { tokenId: arbitrageMintNFT, amount: 1n },
			additionalRegisters: {
				R4: '', //"R4": "$intZero", //Reset Height:     selfR4      || HEIGHT + T_free + T_buffer
				R5: '' //"R5": "$longZero" //Available Amount: R5 - minted || NewAmount
			}
		},
		tracking95: {
			address: trackingAddress,
			value: 1000000000,
			assets: { tokenId: tracking95NFT, amount: 1n },
			additionalRegisters: {
				R4: '', // constant
				R5: '', // constant
				R6: '',
				R7: ''
			}
		},
		tracking98: {
			address: trackingAddress,
			value: 1000000000,
			assets: { tokenId: tracking98NFT, amount: 1n },
			additionalRegisters: {
				R4: '', // constant
				R5: '', // constant "
				R6: '',
				R7: ''
			}
		},
		tracking101: {
			address: trackingAddress,
			value: 1000000000,
			assets: { tokenId: tracking101NFT, amount: 1n },
			additionalRegisters: {
				R4: '', // constant
				R5: '', // constant "
				R6: '',
				R7: ''
			}
		},
		bank: {
			address: bankAddress,
			value: 1000000000,
			assets: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyTokenId, amount: initialDexyTokens }
			]
		},
		buyback: {
			address: buybackAddress,
			value: 1000000000,
			assets: [
				{ tokenId: buybackNFT, amount: 1n },
				{ tokenId: gort, amount: 1n }
			]
		},
		intervention: {
			address: interventionAddress,
			value: 1000000000,
			assets: { tokenId: interventionNFT, amount: 1n } //dexyTokenId
		},
		payout: {
			address: payoutAddress,
			value: 10000000000, //10 ERG
			assets: { tokenId: payoutNFT, amount: 1n }, //
			additionalRegisters: {
				R4: intZero //  HEIGHT - buffer  // buffer = 5 (delayInPayments = 5040)
			}
		},
		lpSwap: {
			address: lpSwapAddress,
			value: 1000000000,
			assets: { tokenId: lpSwapNFT, amount: 1n } //dexyTokenId
		},
		lpMint: {
			address: lpMintAddress,
			value: 1000000000,
			assets: { tokenId: lpMintNFT, amount: 1n } //dexyTokenId
		},

		lpRedeem: {
			address: lpRedeemAddress,
			value: 1000000000,
			assets: { tokenId: lpRedeemNFT, amount: 1n } //dexyTokenId
		},
		lpExtract: {
			address: extractAddress,
			value: 1000000000,
			assets: [
				{ tokenId: extractionNFT, amount: 1n },
				{ tokenId: dexyTokenId, amount: 1n }
			] //dexyTokenId
		},
		lp: {
			address: lpAddress,
			value: 43224547253880,
			assets: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpTokenId, amount: initialLp }, //   "amount": ${initialLp - 6_400_000_000L}
				{ tokenId: dexyTokenId, amount: 1_000_000 }
			]
		}
	};

	const outputs = [lpSwapOutput];

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
	it('Build Initial Testing Boxes', () => {
		const unsignedTx = buildFirstTx();
		console.dir(unsignedTx, { depth: null });
		expect(1).toBe(0);
	});

	it.skip('Swap (sell Ergs) should work - w. simple input', () => {
		//input BOXES
		const userUtxos = [{}, {}];
		const swapIn = {};
		const lpIn = {
			value: 1_000_000_000_000n, //1_000_000_000_000n
			assets: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: 100_000_000n }, //lpBalance //100_000_000n
				{ tokenId: dexyUSD, amount: 100_000_000n } //100_000_000n
			]
		};

		//user Inputs
		const height = 1000000;
		const ergInput = 10_000_000n;
		const direction = directionSell;
		const userChangeAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';

		//constants:
		const feeNumLp = 997n;
		const feeDenomLp = 1000n;

		// FROM BOX
		const reservesXIn = lpIn.value;
		const reservesYIn = lpIn.assets[2].amount; // from box
		const lpTokensIn = lpIn.assets[1].amount; // lp

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
