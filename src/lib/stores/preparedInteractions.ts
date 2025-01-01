import { get, writable, type Writable } from 'svelte/store';
import {
	MINER_TREE,
	SIGUSD_BANK_TREE,
	TOKEN_SIGRSV,
	TOKEN_SIGUSD,
	type MempoolTransaction
} from '$lib/api/ergoNode';
import {
	calculateAddressInfo,
	calculateErgoAmount,
	calculateOperationInfo,
	calculateTokenAmount,
	centsToUsd,
	findPotentialFeeTrees,
	getErgoTreesByType,
	getOtherThanSpecifiedTrees,
	nanoErgToErg,
	returnInputsExcept,
	returnOutputsExcept,
	type OperationInfo
} from '$lib/TransactionUtils';

export type Interaction = {
	id: string;
	transactionId: string;
	amount: number;
	timestamp: number;
	price: number;
	type: 'Buy' | 'Sell';
	ergAmount: number;
	confirmed: boolean;
	rejected: boolean;
	own: boolean;
};

export const prepared_interactions: Writable<Interaction[]> = writable(
	loadPreparedInteractionsFromLocalStorage()
);
export const mempool_interactions: Writable<Interaction[]> = writable([]);
export const confirmed_interactions: Writable<Interaction[]> = writable(
	loadConfirmedInteractionsFromLocalStorage()
);

export function addPreparedInteraction(tx): string {
	let i = txToSigmaUSDInteraction(tx);
	i.own = true;
	console.log('new interaction');
	console.log(i);
	prepared_interactions.update((l) => [i, ...l]);
	return i.id;
}

export function addSignedInteraction(signedTx, uuid: string) {
	const i = get(prepared_interactions).find((x) => x.id == uuid);
	if (i) {
		prepared_interactions.update((l) => {
			l.forEach((x) => {
				if (x.id == uuid) {
					x.transactionId = signedTx.id;
				}
			});
			return l;
		});
		return i.id;
	} else {
		return addPreparedInteraction(signedTx);
	}
}

export function cancelPreparedInteraction(tx: MempoolTransaction) {
	const interactions = get(prepared_interactions).filter((x) => x.transactionId != tx.id);
	prepared_interactions.set(interactions);
	localStorage.setItem('prepared_interactions', JSON.stringify(interactions));
}

export function cancelPreparedInteractionById(uuid: string) {
	//TODO: first set cancel icon then remove from list

	prepared_interactions.update((l) => {
		const x = l.find((y) => y.id == uuid);
		if (x) {
			x.rejected = true;
		}
		return l;
	});
	setTimeout(() => {
		const interactions = get(prepared_interactions).filter((x) => x.id != uuid);
		prepared_interactions.set(interactions);
		localStorage.setItem('prepared_interactions', JSON.stringify(interactions));
	}, 1000);
}

function updateNotYetInMempoolInteractions(txList: MempoolTransaction[]): Interaction[] {
	const txIdsInMempool = txList.map((x) => x.id);

	let notYetInMempool = get(prepared_interactions);
	const beforeUpdateCount = notYetInMempool.length;

	let removedInteractions = notYetInMempool.filter((t) => txIdsInMempool.includes(t.transactionId));

	let notYetInMempoolUpdated = notYetInMempool.filter(
		(t) => !txIdsInMempool.includes(t.transactionId)
	);
	const afterUpdateCount = notYetInMempoolUpdated.length;

	if (afterUpdateCount < beforeUpdateCount) {
		prepared_interactions.set(notYetInMempoolUpdated);
	}
	return removedInteractions;
}

function updateAssumedInMempoolInteractions(
	txList: MempoolTransaction[],
	removedInteractions: Interaction[] = []
) {
	const txIdsInMempool = txList.map((x) => x.id);

	let assumedInMempool = get(mempool_interactions);
	const beforeUpdateCount = assumedInMempool.length;

	let assumedInMempoolUpdated = assumedInMempool.filter((t) =>
		txIdsInMempool.includes(t.transactionId)
	);
	let alreadyKnownTxIds = assumedInMempoolUpdated.map((x) => x.transactionId);
	let newInteractions: Interaction[] = txList
		.filter((tx) => !alreadyKnownTxIds.includes(tx.id))
		.map((x) => mapOrUseRemovedInteraction(x, removedInteractions));
	const afterUpdateCount = assumedInMempoolUpdated.length;

	if (beforeUpdateCount == afterUpdateCount && newInteractions.length == 0) {
		return;
	} else {
		mempool_interactions.set([...newInteractions, ...assumedInMempoolUpdated]);
	}
}

function mapOrUseRemovedInteraction(t: MempoolTransaction, removedInteractions: Interaction[]) {
	return removedInteractions.find((rI) => rI.transactionId == t.id) ?? txToSigmaUSDInteraction(t);
}

export type MempoolSocketUpdate = {
	unconfirmed_transactions: MempoolTransaction[];
	confirmed_transactions: MempoolTransaction[];
};

