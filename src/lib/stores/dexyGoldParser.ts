import { parse } from '@fleet-sdk/serializer';

export function parseTrackingBox(box: any) {
	return {
		value: box.value,
		trackingNFT: box.assets[0].tokenId,
		R4Target: parse<number>(box.R4), //SInt(Number(95)).toHex(), // constant
		R5Denom: parse<number>(box.R5), //SInt(100).toHex(), // constant
		R6IsBelow: parse<boolean>(box.R6), //SBool(true).toHex(),
		R7TriggeredHeight: parse<number>(box.R7) //SInt(Number(intMax)).toHex()
	};
}

export function parseBuybackBox(box: any) {
	return {
		value: box.value,
		buybackNFT: box.assets[0].tokenId,
		gortAmount: box.assets[1].amount
	};
}

export function parseLpBox(box: any) {
	return {
		value: box.value,
		lpNFT: box.assets[0].tokenId,
		lpTokenAmount: box.assets[1].amount,
		dexyAmount: box.assets[2].amount
	};
}

export function parseLpSwapBox(box: any) {
	return {
		value: box.value,
		lpSwapNFT: box.assets[0].tokenId
	};
}

export function parseLpMintBox(box: any) {
	return {
		value: box.value,
		lpMintNFT: box.assets[0].tokenId
	};
}

export function parseLpRedeemBox(box: any) {
	return {
		value: box.value,
		lpRedeemNFT: box.assets[0].tokenId
	};
}

export function parseLpExtractBox(box: any) {
	return {
		value: box.value,
		extractionNFT: box.assets[0].tokenId,
		dexyAmount: box.assets[1].amount
	};
}

export function parseBankBox(box: any) {
	return {
		value: box.value,
		bankNFT: box.assets[0].tokenId,
		dexyAmount: box.assets[1].amount
	};
}

export function parseBankFreeMintBox(box: any) {
	return {
		value: box.value,
		freeMintNFT: box.assets[0].tokenId,
		R4ResetHeight: parse<number>(box.R4),
		R5AwailableAmount: parse<number>(box.R5)
	};
}

export function parseBankArbitrageMintBox(box: any) {
	return {
		value: box.value,
		arbitrageMintNFT: box.assets[0].tokenId,
		R4ResetHeight: parse<number>(box.R4),
		R5AwailableAmount: parse<number>(box.R5)
	};
}

export function parseBankInterventionBox(box: any) {
	return {
		value: box.value,
		interventionNFT: box.assets[0].tokenId
	};
}

export function parseBankPayoutBox(box: any) {
	return {
		value: box.value,
		payoutNFT: box.assets[0].tokenId,
		R4LastPaymentHeight: parse<number>(box.R4) //R4: SInt(intZero).toHex() //  HEIGHT - buffer  // buffer = 5 (delayInPayments = 5040)
	};
}
