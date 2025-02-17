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
import { isOwnTx } from '$lib/utils';
import { loadWeb3WalletTokens } from './web3wallet';

export type MempoolSocketUpdate = {
	unconfirmed_transactions: MempoolTransaction[];
	confirmed_transactions: MempoolTransaction[];
	history?: MempoolTransaction[];
};

export type Interaction = {
	id: string;
	transactionId: string;
	tx?: MempoolTransaction;
	amount: number;
	amountExact: number;
	amountCurrency: string;
	timestamp: number;
	price: number;
	type: 'Buy' | 'Sell';
	ergAmount: number;
	ergAmountInNanoErg: number;
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

export function initHistory(txList: MempoolTransaction[], ownAddressList: string[]) {
	confirmed_interactions.set(
		txList.slice(0, 3).map((x) => txToSigmaUSDInteraction(x, ownAddressList))
	);
}

export function addPreparedInteraction(tx: MempoolTransaction, ownAddressList: string[]): string {
	let i = txToSigmaUSDInteraction(tx, ownAddressList);
	i.tx = tx;
	prepared_interactions.update((l) => [i, ...l]);
	return i.id;
}

// set transactionId if exists, else create new
export function addSignedInteraction(
	signedTx: MempoolTransaction,
	uuid: string,
	ownAddressList: string[]
): string {
	const i = get(prepared_interactions).find((x) => x.id == uuid);
	if (i) {
		prepared_interactions.update((l) => {
			l.forEach((x) => {
				if (x.id == uuid) {
					x.transactionId = signedTx.id;
					x.tx = signedTx;
				}
			});
			return l;
		});
		return i.id;
	} else {
		return addPreparedInteraction(signedTx, ownAddressList);
	}
}

// set rejectted = true, after one second remove
export function cancelPreparedInteractionById(uuid: string) {
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
	}, 1000);
}

export function handleMempoolSocketUpdate(payload: MempoolSocketUpdate, ownAddressList: string[]) {
	let confirmed = confirmMempoolInteractions(payload); // this sets confirmed = true
	rejectMempoolInteractions(payload); // this sets rejected = true

	const unconfTxList = payload.unconfirmed_transactions;
	if (unconfTxList?.length > 0) {
		const removedPreparedInteractions: Interaction[] = updatePreparedInteractions(unconfTxList);
		addPreparedToMempoolInteractions(unconfTxList, removedPreparedInteractions, ownAddressList);
	}

	setTimeout(removeConfirmedAndRejectedFromMempool, 500);
	if (confirmed.length > 0) {
		setTimeout(() => addToConfirmed(confirmed), 1550);
	}
}

function confirmMempoolInteractions(payload: MempoolSocketUpdate) {
	if (payload.confirmed_transactions?.length > 0) {
		const confirmedTxIds = payload.confirmed_transactions.map((tx) => tx.id);
		const allUpdated = get(mempool_interactions).map((i) => {
			if (confirmedTxIds.includes(i.transactionId)) i.confirmed = true;
			return i;
		});
		const confirmed = get(mempool_interactions).filter((i) =>
			confirmedTxIds.includes(i.transactionId)
		);
		mempool_interactions.set(allUpdated);

		loadWeb3WalletTokens();
		return confirmed;
	}
	return [];
}

function rejectMempoolInteractions(payload: MempoolSocketUpdate) {
	const confirmedTxIds = payload.confirmed_transactions.map((tx) => tx.id);
	const unconfirmedTxIds = payload.unconfirmed_transactions.map((tx) => tx.id);
	const mempoolTxIds = get(mempool_interactions).map((tx) => tx.transactionId);
	const rejectedTxIds = mempoolTxIds.filter(
		(m) => !confirmedTxIds.includes(m) && !unconfirmedTxIds.includes(m)
	);
	if (rejectedTxIds.length > 0) {
		const allUpdated = get(mempool_interactions).map((i) => {
			if (rejectedTxIds.includes(i.transactionId)) {
				i.rejected = true;
				console.warn('SET REJECTED', { i });
			}
			return i;
		});
		mempool_interactions.set(allUpdated);
	}
}

function removeConfirmedAndRejectedFromMempool() {
	const before = get(mempool_interactions);
	const updated = before.filter((i) => !(i.confirmed || i.rejected));
	if (before.length > updated.length) {
		mempool_interactions.set(updated);
	}
}
function addToConfirmed(confirmed: Interaction[]) {
	confirmed_interactions.update((l) => [...confirmed, ...l].slice(0, 3));
}

