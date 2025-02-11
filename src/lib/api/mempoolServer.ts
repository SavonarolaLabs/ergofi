import type { ErgoBoxCustom } from '$lib/ergopay/ergopaySwap.types';
import type { OracleData } from '$lib/stores/bank.types';
import type { MempoolSocketUpdate } from '$lib/stores/preparedInteractions';
import { jsonParseBigInt } from './ergoNode';

const URL = 'https://ergfi.xyz:4004/api';

export async function fetchUtxosByErgoTree(address: string): Promise<ErgoBoxCustom[]> {
	const response = await fetch(URL + `/utxo/byAddress/${address}`);
	const text = await response.text();
	return jsonParseBigInt(text);
}

export async function fetchOracleData(): Promise<OracleData> {
	const response = await fetch(URL + '/oracles');
	const text = await response.text();
	return jsonParseBigInt(text);
}

export async function fetchSigmaUsdBankTransactions(): Promise<MempoolSocketUpdate> {
	const response = await fetch(URL + '/transactions/sigmausd_transactions');
	const text = await response.text();
	return jsonParseBigInt(text);
}
