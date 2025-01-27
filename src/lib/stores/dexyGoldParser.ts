import type { Asset } from '$lib/api/ergoNode';
import { vitestTokenIds } from '$lib/dexygold/dexyConstants';

export function parseLpBox(box: any) {
	return {
		value: box.value,
		lpNFT: box.assets[0].tokenId,
		lpTokenAmount: box.assets[1].amount,
		dexyUSDAmount: box.assets[2].amount
	};
}

export function parseFreeMintBox(box: any) {
	return {
		value: box.value,
		freeMintNFT: box.assets[0].tokenId,
		R4ResetHeight:'',//	R4: SInt(Number(intZero)).toHex(), //"R4": "$intZero", //Reset Height:     selfR4      || HEIGHT + T_free + T_buffer
		R5AwailableAmount:'',//	R5: SLong(longZero).toHex() //"R5": "$longZero" //Available Amount: R5 - minted || NewAmount
	};
}

export function parseArbitrageMintBox(box: any) {
	return {
		value: box.value,
		arbitrageMintNFT: box.assets[0].tokenId,
		R4ResetHeight:'',//	R4: SInt(Number(intZero)).toHex(), //"R4": "$intZero", //Reset Height:     selfR4      || HEIGHT + T_free + T_buffer
		R5AwailableAmount:'',//	R5: SLong(longZero).toHex() //"R5": "$longZero" //Available Amount: R5 - minted || NewAmount
	};
}


freeMint: {
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