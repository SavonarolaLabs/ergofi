//Boxes: //additional info

import { mainnetTokenIds, vitestErgoTrees } from '../dexyConstants';
const {
	freeMintAddress,
	arbitrageMintAddress,
	trackingAddress,
	bankAddress,
	buybackAddress,
	interventionAddress,
	payoutAddress,
	lpSwapAddress,
	lpMintAddress,
	lpRedeemAddress,
	extractAddress,
	lpAddress
} = allAddreses; //<--- NOT ERGO TREE

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
} = mainnetTokenIds;

const {
	bankErgoTree,
	freeMintErgoTree,
	buybackErgoTree,
	oracleErgoTree, // <====???
	lpErgoTree
} = vitestErgoTrees;

const dexyTemplate = {
	basicTemplate: {
		address: '',
		value: 1000000000,
		assets: [{ tokenId: '', amount: '' }],
		additionalRegisters: {
			R4: '',
			R5: '',
			R6: '',
			R7: ''
		}
	},
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
function adjustBox(inputBox: any) {
	const outputBox = inputBox;
	return outputBox;
}

// Logic => Initial Boxes
// vs
// Output Boxes => Based on Inputs?
