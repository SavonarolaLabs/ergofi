import type { ErgoBoxCustom } from '$lib/ergopay/ergopaySwap.types';
import type { OracleData } from '$lib/stores/bank.types';
import type { MempoolSocketUpdate } from '$lib/stores/preparedInteractions';

const URL = 'https://ergfi.xyz:4004/api';

export async function fetchUtxosByErgoTree(address: string): Promise<ErgoBoxCustom[]> {
	const response = await fetch(URL + `/utxo/byAddress/${address}`);
	return response.json();
}

export async function fetchOracleData(): Promise<OracleData> {
	const response = await fetch(URL + '/oracles');
	return response.json();
}

export async function fetchSigmaUsdBankTransactions(): Promise<MempoolSocketUpdate> {
	const response = await fetch(URL + '/transactions/sigmausd_transactions');
	return response.json();
}
