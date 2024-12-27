import { writable, type Writable } from 'svelte/store';
import { SIGUSD_BANK_TREE } from '$lib/api/ergoNode';
import {
	calculateAddressInfo,
	calculateOperationInfo,
	type OperationInfo
} from '$lib/TransactionUtils';

export const prepared_interactions: Writable<Interaction[]> = writable([]);

export function addPreparedInteraction(tx) {
	let i = txToSigmaUSDInteraction(tx);
	prepared_interactions.update((l) => [i, ...l]);
}

export function txToSigmaUSDInteraction(tx): Interaction {
	const txData: OperationInfo = calculateOperationInfo(
		calculateAddressInfo(tx, SIGUSD_BANK_TREE),
		calculateAddressInfo(tx, tx.outputs[1]?.ergoTree || tx.inputs[0]?.ergoTree)
	);

	return {
		id: crypto.randomUUID(),
		transactionId: tx.id,
		amount: Number(txData.amount.split(' ')[0]),
		timestamp: Date.now(),
		price: Number(txData.price),
		type: txData.operation,
		ergAmount: Number(txData.volume.split(' ')[0]),
		confirmed: false
	};
}

export type Interaction = {
	id: string;
	transactionId: string;
	amount: number;
	timestamp: number;
	price: number;
	type: 'Buy' | 'Sell';
	ergAmount: number;
	confirmed: boolean;
};