export function handleMempoolSocketUpdate(payload: MempoolSocketUpdate) {
	console.log('handleMempoolSocketUpdate');
	console.log('confirmed', payload.confirmed_transactions.length);
	console.log('unconfirmed', payload.unconfirmed_transactions.length);
	confirmInteractions(payload);
	updateMempoolInteractions(payload.unconfirmed_transactions);
}

function confirmInteractions(payload: MempoolSocketUpdate) {
	if (payload.confirmed_transactions?.length > 0) {
		const confirmedTxIds = payload.confirmed_transactions.map((tx) => tx.id);
		const intersect = get(mempool_interactions).filter((i) =>
			confirmedTxIds.includes(i.transactionId)
		);
		confirmed_interactions.update((l) => [...intersect, ...l]);
		//TODO: save to localstorage own confirmations
	}
}

export function updateMempoolInteractions(txList: MempoolTransaction[]) {
	if (txList?.length > 0) {
		const removedInteractions: Interaction[] = updateNotYetInMempoolInteractions(txList);
		updateAssumedInMempoolInteractions(txList, removedInteractions);
	}
}

function txToSigmaUSDInteraction(tx): Interaction {
	const bank = calculateAddressInfo(tx, SIGUSD_BANK_TREE);
	const userTree = tx.outputs[1]?.ergoTree || tx.inputs[0]?.ergoTree;
	const user = calculateAddressInfo(tx, userTree); // [RECEIPT ADDRESS DIF]
	const miner = calculateAddressInfo(tx, MINER_TREE);
	const txData: OperationInfo = calculateOperationInfo(bank, user);

	// Find Fee Box ------------------
	const { inputsErgoTrees, outputsErgoTrees } = getErgoTreesByType(tx); // [ALL INPUT / OUTPUT TREES]
	const otherInputsErgoTrees = getOtherThanSpecifiedTrees(inputsErgoTrees, []); // [ALL INPUT TREES]

	const otherOutputsErgoTrees = getOtherThanSpecifiedTrees(outputsErgoTrees, [
		SIGUSD_BANK_TREE,
		MINER_TREE,
		userTree
	]); // [FEES AND OTHER USER TREES]
	// -------------------------------

	const allUserInputs = returnInputsExcept(tx, undefined, [SIGUSD_BANK_TREE]); //[ALL Except Bank BOXes]
	const allUserAndFeeOutputs = returnOutputsExcept(tx, undefined, [SIGUSD_BANK_TREE, MINER_TREE]); //[ FEES && USER BOXes]

	const feeTrees = findPotentialFeeTrees(
		otherOutputsErgoTrees,
		inputsErgoTrees,
		allUserAndFeeOutputs,
		bank.ergoStats?.difference
	); // [ FEES ]

	const allUserOutputs = returnOutputsExcept(tx, undefined, [
		SIGUSD_BANK_TREE,
		MINER_TREE,
		...feeTrees
	]); //[ USER ]

	let deltaToken;
	let deltaErg;
	let tokenPrice;

	if (txData.pair == 'USD/ERG') {
		//calculate TOKEN_SIGUSD and Value
		const outSigUsd = calculateTokenAmount(allUserOutputs, TOKEN_SIGUSD); //USD OUT
		const inSigUsd = calculateTokenAmount(allUserInputs, TOKEN_SIGUSD); //USD IN
		deltaToken = centsToUsd(Number(outSigUsd - inSigUsd));
		deltaErg = nanoErgToErg(
			Number(calculateErgoAmount(allUserOutputs) - calculateErgoAmount(allUserInputs))
		);
		tokenPrice = -(deltaToken / deltaErg).toFixed(2);
	} else {
		//calculate TOKEN_SIGRSV and Value
		const outSigRSV = calculateTokenAmount(allUserOutputs, TOKEN_SIGRSV); //RSV OUT
		const inSigRSV = calculateTokenAmount(allUserInputs, TOKEN_SIGRSV); //RSV IN
		deltaToken = Number(outSigRSV - inSigRSV);
		deltaErg = nanoErgToErg(
			Number(calculateErgoAmount(allUserOutputs) - calculateErgoAmount(allUserInputs))
		);
		tokenPrice = -(deltaToken / deltaErg).toFixed(2);
	}

	return {
		id: crypto.randomUUID(),
		transactionId: tx.id,
		amount: Number(deltaToken),
		timestamp: tx.creationTimestamp ?? Date.now(),
		price: Number(tokenPrice),
		type: txData.operation,
		ergAmount: Number(deltaErg),
		confirmed: false,
		rejected: false
	};
}

// localStorage

export function saveConfirmedInteractionsToLocalStorage() {
	const interactions = get(confirmed_interactions);
	localStorage.setItem('confirmed_interactions', JSON.stringify(interactions));
}

export function loadConfirmedInteractionsFromLocalStorage(): Interaction[] {
	const interactions = localStorage.getItem('confirmed_interactions');
	if (interactions) {
		return JSON.parse(interactions);
	} else {
		return [];
	}
}

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
