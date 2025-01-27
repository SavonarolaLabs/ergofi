import { asBigInt } from '$lib/utils/helper';
import { parse } from '@fleet-sdk/serializer';

export type ParsedBankArbitrageMintBox = {
	value: bigint;
	arbitrageMintNFT: string;
	R4ResetHeight: number;
	R5AwailableAmount: number;
};

export type ParsedBankBox = {
	value: bigint;
	bankNFT: string;
	dexyAmount: bigint;
};

export type ParsedBankFreeMintBox = {
	value: bigint;
	freeMintNFT: string;
	R4ResetHeight: number;
	R5AwailableAmount: number;
};

export type ParsedBankInterventionBox = {
	value: bigint;
	interventionNFT: string;
};

export type ParsedBankPayoutBox = {
	value: bigint;
	payoutNFT: string;
	R4LastPaymentHeight: number;
};

export type ParsedBuybackBox = {
	value: bigint;
	buybackNFT: string;
	gortAmount: bigint;
};

export type ParsedLpBox = {
	value: bigint;
	lpNFT: string;
	lpTokenAmount: bigint;
	dexyAmount: bigint;
};

export type ParsedLpExtractBox = {
	value: bigint;
	extractionNFT: string;
	dexyAmount: bigint;
};

export type ParsedLpMintBox = {
	value: bigint;
	lpMintNFT: string;
};

export type ParsedLpRedeemBox = {
	value: bigint;
	lpRedeemNFT: string;
};

export type ParsedLpSwapBox = {
	value: bigint;
	lpSwapNFT: string;
};

export type ParsedTrackingBox = {
	value: bigint;
	trackingNFT: string;
	R4Target: number;
	R5Denom: number;
	R6IsBelow: boolean;
	R7TriggeredHeight: number;
};

export function parseBankArbitrageMintBox(box: any): ParsedBankArbitrageMintBox {
	return {
		value: asBigInt(box.value),
		arbitrageMintNFT: box.assets[0].tokenId,
		R4ResetHeight: parse<number>(box.R4),
		R5AwailableAmount: parse<number>(box.R5)
	};
}

export function parseBankBox(box: any): ParsedBankBox {
	return {
		value: asBigInt(box.value),
		bankNFT: box.assets[0].tokenId,
		dexyAmount: box.assets[1].amount
	};
}

export function parseBankFreeMintBox(box: any): ParsedBankFreeMintBox {
	return {
		value: asBigInt(box.value),
		freeMintNFT: box.assets[0].tokenId,
		R4ResetHeight: parse<number>(box.R4),
		R5AwailableAmount: parse<number>(box.R5)
	};
}

export function parseBankInterventionBox(box: any): ParsedBankInterventionBox {
	return {
		value: asBigInt(box.value),
		interventionNFT: box.assets[0].tokenId
	};
}

export function parseBankPayoutBox(box: any): ParsedBankPayoutBox {
	return {
		value: asBigInt(box.value),
		payoutNFT: box.assets[0].tokenId,
		R4LastPaymentHeight: parse<number>(box.R4)
	};
}

export function parseBuybackBox(box: any): ParsedBuybackBox {
	return {
		value: asBigInt(box.value),
		buybackNFT: box.assets[0].tokenId,
		gortAmount: box.assets[1].amount
	};
}

export function parseLpBox(box: any): ParsedLpBox {
	return {
		value: asBigInt(box.value),
		lpNFT: box.assets[0].tokenId,
		lpTokenAmount: box.assets[1].amount,
		dexyAmount: box.assets[2].amount
	};
}

export function parseLpExtractBox(box: any): ParsedLpExtractBox {
	return {
		value: asBigInt(box.value),
		extractionNFT: box.assets[0].tokenId,
		dexyAmount: box.assets[1].amount
	};
}

export function parseLpMintBox(box: any): ParsedLpMintBox {
	return {
		value: asBigInt(box.value),
		lpMintNFT: box.assets[0].tokenId
	};
}

export function parseLpRedeemBox(box: any): ParsedLpRedeemBox {
	return {
		value: asBigInt(box.value),
		lpRedeemNFT: box.assets[0].tokenId
	};
}

export function parseLpSwapBox(box: any): ParsedLpSwapBox {
	return {
		value: asBigInt(box.value),
		lpSwapNFT: box.assets[0].tokenId
	};
}

export function parseTrackingBox(box: any): ParsedTrackingBox {
	return {
		value: asBigInt(box.value),
		trackingNFT: box.assets[0].tokenId,
		R4Target: parse<number>(box.R4),
		R5Denom: parse<number>(box.R5),
		R6IsBelow: parse<boolean>(box.R6),
		R7TriggeredHeight: parse<number>(box.R7)
	};
}
