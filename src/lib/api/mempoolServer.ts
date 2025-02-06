import type { ErgoBoxCustom } from '$lib/ergopay/ergopaySwap.types';
import type { OracleData } from '$lib/stores/bank.types';
import type { MempoolSocketUpdate } from '$lib/stores/preparedInteractions';

export async function fetchUtxosByErgoTree(tree: string): Promise<ErgoBoxCustom[]> {
	const response = await fetch(`https://dummyapi.io/utxosByErgoTree/${tree}`);
	return response.json();
}

export async function fetchOracleData(): Promise<OracleData> {
	const response = await fetch('https://dummyapi.io/oracles');
	return response.json();
}

export async function fetchSigmaUsdBankTransactions(): Promise<MempoolSocketUpdate> {
	const response = await fetch('https://dummyapi.io/transactions/sigmUsdBank');
	return response.json();
}
