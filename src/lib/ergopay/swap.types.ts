// swap.types.ts
import type { UnsignedTransaction } from '@fleet-sdk/common';

export type ErgopayLinkParams = {
	swapPair: string;
	amount: number;
	ePayLinkId: string;
	: string;
	address: string;
	feeMining: number;
};

export type ErgopayPaySigmaUsdSwapParams = ErgopayLinkParams & {
	utxo: ErgoBoxCustom[];
	oracleCandidates: ErgoBoxCustom[];
	bankCandidates: ErgoBoxCustom[];
};

export type CmdError = {
	code: number;
	message: string;
};

type ReducedTransactionBase64UrlEncodedString = string;

export type ErgopayPayCmdResponse = {
	status: 'ok' | 'error';
	reducedTx?: ReducedTransactionBase64UrlEncodedString;
	error?: CmdError;
};

export type BuildSigmUsdSwapTransactionResponse = {
	status: 'ok' | 'error';
	unsignedTx?: UnsignedTransaction;
	error?: CmdError;
};

export interface Token {
	tokenId: string;
	amount: number;
}

export interface ErgoBoxCustom {
	globalIndex: number;
	inclusionHeight: number;
	address: string;
	spentTransactionId: string | null;
	boxId: string;
	value: number;
	ergoTree: string;
	assets: Token[];
	creationHeight: number;
	additionalRegisters: Record<string, string>;
	transactionId: string;
	index: number;
}
