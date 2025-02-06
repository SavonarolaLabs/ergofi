// swap.types.ts
import type { NodeBox } from '$lib/stores/bank.types';
import type { ErgoStateContext } from 'ergo-lib-wasm-nodejs';

export type ErgopayLinkParams = {
	swapPair: string;
	amount: number;
	ePayLinkId: string;
	lastInput: string;
	payerAddress: string;
	feeMining: number;
};

export type ErgopayPaySigmaUsdSwapParams = ErgopayLinkParams & {
	payerUtxo: NodeBox[];
	oracleBox: NodeBox;
	bankBox: NodeBox;
	height: number;
	context: ErgoStateContext;
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
