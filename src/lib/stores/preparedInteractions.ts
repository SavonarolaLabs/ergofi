import { get, writable, type Writable } from 'svelte/store';
import { SIGUSD_BANK_TREE, type MempoolTransaction } from '$lib/api/ergoNode';
import {
	calculateAddressInfo,
	calculateOperationInfo,
	type OperationInfo
} from '$lib/TransactionUtils';

export const prepared_interactions: Writable<Interaction[]> = writable(
	loadPreparedInteractionsFromLocalStorage()
);
export const mempool_interactions: Writable<Interaction[]> = writable([]);

export function savePreparedInteractionsToLocalStorage() {
	const interactions = get(prepared_interactions);
	localStorage.setItem('prepared_interactions', JSON.stringify(interactions));
}

export function loadPreparedInteractionsFromLocalStorage(): Interaction[] {
	const interactions = localStorage.getItem('prepared_interactions');
	if (interactions) {
		return JSON.parse(interactions);
	} else {
		return [];
	}
}

export function addPreparedInteraction(tx) {
	let i = txToSigmaUSDInteraction(tx);
	i.own = true;
	prepared_interactions.update((l) => [i, ...l]);
}

function updateNotYetInMempoolInteractions(txList: MempoolTransaction[]) {
	const txIdsInMempool = txList.map((x) => x.id);

	let notYetInMempool = get(prepared_interactions);
	const beforeUpdateCount = notYetInMempool.length;

	let notYetInMempoolUpdated = notYetInMempool.filter(
		(t) => !txIdsInMempool.includes(t.transactionId)
	);
	const afterUpdateCount = notYetInMempoolUpdated.length;

	if (afterUpdateCount < beforeUpdateCount) {
		prepared_interactions.set(notYetInMempoolUpdated);
	}
}

function updateAssumedInMempoolInteractions(txList: MempoolTransaction[]) {
	const txIdsInMempool = txList.map((x) => x.id);

	let assumedInMempool = get(mempool_interactions);
	const beforeUpdateCount = assumedInMempool.length;

	let assumedInMempoolUpdated = assumedInMempool.filter((t) =>
		txIdsInMempool.includes(t.transactionId)
	);
	let alreadyKnownTxIds = assumedInMempoolUpdated.map((x) => x.transactionId);
	let newInteractions: Interaction[] = txList
		.filter((tx) => !alreadyKnownTxIds.includes(tx.id))
		.map(txToSigmaUSDInteraction);
	const afterUpdateCount = assumedInMempoolUpdated.length;

	if (beforeUpdateCount == afterUpdateCount && newInteractions.length == 0) {
		return;
	} else {
		mempool_interactions.set([...newInteractions, ...assumedInMempoolUpdated]);
	}
}

export function updateMempoolInteractions(txList: MempoolTransaction[]) {
	updateNotYetInMempoolInteractions(txList);
	updateAssumedInMempoolInteractions(txList);
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
	own: boolean;
};
