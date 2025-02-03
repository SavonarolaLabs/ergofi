// swap.types.ts
import type { UnsignedTransaction } from '@fleet-sdk/common';
import { ErgoBox } from '@fleet-sdk/core';

export type ErgopayLinkParams = {
	swapPair: string;
	amount: number;
	ePayLinkId: string;
	lastInput: string;
	address: string;
};

export type ErgopayPaySigmaUsdSwapParams = ErgopayLinkParams & {
	utxo: ErgoBox[];
	oracleCandidates: ErgoBox[];
	bankCandidates: ErgoBox[];
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