// removes from prepared those that are in mempool, returns list of removed
function updatePreparedInteractions(unconfTxList: MempoolTransaction[]): Interaction[] {
	const txIdsInMempool = unconfTxList.map((x) => x.id);

	let preparedInteractions = get(prepared_interactions);
	const beforeUpdateCount = preparedInteractions.length;

	let ackInteractions = preparedInteractions.filter((t) =>
		txIdsInMempool.includes(t.transactionId)
	);

	let preparedInteractionsUpdated = preparedInteractions.filter(
		(t) => !txIdsInMempool.includes(t.transactionId)
	);
	const afterUpdateCount = preparedInteractionsUpdated.length;

	if (afterUpdateCount < beforeUpdateCount) {
		prepared_interactions.set(preparedInteractionsUpdated);
	}
	return ackInteractions;
}

function addPreparedToMempoolInteractions(
	unconfTxList: MempoolTransaction[],
	removedInteractions: Interaction[] = [],
	ownAddressList: string[]
) {
	const txIdsUnconfirmed = unconfTxList.map((x) => x.id);

	let mempoolInteractions = get(mempool_interactions);
	const beforeUpdateCount = mempoolInteractions.length;

	let mempoolInteractionsKnown = mempoolInteractions.filter((t) =>
		txIdsUnconfirmed.includes(t.transactionId)
	);
	let alreadyKnownTxIds = mempoolInteractionsKnown.map((x) => x.transactionId);

	let yetUnknownInteractions: Interaction[] = unconfTxList
		.filter((tx) => !alreadyKnownTxIds.includes(tx.id))
		.map(
			(tx) =>
				removedInteractions.find((rI) => rI.transactionId == tx.id) ??
				txToSigmaUSDInteraction(tx, ownAddressList)
		);
	const afterUpdateCount = mempoolInteractionsKnown.length;

	if (beforeUpdateCount == afterUpdateCount && yetUnknownInteractions.length == 0) {
		return;
	} else {
		mempool_interactions.set([...yetUnknownInteractions, ...mempoolInteractions]);
	}
}

function txToSigmaUSDInteraction(tx: MempoolTransaction, ownAddressList: string[]): Interaction {
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
	let deltaTokenExact;
	let deltaErg;
	let deltaNanoErg;
	let tokenPrice;
	let currency;

	if (txData.pair == 'USD/ERG') {
		//calculate TOKEN_SIGUSD and Value
		const outSigUsd = calculateTokenAmount(allUserOutputs, TOKEN_SIGUSD); //USD OUT
		const inSigUsd = calculateTokenAmount(allUserInputs, TOKEN_SIGUSD); //USD IN
		deltaTokenExact = Number(outSigUsd - inSigUsd);
		deltaToken = centsToUsd(deltaTokenExact);
		deltaNanoErg = Number(calculateErgoAmount(allUserOutputs) - calculateErgoAmount(allUserInputs));
		deltaErg = nanoErgToErg(deltaNanoErg);
		tokenPrice = -(deltaToken / deltaErg).toFixed(2);
		currency = 'SigUSD';
	} else {
		//calculate TOKEN_SIGRSV and Value
		const outSigRSV = calculateTokenAmount(allUserOutputs, TOKEN_SIGRSV); //RSV OUT
		const inSigRSV = calculateTokenAmount(allUserInputs, TOKEN_SIGRSV); //RSV IN
		deltaTokenExact = Number(outSigRSV - inSigRSV);
		deltaToken = deltaTokenExact;
		deltaNanoErg = Number(calculateErgoAmount(allUserOutputs) - calculateErgoAmount(allUserInputs));
		deltaErg = nanoErgToErg(deltaNanoErg);
		tokenPrice = -(deltaToken / deltaErg).toFixed(2);
		currency = 'SigRSV';
	}

	return {
		id: tx.id + crypto.randomUUID(),
		transactionId: tx.id,
		tx: tx,
		amountExact: Number(deltaToken),
		amount: Number(deltaToken),
		amountCurrency: currency,
		timestamp: tx.timestamp ? tx.timestamp : (tx.creationTimestamp ?? Date.now()),
		price: Number(tokenPrice),
		type: txData.operation,
		ergAmount: Number(deltaErg),
		ergAmountInNanoErg: deltaNanoErg,
		confirmed: false,
		rejected: false,
		own: isOwnTx(tx, ownAddressList)
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
