import type { Asset } from '$lib/api/ergoNode';
import { vitestTokenIds } from '$lib/dexygold/dexyConstants';
import { ErgoAddress } from '@fleet-sdk/core';
import { parse } from '@fleet-sdk/serializer';

// crystal-pool parse START

export function decodeR4(
	box: any
): { userPk: string; poolPk: string } | undefined {
	const r4 = box.additionalRegisters.R4;

	if (r4) {
		const parsed = parse<Uint8Array[]>(r4);
		return {
			userPk: ErgoAddress.fromPublicKey(parsed[0]).toString(),
			poolPk: ErgoAddress.fromPublicKey(parsed[1]).toString()
		};
	}
}

export function decodeR5(box: any): number | undefined {
	const r5 = box.additionalRegisters.R5;
	if (r5) {
		const parsed = parse<number>(r5);
		return parsed;
	}
}

export function decodeTokenIdFromR6(box: any): string | undefined {
	const r6 = box.additionalRegisters.R6;
	if (r6) {
		const parsed = Buffer.from(parse(r6)).toString('hex');
		return parsed;
	}
}

export function decodeR7(box: any): bigint | undefined {
	const r7 = box.additionalRegisters.R7;
	if (r7) {
		const parsed = parse<bigint>(r7);
		return parsed;
	}
}

export function decodeR8(box: any): string | undefined {
	const r8 = box.additionalRegisters.R8;
	if (r8) {
		const hexBuffer = Buffer.from(parse(r8)).toString('hex');
		const parsed = ErgoAddress.fromErgoTree(hexBuffer).toString();
		return parsed;
	}
}

export function decodeR9(box: any): bigint | undefined {
	const r9 = box.additionalRegisters.R9;
	if (r9) {
		const parsed = parse<bigint>(r9);
		return parsed;
	}
}

export function decodeTokenIdPairFromR6(box: any):
	| {
			sellingTokenId: string;
			buyingTokenId: string;
	  }
	| undefined {
	const r6 = box.additionalRegisters.R6;
	if (r6) {
		const parsed = parse<Uint8Array[]>(r6);
		return {
			sellingTokenId: Buffer.from(parsed[0]).toString('hex'),
			buyingTokenId: Buffer.from(parsed[1]).toString('hex')
		};
	}
}

// crystal-pool parse END


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
		R4ResetHeight: parse<number>(box.R4),
		R5AwailableAmount: parse<number>(box.R5),
	};
}

export function parseArbitrageMintBox(box: any) {
	return {
		value: box.value,
		arbitrageMintNFT: box.assets[0].tokenId,
		R4ResetHeight:parse<number>(box.R4),
		R5AwailableAmount:parse<number>(box.R5),
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