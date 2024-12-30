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

export function addPreparedInteraction(tx):string {
	let i = txToSigmaUSDInteraction(tx);
	i.own = true;
	console.log("new interaction")
	console.log(i)
	prepared_interactions.update((l) => [i, ...l]);
	return i.id
}

export function addSignedInteraction(signedTx, uuid:string){
	const i = get(prepared_interactions).find(x => x.id == uuid);
	if(i){
		prepared_interactions.update(l => {
			l.forEach(x => {
				if(x.id == uuid){
					x.transactionId = signedTx.id
				}; 
			})
			return l;
		})
		return i.id;
	}else{
		return addPreparedInteraction(signedTx);
	}
	
}

export function cancelPreparedInteraction(tx:MempoolTransaction) {
	const interactions = get(prepared_interactions).filter(x =>x.transactionId != tx.id);
	prepared_interactions.set(interactions);
	localStorage.setItem('prepared_interactions', JSON.stringify(interactions));
}

export function cancelPreparedInteractionById(uuid:string) {
	const interactions = get(prepared_interactions).filter(x =>x.id != uuid);
	prepared_interactions.set(interactions);
	localStorage.setItem('prepared_interactions', JSON.stringify(interactions));
}

function updateNotYetInMempoolInteractions(txList: MempoolTransaction[]):Interaction[] {
	const txIdsInMempool = txList.map((x) => x.id);

	let notYetInMempool = get(prepared_interactions);
	const beforeUpdateCount = notYetInMempool.length;

	let removedInteractions = notYetInMempool.filter(
		(t) => txIdsInMempool.includes(t.transactionId)
	);

	let notYetInMempoolUpdated = notYetInMempool.filter(
		(t) => !txIdsInMempool.includes(t.transactionId)
	);
	const afterUpdateCount = notYetInMempoolUpdated.length;

	if (afterUpdateCount < beforeUpdateCount) {
		prepared_interactions.set(notYetInMempoolUpdated);
	}
	return removedInteractions;
}

function updateAssumedInMempoolInteractions(txList: MempoolTransaction[], removedInteractions: Interaction[]=[]) {
	const txIdsInMempool = txList.map((x) => x.id);

	let assumedInMempool = get(mempool_interactions);
	const beforeUpdateCount = assumedInMempool.length;

	let assumedInMempoolUpdated = assumedInMempool.filter((t) =>
		txIdsInMempool.includes(t.transactionId)
	);
	let alreadyKnownTxIds = assumedInMempoolUpdated.map((x) => x.transactionId);
	let newInteractions: Interaction[] = txList
		.filter((tx) => !alreadyKnownTxIds.includes(tx.id))
		.map(x=>mapOrUseRemovedInteraction(x, removedInteractions));
	const afterUpdateCount = assumedInMempoolUpdated.length;

	if (beforeUpdateCount == afterUpdateCount && newInteractions.length == 0) {
		return;
	} else {
		mempool_interactions.set([...newInteractions, ...assumedInMempoolUpdated]);
	}
}

function mapOrUseRemovedInteraction(t:MempoolTransaction, removedInteractions:Interaction[]){
	return removedInteractions.find(rI => rI.transactionId == t.id) ?? txToSigmaUSDInteraction(t)
}

export function updateMempoolInteractions(txList: MempoolTransaction[]) {
	const removedInteractions:Interaction[] = updateNotYetInMempoolInteractions(txList);
	updateAssumedInMempoolInteractions(txList, removedInteractions);
}

export function txToSigmaUSDInteractionOLD(tx): Interaction {
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

	console.log('feeTrees', { feeTrees });

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
